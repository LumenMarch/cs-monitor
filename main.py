"""CS2 饰品价格波动监控系统主入口."""

from __future__ import annotations

import signal
import sys
import threading

import uvicorn
from loguru import logger

from api.steamdt import SteamDTClient, SteamDTConfig
from config import MonitorConfig
from core.scheduler import MonitorScheduler
from storage.database import Database
from utils.security import hash_password
from web.app import create_app


def _ensure_admin_user(db: Database, config: MonitorConfig) -> None:
    """首次启动：若 DB 中无 admin，按 ADMIN_INITIAL_PASSWORD 创建一个."""
    if db.count_admins() > 0:
        return
    if not config.admin_initial_password:
        logger.error(
            "❌ 系统中没有 admin 用户，且未设置 ADMIN_INITIAL_PASSWORD。"
            "请在 .env 中设置后重启，或使用 scripts/manage_users.py 手动创建"
        )
        sys.exit(1)
    if len(config.admin_initial_password) < 8:
        logger.error("❌ ADMIN_INITIAL_PASSWORD 至少 8 位")
        sys.exit(1)

    admin_id = db.create_user(
        username="admin",
        password_hash=hash_password(config.admin_initial_password),
        role="admin",
        must_change_password=True,
    )
    logger.info(
        f"✅ 已自动创建 admin 用户 (id={admin_id})，首次登录需修改密码。"
        " 出于安全考虑请尽快清空 .env 中的 ADMIN_INITIAL_PASSWORD"
    )


def main() -> None:
    """主函数：同时启动 APScheduler + FastAPI."""
    logger.info("🚀 CS2 Monitor 启动中...")

    # 加载配置
    config = MonitorConfig.from_env()

    # 多用户模式必填项校验
    missing = config.validate_security()
    if missing:
        logger.error(
            "❌ 缺少多用户安全配置，请在 .env 中设置以下变量后重试: "
            + ", ".join(missing)
        )
        logger.error(
            "💡 MASTER_ENCRYPTION_KEY 生成: "
            "uv run python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        logger.error(
            "💡 JWT_SECRET_KEY 生成: "
            "uv run python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )
        sys.exit(1)

    logger.info(f"✅ 配置加载完成，通知渠道: {config.notify_channel}")

    # 初始化数据库
    db = Database("data/prices.db")
    logger.info("✅ 数据库初始化完成")

    # 首次启动：确保至少存在一个 admin
    _ensure_admin_user(db, config)

    # B-37: 清理 current_price=0 的历史脏告警
    cleaned = db.clean_zero_price_alerts()
    if cleaned > 0:
        logger.info(f"🧹 已清理 {cleaned} 条脏告警数据")

    # 系统级 SteamDT 客户端：用 .env 中的 STEAMDT_API_KEY（如有）。
    # 多用户业务任务（监控 / 极致追踪 / 捡漏雷达）将按每个用户自己的 Key 跑；
    # 此处的全局 client 仅用于 items 全量同步等系统级任务，未配置则跳过.
    client: SteamDTClient | None = None
    if config.api_key:
        steamdt_config = SteamDTConfig(
            api_key=config.api_key,
            base_url=config.api_base_url,
            timeout=config.request_timeout,
            max_retries=config.request_retry,
        )
        client = SteamDTClient(steamdt_config)
        logger.info("✅ SteamDT 系统级客户端初始化完成")

        # B-42: 启动时同步全量饰品数据（每天限 1 次）
        if db.needs_item_sync():
            logger.info("📦 items 表为空或数据过期，开始同步全量饰品数据...")
            try:
                response = client.get_all_items()
                if response.get("success"):
                    items_data = response.get("data") or []
                    count = db.bulk_upsert_items(items_data)
                    logger.info(f"✅ 全量饰品同步完成，共 {count} 条")
                else:
                    logger.warning(
                        f"⚠️ 全量饰品同步失败: {response.get('errorMsg', '未知错误')}"
                    )
            except Exception:
                logger.exception("全量饰品同步异常")
        else:
            logger.info(f"📦 items 表已有 {db.get_items_count()} 条记录，跳过同步")
    else:
        logger.warning(
            "⚠️ 未配置 STEAMDT_API_KEY（系统级），items 全量同步将跳过；"
            "用户可登录后在用户中心设置自己的 Key 跑监控 / 捡漏雷达"
        )

    # 创建 FastAPI 应用（无论是否有 client/scheduler，Web 层始终启动）
    app = create_app(db, config)

    # 初始化调度器（多用户改造中：暂时仅在有系统级 SteamDT Key 时启动；
    # 后续会改造为按用户循环，每个用户用自己的 Key）
    scheduler: MonitorScheduler | None = None
    if client is not None:
        scheduler = MonitorScheduler(client, db, config)

        def run_scheduler() -> None:
            try:
                assert scheduler is not None
                scheduler.start()
                logger.info("✅ 调度器已启动，系统运行中...")
            except Exception:
                logger.exception("调度器启动失败")

        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
    else:
        logger.warning(
            "⚠️ 调度器未启动（缺少系统级 STEAMDT_API_KEY）。"
            "用户可通过 Web 登录并设置个人 Key，但自动监控暂未生效——"
            "调度器多用户改造将在后续步骤完成。"
        )

    # 配置 uvicorn
    web_host = config.web_host
    web_port = config.web_port
    uvicorn_config = uvicorn.Config(
        app,
        host=web_host,
        port=web_port,
        log_level="info",
    )
    server = uvicorn.Server(uvicorn_config)

    # 注册信号处理：优雅退出
    def signal_handler(signum: int | None, frame: object | None) -> None:
        logger.info("🛑 收到中断信号，正在优雅退出...")
        if scheduler is not None:
            scheduler.shutdown(wait=True)
        if client is not None:
            client.close()
        server.should_exit = True
        logger.info("👋 已安全退出")
        sys.exit(0)

    # uvicorn 会覆盖信号处理，所以我们在启动前设置
    # 同时使用 atexit 确保退出时清理
    original_sigint = signal.signal(signal.SIGINT, signal_handler)
    original_sigterm = signal.signal(signal.SIGTERM, signal_handler)

    logger.info(f"🌐 Web 服务启动中: http://{web_host}:{web_port}")

    try:
        server.run()
    except KeyboardInterrupt:
        signal_handler(None, None)
    finally:
        # 恢复原始信号处理
        signal.signal(signal.SIGINT, original_sigint)
        signal.signal(signal.SIGTERM, original_sigterm)


if __name__ == "__main__":
    main()
