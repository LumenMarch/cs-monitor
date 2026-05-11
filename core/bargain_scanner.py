"""Steam 搬砖扫描器.

业务定位：在国内三方交易平台（BUFF / YYYP / IGXE / C5GAME 等）低价买入，
搬到 Steam 社区市场高价卖出，赚取跨市差价.

设计：基于 price_records（SteamDT batch 采集结果，市场公共数据）做跨平台
价差扫描，无需额外调用 SteamDT API.

每用户独立配置（min_profit_percent / 买入/卖出平台白名单 / 价格区间 /
冷却分钟数 / 通知开关），扫描结果写入 bargain_opportunities 表.

默认平台策略（buy_platforms / sell_platforms 留空时）：
  - 买入方默认为 BUFF / YYYP / IGXE / C5GAME（国内三方）
  - 卖出方默认锁 STEAM（不在国内三方之间互相套利）
"""

from __future__ import annotations

import json
from typing import Any

from loguru import logger

from config import MonitorConfig
from notify.manager import NotificationManager
from storage.database import Database


DEFAULT_BUY_PLATFORMS: frozenset[str] = frozenset(
    {"BUFF", "YYYP", "IGXE", "C5GAME"}
)
DEFAULT_SELL_PLATFORMS: frozenset[str] = frozenset({"STEAM"})


class BargainScanner:
    """Steam 搬砖扫描器（多用户）."""

    def __init__(
        self,
        db: Database,
        config: MonitorConfig,
        user_id: int,
    ) -> None:
        self.db = db
        self.config = config
        self.user_id = user_id
        self.notifier = NotificationManager(config)

    @staticmethod
    def _parse_platform_list(raw: str | None) -> set[str] | None:
        """解析 JSON 数组字符串为大写平台集合；空/失败/空数组都返回 None 表示不过滤."""
        if not raw:
            return None
        try:
            data = json.loads(raw)
        except (TypeError, ValueError):
            return None
        if not isinstance(data, list) or not data:
            return None
        return {str(p).upper() for p in data if p}

    def _load_latest_prices(self) -> dict[str, list[dict[str, Any]]]:
        """从全局 price_records 读取每饰品在各平台的最新价，按饰品分组."""
        rows = self.db.get_latest_prices()
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            if row.get("price", 0) <= 0:
                continue
            name = row["market_hash_name"]
            grouped.setdefault(name, []).append(row)
        return grouped

    def scan(self) -> list[dict[str, Any]]:
        """执行一次扫描；返回本次写入的机会列表（已应用冷却与阈值）."""
        cfg = self.db.get_bargain_config(self.user_id)
        if not cfg.get("enabled"):
            return []

        min_profit_percent = float(cfg.get("min_profit_percent") or 0.0)
        min_profit_amount = float(cfg.get("min_profit_amount") or 0.0)
        min_buy_price = float(cfg.get("min_buy_price") or 0.0)
        max_buy_price = float(cfg.get("max_buy_price") or 0.0)
        cooldown_minutes = int(cfg.get("alert_cooldown_minutes") or 0)
        notify_enabled = bool(cfg.get("notify_enabled"))
        # 留空时按 Steam 搬砖默认：买入=国内三方，卖出=Steam
        buy_whitelist = (
            self._parse_platform_list(cfg.get("buy_platforms"))
            or set(DEFAULT_BUY_PLATFORMS)
        )
        sell_whitelist = (
            self._parse_platform_list(cfg.get("sell_platforms"))
            or set(DEFAULT_SELL_PLATFORMS)
        )

        grouped = self._load_latest_prices()
        if not grouped:
            return []

        results: list[dict[str, Any]] = []
        for name, platforms in grouped.items():
            if len(platforms) < 2:
                continue

            buy_candidates = [
                p for p in platforms if p["platform"].upper() in buy_whitelist
            ]
            sell_candidates = [
                p for p in platforms if p["platform"].upper() in sell_whitelist
            ]
            if not buy_candidates or not sell_candidates:
                continue

            buy = min(buy_candidates, key=lambda p: p["price"])
            sell = max(sell_candidates, key=lambda p: p["price"])
            if buy["platform"] == sell["platform"]:
                continue

            buy_price = float(buy["price"])
            sell_price = float(sell["price"])
            if buy_price <= 0 or sell_price <= 0 or sell_price <= buy_price:
                continue
            if min_buy_price > 0 and buy_price < min_buy_price:
                continue
            if max_buy_price > 0 and buy_price > max_buy_price:
                continue

            profit_amount = sell_price - buy_price
            profit_percent = round((profit_amount / buy_price) * 100, 2)
            if profit_percent < min_profit_percent:
                continue
            if min_profit_amount > 0 and profit_amount < min_profit_amount:
                continue

            if self.db.has_recent_bargain_opportunity(
                self.user_id,
                name,
                buy["platform"],
                sell["platform"],
                cooldown_minutes,
            ):
                continue

            notified = False
            if notify_enabled:
                notified = self.notifier.send_bargain_alert(
                    {
                        "market_hash_name": name,
                        "buy_platform": buy["platform"],
                        "sell_platform": sell["platform"],
                        "buy_price": buy_price,
                        "sell_price": sell_price,
                        "profit_amount": profit_amount,
                        "profit_percent": profit_percent,
                    }
                )

            opp_id = self.db.insert_bargain_opportunity(
                user_id=self.user_id,
                market_hash_name=name,
                buy_platform=buy["platform"],
                sell_platform=sell["platform"],
                buy_price=buy_price,
                sell_price=sell_price,
                profit_amount=round(profit_amount, 2),
                profit_percent=profit_percent,
                notified=notified,
            )
            results.append(
                {
                    "id": opp_id,
                    "market_hash_name": name,
                    "buy_platform": buy["platform"],
                    "sell_platform": sell["platform"],
                    "buy_price": buy_price,
                    "sell_price": sell_price,
                    "profit_amount": round(profit_amount, 2),
                    "profit_percent": profit_percent,
                    "notified": notified,
                }
            )

        if results:
            logger.info(
                f"[bargain] user={self.user_id} 扫描发现 {len(results)} 条新机会"
            )
        else:
            logger.debug(f"[bargain] user={self.user_id} 本轮无新机会")
        return results
