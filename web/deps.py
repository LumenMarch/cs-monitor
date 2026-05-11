"""FastAPI 依赖注入：DB / 配置 / 认证."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import MonitorConfig
from storage.database import Database
from utils.security import EncryptionError, TokenError, decode_access_token, decrypt_secret


# 标准 Bearer 提取器：在 Swagger UI 里也会渲染成"Authorize"按钮
_bearer = HTTPBearer(auto_error=False)


# =============================================================================
# 基础注入
# =============================================================================


def get_db(request: Request) -> Database:
    """依赖注入：数据库实例."""
    return request.app.state.db


def get_config(request: Request) -> MonitorConfig:
    """依赖注入：配置实例."""
    return request.app.state.config


# =============================================================================
# 认证 / 授权
# =============================================================================


def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
) -> dict[str, Any]:
    """解析 Bearer JWT → 返回 user dict（来自 DB，去掉 password_hash 与密文 Key）.

    任何失败（缺 token / token 非法 / 用户不存在 / 用户被停用）一律 401.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(
            credentials.credentials, secret_key=config.jwt_secret_key
        )
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    raw_sub = payload.get("sub")
    try:
        user_id = int(raw_sub) if raw_sub is not None else None
    except (TypeError, ValueError):
        user_id = None
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="token 缺少有效 sub"
        )

    user = db.get_user_by_id(user_id)
    if user is None or not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不存在或已停用"
        )

    user.pop("password_hash", None)
    # 不向上层暴露密文，仅暴露布尔标记
    user["has_steamdt_key"] = bool(user.pop("steamdt_api_key_encrypted", None))
    user["jwt_payload"] = payload
    return user


def require_admin(user: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
    """仅允许 admin 访问."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限"
        )
    return user


def require_password_changed(
    user: dict[str, Any] = Depends(require_auth),
) -> dict[str, Any]:
    """拦截首次登录必须改密的用户（除 /api/auth/change-password 自身外的其他路由都应套这一层）."""
    if user.get("must_change_password"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="首次登录请先修改密码",
            headers={"X-Password-Change-Required": "1"},
        )
    return user


def get_current_user_steamdt_key(
    user: dict[str, Any] = Depends(require_auth),
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
) -> str | None:
    """解密并返回当前用户的 SteamDT API Key（无则返回 None）.

    一般业务路由不直接调用此函数；它供 bargain / extreme_track / monitor 等
    需要用用户 key 主动发起 SteamDT 调用的接口使用.
    """
    raw = db.get_user_by_id(user["id"])
    if not raw:
        return None
    token = raw.get("steamdt_api_key_encrypted")
    if not token:
        return None
    try:
        return decrypt_secret(token, config.master_encryption_key)
    except EncryptionError as exc:
        # 配置错误（master_key 不匹配）属于服务端故障
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"API Key 解密失败: {exc}",
        ) from exc


__all__ = [
    "get_config",
    "get_current_user_steamdt_key",
    "get_db",
    "require_admin",
    "require_auth",
    "require_password_changed",
]
