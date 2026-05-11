"""数据库表结构定义.

设计原则（多用户隔离 v2）：
  - 用户专属数据（watchlist、extreme_track_config、各类 alert、snapshot）带 user_id 隔离
  - 全局市场数据（items、items_fts、price_records、archived_prices、system_config）保持共享
  - 新部署会触发清空重建逻辑（见 Database._init_tables），不再支持从旧单租户 schema 增量迁移
"""

# =============================================================================
# 用户与认证（v2 多用户）
# =============================================================================

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    steamdt_api_key_encrypted TEXT,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);
"""

CREATE_IDX_USERS_USERNAME = """
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
"""


# =============================================================================
# 全局市场数据（无 user_id，全部用户共享）
# =============================================================================

# 饰品基础信息表
CREATE_ITEMS_TABLE = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_hash_name TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    category TEXT,
    icon_url TEXT,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_ITEMS_FTS = """
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    market_hash_name,
    name,
    content='items',
    content_rowid='id'
);
"""

CREATE_ITEMS_FTS_INSERT = """
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, market_hash_name, name)
    VALUES (new.id, new.market_hash_name, new.name);
END;
"""

CREATE_ITEMS_FTS_DELETE = """
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, market_hash_name, name)
    VALUES ('delete', old.id, old.market_hash_name, old.name);
END;
"""

CREATE_ITEMS_FTS_UPDATE = """
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, market_hash_name, name)
    VALUES ('delete', old.id, old.market_hash_name, old.name);
    INSERT INTO items_fts(rowid, market_hash_name, name)
    VALUES (new.id, new.market_hash_name, new.name);
END;
"""

# 价格记录表（市场公共数据，全局共享）
CREATE_PRICE_RECORDS_TABLE = """
CREATE TABLE IF NOT EXISTS price_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_hash_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    price REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (market_hash_name) REFERENCES items(market_hash_name)
);
"""

CREATE_ARCHIVED_PRICES_TABLE = """
CREATE TABLE IF NOT EXISTS archived_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_hash_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    date TEXT NOT NULL,
    avg_price REAL NOT NULL,
    min_price REAL,
    max_price REAL,
    record_count INTEGER NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market_hash_name, platform, date)
);
"""

# 系统配置表（全局）
CREATE_SYSTEM_CONFIG_TABLE = """
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


# =============================================================================
# 用户隔离数据（带 user_id 外键）
# =============================================================================

# 监控清单（每用户一份）
CREATE_WATCHLIST_TABLE = """
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    display_name TEXT,
    threshold_percent REAL DEFAULT 5.0,
    enabled INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, market_hash_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_WATCHLIST_USER_ENABLED = """
CREATE INDEX IF NOT EXISTS idx_watchlist_user_enabled
    ON watchlist(user_id, enabled);
"""

# 极致追踪配置（每用户一份）
CREATE_EXTREME_TRACK_CONFIG_TABLE = """
CREATE TABLE IF NOT EXISTS extreme_track_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    interval_seconds INTEGER DEFAULT 60,
    enabled INTEGER DEFAULT 1,
    price_track_enabled INTEGER DEFAULT 1,
    price_change_mode TEXT DEFAULT 'any',
    price_threshold_percent REAL DEFAULT 0.0,
    quantity_track_enabled INTEGER DEFAULT 1,
    quantity_change_mode TEXT DEFAULT 'any',
    quantity_threshold_percent REAL DEFAULT 0.0,
    alert_cooldown_seconds INTEGER DEFAULT 0,
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, market_hash_name, platform),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_EXTREME_USER_ENABLED = """
CREATE INDEX IF NOT EXISTS idx_extreme_user_enabled
    ON extreme_track_config(user_id, enabled);
"""

# 普通监控告警记录
CREATE_ALERT_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS alert_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    current_price REAL,
    baseline_price REAL,
    change_percent REAL,
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_ALERT_LOGS_USER = """
CREATE INDEX IF NOT EXISTS idx_alert_logs_user
    ON alert_logs(user_id, notified_at DESC);
"""

# 极致追踪快照（每用户独立轨迹）
CREATE_EXTREME_TRACK_SNAPSHOTS_TABLE = """
CREATE TABLE IF NOT EXISTS extreme_track_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    price REAL,
    quantity INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_SNAPSHOT_USER_ITEM_TIME = """
