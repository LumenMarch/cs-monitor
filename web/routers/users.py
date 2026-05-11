"""用户管理路由（仅管理员可用）.

提供：创建用户 / 列表 / 修改角色 / 启停 / 重置密码 / 删除.
"""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from storage.database import Database
from utils.security import hash_password
from web.deps import get_db, require_admin
from web.schemas import (
    AdminResetPasswordRequest,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)


router = APIRouter(prefix="/users", tags=["users"])


def _to_response(row: dict[str, Any]) -> UserResponse:
    """DB row → API 响应（隐藏密码哈希与密文 Key）."""

    def _parse_dt(value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value)).replace(tzinfo=UTC)
        except ValueError:
            return None

    return UserResponse(
        id=row["id"],
        username=row["username"],
        role=row["role"],
        is_active=bool(row.get("is_active", 1)),
        must_change_password=bool(row.get("must_change_password", 0)),
        has_steamdt_key=bool(row.get("steamdt_api_key_encrypted")),
        created_at=_parse_dt(row.get("created_at")),
        last_login_at=_parse_dt(row.get("last_login_at")),
    )


def _validate_role(role: str) -> None:
    if role not in {"admin", "user"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role 必须是 'admin' 或 'user'",
        )


@router.get("", response_model=list[UserResponse])
def list_all_users(
    include_inactive: bool = False,
    _admin: dict[str, Any] = Depends(require_admin),
    db: Database = Depends(get_db),
) -> list[UserResponse]:
    rows = db.list_users(include_inactive=include_inactive)
    return [_to_response(r) for r in rows]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    body: UserCreateRequest,
    admin: dict[str, Any] = Depends(require_admin),
    db: Database = Depends(get_db),
) -> UserResponse:
    _validate_role(body.role)
    try:
        new_id = db.create_user(
            username=body.username,
            password_hash=hash_password(body.password),
            role=body.role,
            must_change_password=body.must_change_password,
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="用户名已存在"
        ) from exc
    row = db.get_user_by_id(new_id)
    assert row is not None
    logger.info(
        f"管理员 {admin['username']} 创建用户 {body.username} (id={new_id}, role={body.role})"
    )
    return _to_response(row)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
    db: Database = Depends(get_db),
) -> UserResponse:
    target = db.get_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    # 角色变更
    if body.role is not None:
        _validate_role(body.role)
        # 防止把最后一个 admin 降级
        if (
            target["role"] == "admin"
            and body.role != "admin"
            and db.count_admins() <= 1
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="系统中至少需要保留一个 admin",
            )
        db.update_user_role(user_id, body.role)

    # 启停
    if body.is_active is not None:
        # 防止把最后一个激活 admin 停用
        if (
            target["role"] == "admin"
            and body.is_active is False
            and db.count_admins() <= 1
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="系统中至少需要保留一个 admin",
            )
        # 不允许 admin 把自己停用
        if user_id == admin["id"] and body.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="不能停用自己"
            )
        db.set_user_active(user_id, body.is_active)

    refreshed = db.get_user_by_id(user_id)
    assert refreshed is not None
    logger.info(
        f"管理员 {admin['username']} 更新用户 id={user_id}: "
        f"role={body.role} is_active={body.is_active}"
    )
    return _to_response(refreshed)


@router.post(
    "/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT
)
def reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    admin: dict[str, Any] = Depends(require_admin),
    db: Database = Depends(get_db),
) -> None:
    target = db.get_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    db.update_user_password(
        user_id,
        hash_password(body.new_password),
        must_change_password=body.must_change_password,
    )
    logger.info(
        f"管理员 {admin['username']} 重置了用户 id={user_id} 的密码 "
        f"(must_change={body.must_change_password})"
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: int,
    admin: dict[str, Any] = Depends(require_admin),
    db: Database = Depends(get_db),
) -> None:
    target = db.get_user_by_id(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    # 不允许删自己
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="不能删除自己"
        )
    # 不允许删最后一个 admin
    if target["role"] == "admin" and db.count_admins() <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="系统中至少需要保留一个 admin",
        )
    db.delete_user(user_id)
    logger.info(
        f"管理员 {admin['username']} 删除了用户 {target['username']} (id={user_id})"
    )
