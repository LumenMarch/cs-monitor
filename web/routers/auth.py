"""认证路由：登录、查询自己、改密、更新 SteamDT API Key."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from config import MonitorConfig
from storage.database import Database
from utils.security import (
    EncryptionError,
    create_access_token,
    encrypt_secret,
    hash_password,
    verify_password,
)
from web.deps import get_config, get_db, require_auth
from web.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    SteamdtKeyUpdateRequest,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
) -> LoginResponse:
    """用户名 + 密码登录，签发 JWT."""
    user = db.get_user_by_username(body.username)
    # 校验时不暴露具体哪一项错（防用户枚举）
    if user is None or not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误"
        )
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误"
        )

    token = create_access_token(
        subject=str(user["id"]),
        secret_key=config.jwt_secret_key,
        expire_hours=config.jwt_expire_hours,
        extra_claims={"username": user["username"], "role": user["role"]},
    )

    db.update_user_last_login(user["id"])
    logger.info(f"用户 {user['username']} (id={user['id']}) 登录成功")

    return LoginResponse(
        access_token=token,
        expires_in=config.jwt_expire_hours * 3600,
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
        requires_password_change=bool(user.get("must_change_password")),
    )


@router.get("/me", response_model=MeResponse)
def me(user: dict[str, Any] = Depends(require_auth)) -> MeResponse:
    """返回当前登录用户信息."""

    def _parse_dt(value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            # SQLite TIMESTAMP 默认是 'YYYY-MM-DD HH:MM:SS'，按 UTC 视
            return datetime.fromisoformat(str(value)).replace(tzinfo=UTC)
        except ValueError:
            return None

    return MeResponse(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        must_change_password=bool(user.get("must_change_password")),
        has_steamdt_key=bool(user.get("has_steamdt_key")),
        created_at=_parse_dt(user.get("created_at")),
        last_login_at=_parse_dt(user.get("last_login_at")),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    user: dict[str, Any] = Depends(require_auth),
    db: Database = Depends(get_db),
) -> None:
    """修改自己的密码."""
    raw = db.get_user_by_id(user["id"])
    if raw is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if not verify_password(body.current_password, raw["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="当前密码不正确"
        )
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能与旧密码相同"
        )

    db.update_user_password(user["id"], hash_password(body.new_password))
    logger.info(f"用户 {user['username']} (id={user['id']}) 修改了密码")


@router.put("/steamdt-key", status_code=status.HTTP_204_NO_CONTENT)
def update_steamdt_key(
    body: SteamdtKeyUpdateRequest,
    user: dict[str, Any] = Depends(require_auth),
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
) -> None:
    """更新当前用户的 SteamDT API Key（加密存 DB）."""
    if not config.master_encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务端未配置 MASTER_ENCRYPTION_KEY",
        )
    try:
        token = encrypt_secret(body.api_key.strip(), config.master_encryption_key)
    except EncryptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    db.set_user_steamdt_key_encrypted(user["id"], token)
    logger.info(f"用户 {user['username']} (id={user['id']}) 更新了 SteamDT API Key")


@router.delete("/steamdt-key", status_code=status.HTTP_204_NO_CONTENT)
def delete_steamdt_key(
    user: dict[str, Any] = Depends(require_auth),
    db: Database = Depends(get_db),
) -> None:
    """清除当前用户的 SteamDT API Key."""
    db.set_user_steamdt_key_encrypted(user["id"], None)
    logger.info(f"用户 {user['username']} (id={user['id']}) 清除了 SteamDT API Key")
