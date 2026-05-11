"""价格数据路由."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.steam_images import fetch_icon_url, fetch_icon_urls_batch
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
from web.schemas import LatestPriceItem, PlatformPriceItem, PriceHistoryItem

router = APIRouter(prefix="/prices", tags=["prices"])


def _get_steamdt_client(
    request: Request, config: MonitorConfig, user_api_key: str | None
) -> SteamDTClient:
    """优先用用户 Key 创建客户端；否则回退系统级 client；都没有则报 400."""
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
            detail="未配置 SteamDT API Key——请在用户中心填写个人 Key",
        )
    return client


@router.get("/search")
def search_items_local(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(20, ge=1, le=50, description="返回数量上限"),
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """本地模糊搜索饰品（FTS5 + LIKE 兜底，全局市场数据，无需隔离）."""
    if not q.strip():
        return []
    return db.search_items(q.strip(), limit=limit)


@router.get("/lookup")
def lookup_item_price(
    market_hash_name: str = Query(..., description="精确的 marketHashName"),
    request: Request = None,  # type: ignore[assignment]
    db: Database = Depends(get_db),
    config: MonitorConfig = Depends(get_config),
    user: dict = Depends(require_password_changed),
    user_api_key: str | None = Depends(get_current_user_steamdt_key),
) -> dict:
    """查询某饰品各平台实时价格 + 当前用户是否已监控."""
    if not market_hash_name.strip():
        raise HTTPException(status_code=400, detail="market_hash_name 不能为空")

    client = _get_steamdt_client(request, config, user_api_key)
    user_owned_client = bool(user_api_key)
    name = market_hash_name.strip()
    try:
        response = client.get_item_price_single(name)
    except SteamDTRateLimitError as e:
        retry_after = int(e.retry_after) + 1
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "retry_after": retry_after},
            headers={"Retry-After": str(retry_after)},
        )
    except SteamDTBusinessError as e:
        raise HTTPException(status_code=502, detail=f"[{e.code}] {e.error_msg}")
    except SteamDTError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        if user_owned_client:
            client.close()

    if not response.get("success"):
        raise HTTPException(
            status_code=502,
            detail=f"SteamDT API 错误: {response.get('errorMsg', '未知错误')}",
        )

    data_list = response.get("data") or []
    if not isinstance(data_list, list):
        data_list = []

    in_wl = db.get_watchlist_item(user["id"], name) is not None
    return {
        "market_hash_name": name,
        "dataList": data_list,
        "in_watchlist": in_wl,
    }


@router.get("/latest", response_model=list[LatestPriceItem])
def get_latest_prices(
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """获取最新价格（市场公共数据）."""
    return db.get_latest_prices()


@router.get("/{market_hash_name}/history", response_model=list[PriceHistoryItem])
def get_price_history(
    market_hash_name: str,
    days: int | None = None,
    platform: str | None = None,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """获取指定饰品历史价格（市场公共数据）."""
    return db.get_price_history(
        market_hash_name=market_hash_name,
        days=days,
        platform=platform,
    )


@router.get("/{market_hash_name}/platforms", response_model=list[PlatformPriceItem])
def get_price_by_platforms(
    market_hash_name: str,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
) -> list[dict]:
    """获取指定饰品在各平台的最新价格（市场公共数据）."""
    return db.get_price_by_platforms(market_hash_name)


@router.get("/items/{market_hash_name:path}/icon")
async def get_item_icon(
    market_hash_name: str,
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
):
    """获取饰品图标 URL（市场公共数据）."""
    icon_url = db.get_item_icon_url(market_hash_name)
    if not icon_url:
        icon_url = await fetch_icon_url(market_hash_name)
        if icon_url:
            db.update_item_icon_url(market_hash_name, icon_url)
    return {"market_hash_name": market_hash_name, "icon_url": icon_url}


@router.post("/items/icons/sync")
async def sync_item_icons(
    db: Database = Depends(get_db),
    user: dict = Depends(require_password_changed),
):
    """批量同步缺图标的饰品 icon_url（系统级维护操作；任何登录用户可触发）."""
    with db._cursor() as cursor:  # type: ignore[attr-defined]
        cursor.execute(
            """
            SELECT DISTINCT market_hash_name FROM (
                SELECT market_hash_name FROM items WHERE icon_url IS NULL OR icon_url = ''
                UNION
                SELECT market_hash_name FROM watchlist WHERE market_hash_name NOT IN (
                    SELECT market_hash_name FROM items WHERE icon_url IS NOT NULL AND icon_url != ''
                )
            )
            """
        )
        items = cursor.fetchall()

    if not items:
        return {"synced": 0, "total": 0, "message": "所有饰品已有图标"}

    names = [row[0] for row in items]
    results = await fetch_icon_urls_batch(names)

    synced = 0
    for name, url in results.items():
        if url:
            db.update_item_icon_url(name, url)
            synced += 1

    return {"synced": synced, "total": len(names)}