CREATE INDEX IF NOT EXISTS idx_snapshot_user_item_time
    ON extreme_track_snapshots(user_id, market_hash_name, platform, recorded_at DESC);
"""

# 极致追踪告警
CREATE_EXTREME_TRACK_ALERTS_TABLE = """
CREATE TABLE IF NOT EXISTS extreme_track_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    prev_price REAL,
    curr_price REAL,
    price_change_percent REAL,
    prev_quantity INTEGER,
    curr_quantity INTEGER,
    quantity_change_percent REAL,
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_EXTREME_ALERTS_USER = """
CREATE INDEX IF NOT EXISTS idx_extreme_alerts_user
    ON extreme_track_alerts(user_id, notified_at DESC);
"""


# 捡漏雷达：扫描配置（每用户单条）
CREATE_BARGAIN_SCAN_CONFIG_TABLE = """
CREATE TABLE IF NOT EXISTS bargain_scan_config (
    user_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    min_profit_percent REAL NOT NULL DEFAULT 5.0,
    min_profit_amount REAL NOT NULL DEFAULT 0.0,
    min_buy_price REAL NOT NULL DEFAULT 0.0,
    max_buy_price REAL NOT NULL DEFAULT 0.0,
    buy_platforms TEXT,
    sell_platforms TEXT,
    interval_minutes INTEGER NOT NULL DEFAULT 5,
    alert_cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    notify_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

# 捡漏雷达：扫描出的跨平台价差机会（每用户独立）
CREATE_BARGAIN_OPPORTUNITIES_TABLE = """
CREATE TABLE IF NOT EXISTS bargain_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    market_hash_name TEXT NOT NULL,
    buy_platform TEXT NOT NULL,
    sell_platform TEXT NOT NULL,
    buy_price REAL NOT NULL,
    sell_price REAL NOT NULL,
    profit_amount REAL NOT NULL,
    profit_percent REAL NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified INTEGER NOT NULL DEFAULT 0,
    dismissed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

CREATE_IDX_BARGAIN_OPP_USER_SCAN = """
CREATE INDEX IF NOT EXISTS idx_bargain_opp_user_scan
    ON bargain_opportunities(user_id, scanned_at DESC);
"""

CREATE_IDX_BARGAIN_OPP_USER_ITEM = """
CREATE INDEX IF NOT EXISTS idx_bargain_opp_user_item
    ON bargain_opportunities(user_id, market_hash_name, buy_platform, sell_platform, scanned_at DESC);
"""


# =============================================================================
# 当前 schema 版本（用于"清空重建"判定）
# =============================================================================
SCHEMA_VERSION = 3

ALL_TABLES = [
    # 用户表先于其他表创建（FK 依赖）
    CREATE_USERS_TABLE,
    CREATE_IDX_USERS_USERNAME,
    # 全局市场数据
    CREATE_ITEMS_TABLE,
    CREATE_ITEMS_FTS,
    CREATE_ITEMS_FTS_INSERT,
    CREATE_ITEMS_FTS_DELETE,
    CREATE_ITEMS_FTS_UPDATE,
    CREATE_PRICE_RECORDS_TABLE,
    CREATE_ARCHIVED_PRICES_TABLE,
    CREATE_SYSTEM_CONFIG_TABLE,
    # 用户隔离数据
    CREATE_WATCHLIST_TABLE,
    CREATE_IDX_WATCHLIST_USER_ENABLED,
    CREATE_EXTREME_TRACK_CONFIG_TABLE,
    CREATE_IDX_EXTREME_USER_ENABLED,
    CREATE_ALERT_LOGS_TABLE,
    CREATE_IDX_ALERT_LOGS_USER,
    CREATE_EXTREME_TRACK_SNAPSHOTS_TABLE,
    CREATE_IDX_SNAPSHOT_USER_ITEM_TIME,
    CREATE_EXTREME_TRACK_ALERTS_TABLE,
    CREATE_IDX_EXTREME_ALERTS_USER,
    # 捡漏雷达
    CREATE_BARGAIN_SCAN_CONFIG_TABLE,
    CREATE_BARGAIN_OPPORTUNITIES_TABLE,
    CREATE_IDX_BARGAIN_OPP_USER_SCAN,
    CREATE_IDX_BARGAIN_OPP_USER_ITEM,
]
