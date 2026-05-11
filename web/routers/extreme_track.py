"""极致追踪路由（按 user_id 隔离）."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from storage.database import Database
from web.deps import get_db, require_password_changed
from web.schemas import (
    ExtremeAlertListResponse,
    ExtremeTrackConfig,
    ExtremeTrackConfigCreate,
    ExtremeTrackConfigUpdate,
)

router = APIRouter(prefix="/extreme-track", tags=["extreme-track"])


@router.get("", response_model=list[ExtremeTrackConfig])
def get_extreme_track_configs(
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """获取当前用户的全部极致追踪配置."""
    return db.get_extreme_track_configs(user["id"], enabled_only=False)


@router.post("", response_model=ExtremeTrackConfig)
def create_extreme_track_config(
    item: ExtremeTrackConfigCreate,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """添加极致追踪配置到当前用户."""
    existing = db.get_extreme_track_config(
        user["id"], item.market_hash_name, item.platform
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"'{item.market_hash_name}@{item.platform}' 的极致追踪配置已存在",
        )
    db.insert_extreme_track_config(
        user_id=user["id"],
        market_hash_name=item.market_hash_name,
        platform=item.platform,
        interval_seconds=item.interval_seconds,
        enabled=item.enabled,
        price_track_enabled=item.price_track_enabled,
        price_change_mode=item.price_change_mode,
        price_threshold_percent=item.price_threshold_percent,
        quantity_track_enabled=item.quantity_track_enabled,
        quantity_change_mode=item.quantity_change_mode,
        quantity_threshold_percent=item.quantity_threshold_percent,
        alert_cooldown_seconds=item.alert_cooldown_seconds,
        quiet_hours_start=item.quiet_hours_start,
        quiet_hours_end=item.quiet_hours_end,
    )
    result = db.get_extreme_track_config(
        user["id"], item.market_hash_name, item.platform
    )
    if not result:
        raise HTTPException(status_code=500, detail="创建失败")
    return dict(result)


@router.put("/{market_hash_name}/{platform}", response_model=ExtremeTrackConfig)
def update_extreme_track_config(
    market_hash_name: str,
    platform: str,
    item: ExtremeTrackConfigUpdate,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """更新当前用户的极致追踪配置."""
    existing = db.get_extreme_track_config(user["id"], market_hash_name, platform)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"'{market_hash_name}@{platform}' 不存在",
        )
    update_fields: dict = {}
    for field in (
        "interval_seconds",
        "enabled",
        "price_track_enabled",
        "price_change_mode",
        "price_threshold_percent",
        "quantity_track_enabled",
        "quantity_change_mode",
        "quantity_threshold_percent",
        "alert_cooldown_seconds",
        "quiet_hours_start",
        "quiet_hours_end",
    ):
        value = getattr(item, field)
        if value is not None:
            update_fields[field] = value

    db.update_extreme_track_config(
        user["id"], market_hash_name, platform, **update_fields
    )
    result = db.get_extreme_track_config(user["id"], market_hash_name, platform)
    if result is None:
        raise HTTPException(status_code=404, detail="追踪配置不存在")
    return dict(result)


@router.delete("/{market_hash_name}/{platform}")
def delete_extreme_track_config(
    market_hash_name: str,
    platform: str,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """删除当前用户的极致追踪配置."""
    deleted = db.delete_extreme_track_config(user["id"], market_hash_name, platform)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"'{market_hash_name}@{platform}' 不存在",
        )
    return {"message": f"已删除 '{market_hash_name}@{platform}'"}


@router.post("/{market_hash_name}/{platform}/toggle")
def toggle_extreme_track_config(
    market_hash_name: str,
    platform: str,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """切换当前用户的极致追踪配置启停状态."""
    existing = db.get_extreme_track_config(user["id"], market_hash_name, platform)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"'{market_hash_name}@{platform}' 不存在",
        )
    new_enabled = not bool(existing["enabled"])
    db.update_extreme_track_config(
        user["id"], market_hash_name, platform, enabled=new_enabled
    )
    return {
        "market_hash_name": market_hash_name,
        "platform": platform,
        "enabled": new_enabled,
    }


@router.get("/snapshots")
def get_latest_snapshots(
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """获取当前用户全部追踪项的最新快照."""
    with db._cursor() as cursor:  # type: ignore[attr-defined]
        cursor.execute(
            """
            SELECT market_hash_name, platform, price, quantity, recorded_at
            FROM extreme_track_snapshots
            WHERE user_id = ? AND id IN (
                SELECT MAX(id) FROM extreme_track_snapshots
                WHERE user_id = ?
                GROUP BY market_hash_name, platform
            )
            ORDER BY recorded_at DESC
            """,
            (user["id"], user["id"]),
        )
        return [dict(row) for row in cursor.fetchall()]


@router.get("/alerts", response_model=ExtremeAlertListResponse)
def get_extreme_alerts(
    page: int = 1,
    limit: int = 20,
    alert_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    market_hash_name: str | None = None,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """分页查询当前用户的极致追踪告警."""
    rows, total = db.get_extreme_alerts(
        user_id=user["id"],
        page=page,
        limit=limit,
        alert_type=alert_type,
        start_date=start_date,
        end_date=end_date,
        market_hash_name=market_hash_name,
    )
    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }
