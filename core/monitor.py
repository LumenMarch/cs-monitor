"""普通监控模式：价格采集逻辑."""

from __future__ import annotations

from typing import Any

from loguru import logger

from api.steamdt import SteamDTClient
from config import MonitorConfig
from core.analyzer import PriceAnalyzer
from storage.database import Database


class PriceMonitor:
    """普通监控器：定时批量采集指定用户的 watchlist 价格."""

    def __init__(
        self,
        client: SteamDTClient,
        db: Database,
        config: MonitorConfig,
        user_id: int,
    ) -> None:
        self.client = client
        self.db = db
        self.config = config
        self.user_id = user_id
        self.analyzer = PriceAnalyzer(client, db, config, user_id)

    def collect_prices(self) -> dict[str, Any]:
        """采集当前用户 watchlist 中所有饰品的价格并存储.

        Returns:
            {"records": 价格记录列表, "alerts": 触发的告警列表}
        """
        watchlist = self.db.get_watchlist(self.user_id, enabled_only=True)
        if not watchlist:
            logger.info(f"[user={self.user_id}] 监控清单为空，跳过本次采集")
            return {"records": [], "alerts": []}

        names = [
            item["market_hash_name"]
            for item in watchlist
            if item.get("market_hash_name")
        ]
        if not names:
            logger.warning(f"[user={self.user_id}] 监控清单格式异常，跳过")
            return {"records": [], "alerts": []}

        logger.info(
            f"[user={self.user_id}] 开始批量采集 {len(names)} 个饰品..."
        )
        try:
            response = self.client.get_items_batch(names, use_throttle=False)
        except Exception as e:
            logger.error(f"[user={self.user_id}] 批量查询价格失败: {e}")
            return {"records": [], "alerts": []}

        if not response.get("success"):
            logger.error(
                f"[user={self.user_id}] SteamDT API 返回失败: "
                f"{response.get('errorMsg')}"
            )
            return {"records": [], "alerts": []}

        data = response.get("data") or []
        records: list[dict[str, Any]] = []

        for item in data:
            market_hash_name = item.get("marketHashName")
            if not market_hash_name:
                continue

            # 确保 items 表中有记录（外键约束）— items 是全局表，所有用户共享
            self.db.insert_item(market_hash_name)

            platform_data = item.get("dataList") or []
            for platform_info in platform_data:
                platform = platform_info.get("platform")
                price = platform_info.get("sellPrice")
                if platform is None or price is None:
                    continue

                # price_records 也是全局市场数据，不按 user_id 隔离
                self.db.insert_price_record(
                    market_hash_name, platform, float(price)
                )
                records.append({
                    "market_hash_name": market_hash_name,
                    "platform": platform,
                    "price": float(price),
                })

        logger.info(
            f"[user={self.user_id}] 采集完成，共写入 {len(records)} 条价格记录"
        )

        alerts: list[dict[str, Any]] = []
        if records:
            alerts = self.analyzer.analyze(records)
            logger.info(
                f"[user={self.user_id}] 分析触发 {len(alerts)} 条告警"
            )

        return {"records": records, "alerts": alerts}
