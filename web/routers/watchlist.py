"""监控清单路由（按 user_id 隔离）."""

from __future__ import annotations

import time as _time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api.steamdt import (
    SteamDTBusinessError,
    SteamDTClient,
    SteamDTConfig,
    SteamDTError,
    SteamDTRateLimitError,
)
from config import MonitorConfig
from storage.database import Database
from web.deps import (
    get_config,
    get_current_user_steamdt_key,
    get_db,
    require_password_changed,
)
from web.schemas import (
    WatchlistItem,
    WatchlistItemCreate,
    WatchlistItemUpdate,
    WatchlistItemWithPrice,
)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# 前日收盘价缓存（全市场公共，无需按 user 隔离）：{market_hash_name: (close_price, fetch_date_str)}
_yesterday_close_cache: dict[str, tuple[float, str]] = {}


def _get_yesterday_close(
    market_hash_name: str,
    client: SteamDTClient,
) -> float | None:
    """获取饰品前一交易日的 K 线收盘价，当日有效缓存."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cached = _yesterday_close_cache.get(market_hash_name)
    if cached and cached[1] == today:
        return cached[0]

    try:
        resp = client.get_item_kline(
            market_hash_name=market_hash_name,
            kline_type=2,
            platform="ALL",
        )
    except (SteamDTError, SteamDTBusinessError, SteamDTRateLimitError):
        return None

    raw = resp.get("data") or []
    if not isinstance(raw, list) or len(raw) < 2:
        return None

    raw_sorted = sorted(
        raw, key=lambda x: x[0] if isinstance(x, list) and len(x) >= 1 else 0
    )
    yesterday = raw_sorted[-2]
    if isinstance(yesterday, list) and len(yesterday) >= 3:
        try:
            close = float(yesterday[2])
        except (TypeError, ValueError):
            return None
        _yesterday_close_cache[market_hash_name] = (close, today)
        return close
    return None


def _get_user_or_system_client(
    request: Request,
    config: MonitorConfig,
    user_api_key: str | None,
) -> SteamDTClient:
    """优先用用户自己的 SteamDT Key 创建客户端；否则回退到系统级 client（如有）.

    用户级 client 不缓存到 app.state（每个请求新建后调用即关），避免跨用户串扰.
    """
    if user_api_key:
        return SteamDTClient(
            SteamDTConfig(
                api_key=user_api_key,
                base_url=config.api_base_url,
                timeout=config.request_timeout,
                max_retries=config.request_retry,
            )
        )
    client = getattr(request.app.state, "steamdt_client", None)
    if client is None:
        raise HTTPException(
            status_code=400,
            detail="未配置 SteamDT API Key——请在用户中心填写个人 Key，"
            "或由管理员在 .env 中设置 STEAMDT_API_KEY",
        )
    return client


@router.get("", response_model=list[WatchlistItemWithPrice])
def get_watchlist(
    request: Request,
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
    user: dict = Depends(require_password_changed),
    user_api_key: str | None = Depends(get_current_user_steamdt_key),
) -> list[dict]:
    """获取当前用户的全部监控清单（含最新价格和前日收盘价）."""
    items = db.get_watchlist_with_latest_price(user["id"], enabled_only=False)

    # 仅当用户有 Key 或系统有 Key 时才尝试拉 K 线，否则跳过（不阻断列表展示）
    if user_api_key or getattr(request.app.state, "steamdt_client", None):
        try:
            client = _get_user_or_system_client(request, config, user_api_key)
            for item in items:
                name = item.get("market_hash_name")
                if name:
                    item["yesterday_close"] = _get_yesterday_close(name, client)
        except HTTPException:
            pass

    return items


@router.post("", response_model=WatchlistItem)
def create_watchlist_item(
    item: WatchlistItemCreate,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """添加监控清单项到当前用户."""
    existing = db.get_watchlist_item(user["id"], item.market_hash_name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"饰品 '{item.market_hash_name}' 已在监控清单中",
        )
    db.insert_watchlist_item(
        user_id=user["id"],
        market_hash_name=item.market_hash_name,
        display_name=item.display_name,
        threshold_percent=item.threshold_percent,
        enabled=item.enabled,
    )
    result = db.get_watchlist_item(user["id"], item.market_hash_name)
    if not result:
        raise HTTPException(status_code=500, detail="创建失败")
    return dict(result)


@router.put("/{market_hash_name}", response_model=WatchlistItem)
def update_watchlist_item(
    market_hash_name: str,
    item: WatchlistItemUpdate,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """更新当前用户的监控清单项."""
    existing = db.get_watchlist_item(user["id"], market_hash_name)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"饰品 '{market_hash_name}' 不存在",
        )
    updated = db.update_watchlist_item(
        user_id=user["id"],
        market_hash_name=market_hash_name,
        display_name=item.display_name,
        threshold_percent=item.threshold_percent,
        enabled=item.enabled,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="饰品不存在")
    result = db.get_watchlist_item(user["id"], market_hash_name)
    if result is None:
        raise HTTPException(status_code=404, detail="饰品不存在")
    return dict(result)


@router.delete("/{market_hash_name}")
def delete_watchlist_item(
    market_hash_name: str,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> dict:
    """删除当前用户的监控清单项."""
    deleted = db.delete_watchlist_item(user["id"], market_hash_name)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"饰品 '{market_hash_name}' 不存在",
        )
    return {"message": f"已删除 '{market_hash_name}'"}


# ─── /refresh 端点 ─────────────────────────────────────


class RefreshRequest(BaseModel):
    market_hash_names: Optional[list[str]] = Field(
        default=None,
        description="为空或不传则刷新所有 enabled 物品，最多 100 个",
    )


class RefreshItemResult(BaseModel):
    market_hash_name: str
    ok: bool
    latest_price: Optional[float] = None
    platform_count: int = 0
    error: Optional[str] = None


class RefreshResponse(BaseModel):
    total: int
    success: int
    failed: int
    duration_ms: int
    items: list[RefreshItemResult]


@router.post("/refresh", response_model=RefreshResponse)
def refresh_watchlist_prices(
    payload: RefreshRequest,
    request: Request,
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
    user: dict = Depends(require_password_changed),
    user_api_key: str | None = Depends(get_current_user_steamdt_key),
) -> RefreshResponse:
    """立即刷新指定物品（或全部）的价格.

    使用 SteamDT batch 端点（1 次/分钟限制），单次最多 100 个.
    优先使用当前用户的 SteamDT Key.
    """
    if payload.market_hash_names:
        names = list(dict.fromkeys(payload.market_hash_names))
    else:
        watchlist = db.get_watchlist(user["id"], enabled_only=True)
        names = [
            it["market_hash_name"]
            for it in watchlist
            if it.get("market_hash_name")
        ]

    if not names:
        return RefreshResponse(total=0, success=0, failed=0, duration_ms=0, items=[])

    if len(names) > 100:
        raise HTTPException(
            status_code=400,
            detail=f"单次最多刷新 100 个，您选了 {len(names)} 个。请分批操作或取消部分选中。",
        )

    client = _get_user_or_system_client(request, config, user_api_key)
    # 用户级 client 用完即关；系统级 client 由 lifespan 管理
    user_owned_client = bool(user_api_key)
    started = _time.monotonic()

    try:
        response = client.get_items_batch(names, use_throttle=True)
    except SteamDTRateLimitError as e:
        retry_after = int(e.retry_after) + 1
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "source": e.source,
                "retry_after": retry_after,
                "message": f"刷新过于频繁，请 {retry_after} 秒后再试",
            },
            headers={"Retry-After": str(retry_after)},
        )
    except SteamDTBusinessError as e:
        raise HTTPException(
            status_code=502,
            detail=f"SteamDT 业务错误 [{e.code}]: {e.error_msg}",
        )
    except SteamDTError as e:
        raise HTTPException(status_code=502, detail=f"SteamDT 调用失败: {e}")
    finally:
        if user_owned_client:
            client.close()

    data_list = response.get("data") or []
    by_name = {
        it.get("marketHashName"): it
        for it in data_list
        if it.get("marketHashName")
    }

    results: list[RefreshItemResult] = []
    for name in names:
        item = by_name.get(name)
        if not item:
            results.append(
                RefreshItemResult(
                    market_hash_name=name,
                    ok=False,
                    error="not_found_in_response",
                )
            )
            continue

        db.insert_item(name)

        platform_data = item.get("dataList") or []
        prices: list[float] = []
        for p in platform_data:
            platform = p.get("platform")
            sell_price = p.get("sellPrice")
            if platform is None or sell_price is None:
                continue
            try:
                price_f = float(sell_price)
            except (TypeError, ValueError):
                continue
            db.insert_price_record(name, platform, price_f)
            if price_f > 0:
                prices.append(price_f)

        latest = min(prices) if prices else None
        results.append(
            RefreshItemResult(
                market_hash_name=name,
                ok=latest is not None,
                latest_price=latest,
                platform_count=len(prices),
                error=None if latest is not None else "no_valid_platform_price",
            )
        )

    duration_ms = int((_time.monotonic() - started) * 1000)
    success_count = sum(1 for r in results if r.ok)

    return RefreshResponse(
        total=len(names),
        success=success_count,
        failed=len(names) - success_count,
        duration_ms=duration_ms,
        items=results,
    )
