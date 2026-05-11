"""告警记录路由（按 user_id 隔离）."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from storage.database import Database
from web.deps import get_db, require_password_changed
from web.schemas import AlertStatsItem, AlertStatsResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def get_alerts(
    page: int = 1,
    limit: int = 20,
    alert_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    market_hash_name: str | None = None,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """分页查询当前用户的告警记录."""
    rows, total = db.get_alerts(
        user_id=user["id"],
        page=page,
        limit=limit,
        alert_type=alert_type,
        start_date=start_date,
        end_date=end_date,
        market_hash_name=market_hash_name,
    )
    return {
        "items": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/stats", response_model=AlertStatsResponse)
def get_alert_stats(
    start_date: str | None = None,
    end_date: str | None = None,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """当前用户告警统计（按天/类型聚合）."""
    by_day_raw, by_type_raw = db.get_alert_stats(
        user_id=user["id"],
        start_date=start_date,
        end_date=end_date,
    )

    by_day = [
        AlertStatsItem(
            date=str(row["date"]),
            alert_type=row["alert_type"],
            count=row["count"],
        )
        for row in by_day_raw
    ]

    by_type = [
        AlertStatsItem(
            date=str(row["date"]),
            alert_type=row["alert_type"],
            count=row["count"],
        )
        for row in by_type_raw
    ]

    total = sum(item.count for item in by_type)

    return {
        "total": total,
        "by_day": by_day,
        "by_type": by_type,
    }
