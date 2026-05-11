"""捡漏雷达路由（按 user_id 隔离）."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from config import MonitorConfig
from core.bargain_scanner import BargainScanner
from storage.database import Database
from web.deps import get_config, get_db, require_password_changed
from web.schemas import (
    BargainOpportunityListResponse,
    BargainScanConfig,
    BargainScanConfigUpdate,
    BargainScanResult,
)

router = APIRouter(prefix="/bargain", tags=["bargain"])


def _config_to_schema(raw: dict[str, Any]) -> dict[str, Any]:
    """将 DB 中的 bargain_scan_config 行转成 schema 期望的 dict（JSON list 解析）."""
    out = dict(raw)
    for key in ("buy_platforms", "sell_platforms"):
        val = out.get(key)
        if isinstance(val, str) and val:
            try:
                parsed = json.loads(val)
                out[key] = parsed if isinstance(parsed, list) else []
            except (TypeError, ValueError):
                out[key] = []
        else:
            out[key] = []
    return out


@router.get("/config", response_model=BargainScanConfig)
def get_bargain_config(
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """获取当前用户的捡漏雷达扫描配置."""
    return _config_to_schema(db.get_bargain_config(user["id"]))


@router.put("/config", response_model=BargainScanConfig)
def update_bargain_config(
    payload: BargainScanConfigUpdate,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """更新当前用户的捡漏雷达扫描配置."""
    fields: dict[str, Any] = {}
    raw = payload.model_dump(exclude_unset=True)
    for key, value in raw.items():
        if key in ("buy_platforms", "sell_platforms"):
            if value is None:
                continue
            cleaned = [str(p).strip() for p in value if str(p).strip()]
            fields[key] = json.dumps(cleaned, ensure_ascii=False) if cleaned else None
            continue
        if value is None:
            continue
        fields[key] = value

    if fields.get("max_buy_price") and fields.get("min_buy_price"):
        if fields["max_buy_price"] > 0 and fields["max_buy_price"] < fields["min_buy_price"]:
            raise HTTPException(
                status_code=400, detail="max_buy_price 必须 >= min_buy_price"
            )

    updated = db.upsert_bargain_config(user["id"], **fields)
    return _config_to_schema(updated)


@router.get("/opportunities", response_model=BargainOpportunityListResponse)
def list_opportunities(
    page: int = 1,
    limit: int = 20,
    include_dismissed: bool = False,
    buy_platform: str | None = None,
    sell_platform: str | None = None,
    min_profit_percent: float | None = None,
    market_hash_name: str | None = None,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """分页查询当前用户的机会列表."""
    rows, total = db.get_bargain_opportunities(
        user_id=user["id"],
        page=page,
        limit=limit,
        include_dismissed=include_dismissed,
        buy_platform=buy_platform,
        sell_platform=sell_platform,
        min_profit_percent=min_profit_percent,
        market_hash_name=market_hash_name,
    )
    return {
        "items": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.delete("/opportunities/{opportunity_id}")
def dismiss_opportunity(
    opportunity_id: int,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """标记一条机会为已忽略（不会从默认列表再次出现）."""
    ok = db.dismiss_bargain_opportunity(user["id"], opportunity_id)
    if not ok:
        raise HTTPException(status_code=404, detail="机会不存在或已被忽略")
    return {"message": "已忽略", "id": opportunity_id}


@router.post("/opportunities/clear")
def clear_opportunities(
    only_dismissed: bool = True,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """清空机会记录（默认只清除已忽略的）."""
    deleted = db.clear_bargain_opportunities(user["id"], only_dismissed=only_dismissed)
    return {"deleted": deleted}


@router.post("/scan", response_model=BargainScanResult)
def manual_scan(
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
    user: dict = Depends(require_password_changed),
) -> dict[str, Any]:
    """手动触发一次扫描."""
    cfg = db.get_bargain_config(user["id"])
    if not cfg.get("enabled"):
        raise HTTPException(
            status_code=400, detail="捡漏雷达未启用，请先在配置中开启"
        )
    scanner = BargainScanner(db, config, user["id"])
    results = scanner.scan()
    _, total = db.get_bargain_opportunities(user["id"], page=1, limit=1)
    return {"scanned": len(results), "total_active": total}
