"""多用户认证与加密工具.

三类原语：
  - 密码哈希: bcrypt
  - 对称加密: Fernet (保护用户的 SteamDT API Key)
  - JWT: pyjwt (访问令牌)

设计原则：纯函数、显式依赖、不读全局配置——配置由调用方传入。
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken


# =============================================================================
# 密码哈希
# =============================================================================

BCRYPT_ROUNDS = 12  # 2^12 ≈ 250ms/hash on modern CPU; 安全与性能平衡点


def hash_password(plaintext: str) -> str:
    """对明文密码做 bcrypt 哈希. 返回 utf-8 字符串（含 salt + cost + hash）."""
    if not plaintext:
        raise ValueError("password must be non-empty")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(plaintext.encode("utf-8"), salt).decode("utf-8")


def verify_password(plaintext: str, hashed: str) -> bool:
    """常量时间比较：明文是否匹配存储的哈希."""
    if not plaintext or not hashed:
        return False
    try:
        return bcrypt.checkpw(plaintext.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# =============================================================================
# 对称加密 (Fernet) — 用于存 SteamDT API Key 等高敏字段
# =============================================================================


class EncryptionError(RuntimeError):
    """加密/解密失败，通常意味着 MASTER_ENCRYPTION_KEY 不正确或数据被篡改."""


def _build_fernet(master_key: str) -> Fernet:
    """从 .env 中的 master_key 构造 Fernet 实例.

    master_key 必须是 Fernet.generate_key() 产出的 base64 32 字节串.
    """
    if not master_key:
        raise EncryptionError("master_encryption_key 未配置")
    try:
        return Fernet(master_key.encode("utf-8") if isinstance(master_key, str) else master_key)
    except (ValueError, TypeError) as exc:
        raise EncryptionError(
            "MASTER_ENCRYPTION_KEY 格式无效，必须是 Fernet.generate_key() 输出的 base64 字符串"
        ) from exc


def encrypt_secret(plaintext: str, master_key: str) -> str:
    """加密一段敏感字符串，返回 utf-8 base64 token."""
    if plaintext is None:
        raise ValueError("plaintext must not be None")
    fernet = _build_fernet(master_key)
    token = fernet.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(token: str, master_key: str) -> str:
    """解密 encrypt_secret 产出的 token，返回明文.

    若 master_key 不匹配（key 被换、token 被篡改），抛 EncryptionError.
    """
    if not token:
        return ""
    fernet = _build_fernet(master_key)
    try:
        plaintext = fernet.decrypt(token.encode("utf-8"))
    except InvalidToken as exc:
        raise EncryptionError(
            "解密失败：MASTER_ENCRYPTION_KEY 与加密时不一致，或数据已损坏"
        ) from exc
    return plaintext.decode("utf-8")


# =============================================================================
# JWT 访问令牌
# =============================================================================

JWT_ALGORITHM = "HS256"


class TokenError(RuntimeError):
    """JWT 解码失败：过期、签名错、格式错."""


def create_access_token(
    subject: str,
    *,
    secret_key: str,
    expire_hours: int = 24,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """签发 JWT.

    Args:
      subject: 通常是 user_id（str），将放入 `sub` 字段
      secret_key: 配置中的 JWT_SECRET_KEY
      expire_hours: 有效期小时数
      extra_claims: 附加 claim（如 username / role）

    Returns:
      utf-8 字符串形式的 JWT
    """
    if not secret_key:
        raise TokenError("jwt_secret_key 未配置")
    if not subject:
        raise TokenError("subject 不能为空")

    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=expire_hours)).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    if extra_claims:
        for k, v in extra_claims.items():
            if k in {"sub", "iat", "exp", "jti"}:
                continue
            payload[k] = v

    return jwt.encode(payload, secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, *, secret_key: str) -> dict[str, Any]:
    """校验并解码 JWT.

    Raises:
      TokenError: 过期 / 签名错 / 格式错
    """
    if not token:
        raise TokenError("token 为空")
    if not secret_key:
        raise TokenError("jwt_secret_key 未配置")
    try:
        return jwt.decode(token, secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("token 已过期") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError(f"token 无效: {exc}") from exc


__all__ = [
    "BCRYPT_ROUNDS",
    "EncryptionError",
    "JWT_ALGORITHM",
    "TokenError",
    "create_access_token",
    "decode_access_token",
    "decrypt_secret",
    "encrypt_secret",
    "hash_password",
    "verify_password",
]
