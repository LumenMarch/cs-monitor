"""CS2 Monitor 配置管理."""

from dataclasses import dataclass, field
from os import getenv

from dotenv import load_dotenv

load_dotenv()


@dataclass
class MonitorConfig:
    """监控配置类."""

    # === API 配置 ===
    api_key: str = ""
    api_base_url: str = "https://open.steamdt.com"
    request_timeout: int = 30
    request_retry: int = 3

    # === 监控配置 ===
    check_interval_minutes: int = 30
    default_threshold_percent: float = 5.0
    alert_cooldown_hours: int = 4
    timezone: str = "Asia/Shanghai"

    # === 通知配置 ===
    notify_channel: str = "wecom"
    wecom_webhook_url: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    telegram_proxy: str = ""
    serverchan_sendkey: str = ""

    # === 监控清单 ===
    watchlist: list = field(default_factory=lambda: [
        {"name": "AK-47 | Redline (Field-Tested)", "threshold": 5.0},
        {"name": "AWP | Asiimov (Field-Tested)", "threshold": 5.0},
    ])

    # === Web 服务配置 ===
    web_host: str = "0.0.0.0"
    web_port: int = 8080

    # === 多用户认证配置 ===
    master_encryption_key: str = ""
    jwt_secret_key: str = ""
    jwt_expire_hours: int = 24
    admin_initial_password: str = ""

    # === 极致追踪配置 ===
    extreme_track_list: list = field(default_factory=list)

    def validate_security(self) -> list[str]:
        """检查多用户模式下必填的安全配置项. 返回缺失项列表."""
        missing: list[str] = []
        if not self.master_encryption_key:
            missing.append("MASTER_ENCRYPTION_KEY")
        if not self.jwt_secret_key:
            missing.append("JWT_SECRET_KEY")
        return missing

    @classmethod
    def from_env(cls) -> "MonitorConfig":
        """从环境变量加载配置."""
        return cls(
            api_key=getenv("STEAMDT_API_KEY", ""),
            api_base_url=getenv("STEAMDT_API_BASE_URL", "https://open.steamdt.com"),
            request_timeout=int(getenv("REQUEST_TIMEOUT", "30")),
            request_retry=int(getenv("REQUEST_RETRY", "3")),
            check_interval_minutes=int(getenv("CHECK_INTERVAL_MINUTES", "30")),
            default_threshold_percent=float(getenv("DEFAULT_THRESHOLD_PERCENT", "5.0")),
            alert_cooldown_hours=int(getenv("ALERT_COOLDOWN_HOURS", "4")),
            timezone=getenv("TIMEZONE", "Asia/Shanghai"),
            web_host=getenv("WEB_HOST", "0.0.0.0"),
            web_port=int(getenv("WEB_PORT", "8080")),
            master_encryption_key=getenv("MASTER_ENCRYPTION_KEY", ""),
            jwt_secret_key=getenv("JWT_SECRET_KEY", ""),
            jwt_expire_hours=int(getenv("JWT_EXPIRE_HOURS", "24")),
            admin_initial_password=getenv("ADMIN_INITIAL_PASSWORD", ""),
            notify_channel=getenv("NOTIFY_CHANNEL", "wecom"),
            wecom_webhook_url=getenv("WECOM_WEBHOOK_URL", ""),
            telegram_bot_token=getenv("TELEGRAM_BOT_TOKEN", ""),
            telegram_chat_id=getenv("TELEGRAM_CHAT_ID", ""),
            telegram_proxy=getenv("TELEGRAM_PROXY", ""),
            serverchan_sendkey=getenv("SERVERCHAN_SENDKEY", ""),
        )
