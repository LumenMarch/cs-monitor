"""APScheduler 定时任务管理（多用户版）.

设计要点：
- 监控 / 极致追踪 / 告警基准价重算：按用户循环，每个用户用自己的 SteamDT Key
- 全市场任务（items 同步、价格归档）：使用系统级 Key（若 .env 未配置则尝试借任一用户 Key）
- 每次循环按需创建 SteamDTClient 实例，用完即关，避免跨用户串扰
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from api.steamdt import (
    SteamDTClient,
    SteamDTConfig,
    SteamDTError,
    SteamDTRateLimitError,
)
from config import MonitorConfig
from core.analyzer import PriceAnalyzer
from core.extreme_tracker import ExtremeTracker
from core.monitor import PriceMonitor
from storage.database import Database
from utils.security import EncryptionError, decrypt_secret


class MonitorScheduler:
    """多用户调度器：所有自动化任务的入口."""

    def __init__(
        self,
        db: Database,
        config: MonitorConfig,
        system_client: SteamDTClient | None = None,
    ) -> None:
        """
        Args:
            db: 共享数据库
            config: 全局配置（含 master_encryption_key）
            system_client: 系统级 SteamDT 客户端（来自 .env STEAMDT_API_KEY），可为 None
        """
        self.db = db
        self.config = config
        self.system_client = system_client
        self.tz = ZoneInfo(config.timezone)
        self.scheduler = BackgroundScheduler(timezone=config.timezone)
        self._last_synced_at: datetime | None = None

    # ------------------------------------------------------------------
    # SteamDT client 工厂
    # ------------------------------------------------------------------
    def _build_user_client(self, user: dict[str, Any]) -> SteamDTClient | None:
        """根据用户记录解密 Key 并创建临时 client. 失败返回 None."""
        token = user.get("steamdt_api_key_encrypted")
        if not token:
            return None
        try:
            api_key = decrypt_secret(token, self.config.master_encryption_key)
        except EncryptionError as exc:
            logger.error(
                f"[scheduler] 解密用户 id={user['id']} SteamDT Key 失败: {exc}; 跳过"
            )
            return None
        if not api_key:
            return None
        return SteamDTClient(
            SteamDTConfig(
                api_key=api_key,
                base_url=self.config.api_base_url,
                timeout=self.config.request_timeout,
                max_retries=self.config.request_retry,
            )
        )

    def _pick_admin_client(self) -> SteamDTClient | None:
        """系统级任务用：优先 system_client；否则借任一有 Key 的用户.

        返回的 client 调用方负责 close.
        """
        if self.system_client is not None:
            return self.system_client
        users = self.db.list_users_with_steamdt_key()
        for u in users:
            client = self._build_user_client(u)
            if client is not None:
                return client
        return None

    # ------------------------------------------------------------------
    # Job: 普通监控（多用户循环）
    # ------------------------------------------------------------------
    def _run_monitor(self) -> None:
        """对每个有 SteamDT Key 的用户跑一遍价格采集 + 波动分析."""
        users = self.db.list_users_with_steamdt_key()
        if not users:
            logger.debug("[scheduler] 暂无配置 SteamDT Key 的用户，跳过监控 tick")
            return

        for user in users:
            client = self._build_user_client(user)
            if client is None:
                continue
            try:
                monitor = PriceMonitor(client, self.db, self.config, user["id"])
                monitor.collect_prices()
            except Exception:
                logger.exception(
                    f"[scheduler] 用户 id={user['id']} 监控异常"
                )
            finally:
                client.close()

    # ------------------------------------------------------------------
    # Job: 极致追踪（多用户循环）
    # ------------------------------------------------------------------
    def _run_extreme_tracker(self) -> None:
        users = self.db.list_users_with_steamdt_key()
        if not users:
            return

        for user in users:
            client = self._build_user_client(user)
            if client is None:
                continue
            try:
                tracker = ExtremeTracker(client, self.db, self.config, user["id"])
                tracker.tick()
            except Exception:
                logger.exception(
                    f"[scheduler] 用户 id={user['id']} 极致追踪异常"
                )
            finally:
                client.close()

    # ------------------------------------------------------------------
    # Job: 价格归档（系统级，与 user_id 无关）
    # ------------------------------------------------------------------
    def _run_archive(self) -> None:
        try:
            result = self.db.archive_old_price_records(days=90)
            logger.info(
                f"定时归档完成: 聚合 {result['aggregated']} 条, "
                f"归档 {result['archived']} 条, 删除 {result['deleted']} 条"
            )
        except Exception:
            logger.exception("价格记录归档失败")

    # ------------------------------------------------------------------
    # Job: 全市场饰品同步（系统级）
    # ------------------------------------------------------------------
    def _run_item_sync(self) -> None:
        now = datetime.now()
        if self._last_synced_at and now - self._last_synced_at < timedelta(hours=20):
            logger.debug(
                f"[scheduler] item sync 20h 内已执行"
                f"(上次: {self._last_synced_at:%Y-%m-%d %H:%M})，跳过"
            )
            return

        if not self.db.needs_item_sync():
            logger.debug("饰品数据未过期，跳过同步")
            return

        client = self._pick_admin_client()
        if client is None:
            logger.warning(
                "[scheduler] item sync 跳过：无系统级 STEAMDT_API_KEY 且无任何用户配置了 Key"
            )
            return

        owned = client is not self.system_client
        try:
            logger.info("📦 开始定时同步全量饰品数据...")
            response = client.get_all_items()
        except SteamDTRateLimitError as e:
            logger.warning(f"[scheduler] item sync 限流: {e}")
            return
        except SteamDTError as e:
            logger.error(f"[scheduler] item sync 失败: {e}")
            return
        finally:
            if owned:
                client.close()

        if response.get("success"):
            items_data = response.get("data") or []
            count = self.db.bulk_upsert_items(items_data)
            self._last_synced_at = now
            logger.info(f"✅ 定时饰品同步完成，共 {count} 条")
        else:
            logger.warning(
                f"⚠️ 定时饰品同步失败: {response.get('errorMsg', '未知错误')}"
            )

    # ------------------------------------------------------------------
    # Job 注册
    # ------------------------------------------------------------------
    def _add_monitor_job(self) -> None:
        interval = max(1, self.config.check_interval_minutes)
        self.scheduler.add_job(
            self._run_monitor,
            trigger=IntervalTrigger(minutes=interval),
            id="normal_monitor",
            name="普通监控价格采集（多用户循环）",
            replace_existing=True,
        )
        logger.info(f"普通监控任务已注册，间隔: {interval} 分钟")

    def _add_extreme_tracker_job(self) -> None:
        self.scheduler.add_job(
            self._run_extreme_tracker,
            trigger=IntervalTrigger(seconds=10),
            id="extreme_tracker",
            name="极致追踪轮询（多用户循环）",
            replace_existing=True,
        )
        logger.info("极致追踪任务已注册，tick 间隔: 10 秒")

    def _add_archive_job(self) -> None:
        self.scheduler.add_job(
            self._run_archive,
            trigger=CronTrigger(hour=3, minute=0, timezone=self.tz),
            id="archive_prices",
            name="价格记录归档",
            replace_existing=True,
        )
        logger.info(f"归档任务已注册，每天凌晨 3:00 执行 ({self.config.timezone})")

    def _add_item_sync_job(self) -> None:
        self.scheduler.add_job(
            self._run_item_sync,
            trigger=CronTrigger(hour=4, minute=0, timezone=self.tz),
            id="item_sync",
            name="全量饰品同步",
            replace_existing=True,
        )
        logger.info(
            f"饰品同步任务已注册，每天凌晨 4:00 执行 ({self.config.timezone})"
        )

    # ------------------------------------------------------------------
    # 生命周期
    # ------------------------------------------------------------------
    def start(self) -> None:
        self._add_monitor_job()
        self._add_extreme_tracker_job()
        self._add_archive_job()
        self._add_item_sync_job()
        self.scheduler.start()
        logger.info("调度器已启动（多用户模式）")

        # 启动时立即跑一次：监控 + 告警基准价重算
        logger.info("[scheduler] 启动立即执行一次价格采集与基准价重算...")
        self._run_monitor()
        self._recalculate_baselines_once()

    def _recalculate_baselines_once(self) -> None:
        """启动时一次性重算所有用户的告警基准价.

        使用系统级 client（或任一用户 Key）；analyzer 只用 client 取市场公共 K 线，
        与 user_id 无关，所以挂在任意一个 user_id 上即可（这里挂 0 是占位，
        因为 update_alert_baseline 与 get_all_alerts 都不依赖 self.user_id）.
        """
        client = self._pick_admin_client()
        if client is None:
            logger.warning(
                "[scheduler] 跳过基准价重算：无任何可用的 SteamDT Key"
            )
            return
        owned = client is not self.system_client
        try:
            analyzer = PriceAnalyzer(client, self.db, self.config, user_id=0)
            updated = analyzer.recalculate_all_baselines()
            logger.info(f"告警基准价重算完成，更新 {updated} 条")
        except Exception:
            logger.exception("告警基准价重算异常")
        finally:
            if owned:
                client.close()

    def shutdown(self, wait: bool = True) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=wait)
            logger.info("调度器已关闭")
