"""存储模块单元测试（多用户 schema v2）."""

import tempfile
from pathlib import Path

import pytest

from storage.database import Database
from utils.security import hash_password


class TestDatabase:
    """测试 Database 类."""

    @pytest.fixture
    def db(self):
        """创建临时数据库 + 默认 admin 用户（user_id=1）."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            d = Database(db_path)
            d.create_user(
                "admin", hash_password("test-pass-1234"), role="admin"
            )
            yield d

    # ------------------------------------------------------------------
    # schema / 全局表
    # ------------------------------------------------------------------
    def test_init_tables(self, db):
        """v2 schema 应包含 users + 全部隔离表 + 全局表."""
        with db._cursor() as cursor:
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = {row["name"] for row in cursor.fetchall()}
        for required in (
            "users",
            "items",
            "price_records",
            "alert_logs",
            "extreme_track_snapshots",
            "extreme_track_alerts",
            "watchlist",
            "extreme_track_config",
        ):
            assert required in tables, f"缺表 {required}"

    def test_schema_version_marker(self, db):
        """初始化后应写入 schema_version=2."""
        assert db.get_system_config("schema_version") == "2"

    def test_insert_and_get_item(self, db):
        """items 是全局表，无 user_id."""
        db.insert_item("AK-47 | Redline (Field-Tested)", "AK-47 红线", "rifle")
        item = db.get_item("AK-47 | Redline (Field-Tested)")
        assert item is not None
        assert item["market_hash_name"] == "AK-47 | Redline (Field-Tested)"
        assert item["display_name"] == "AK-47 红线"

    def test_insert_price_record_and_get_latest(self, db):
        """price_records 是全局表，无 user_id."""
        db.insert_item("AK-47 | Redline (Field-Tested)")
        db.insert_price_record("AK-47 | Redline (Field-Tested)", "BUFF", 125.0)
        latest = db.get_latest_price(
            "AK-47 | Redline (Field-Tested)", "BUFF"
        )
        assert latest is not None
        assert latest["price"] == 125.0
        assert latest["platform"] == "BUFF"

    # ------------------------------------------------------------------
    # 隔离表：alert_logs
    # ------------------------------------------------------------------
    def test_insert_alert_log_and_get_recent(self, db):
        db.insert_alert_log(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            alert_type="price_surge",
            current_price=130.0,
            baseline_price=120.0,
            change_percent=8.33,
        )
        alerts = db.get_recent_alerts(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            alert_type="price_surge",
            hours=4,
        )
        assert len(alerts) == 1
        assert alerts[0]["current_price"] == 130.0

    def test_alert_log_isolated_per_user(self, db):
        """两个用户的 alert_logs 互不可见."""
        alice = db.create_user("alice", hash_password("xxxxxxxx"), role="user")
        bob = db.create_user("bob", hash_password("xxxxxxxx"), role="user")
        db.insert_alert_log(alice, "AK", "price_surge", current_price=100)
        db.insert_alert_log(bob, "AK", "price_drop", current_price=80)

        a = db.get_recent_alerts(alice, "AK", "price_surge")
        b = db.get_recent_alerts(bob, "AK", "price_surge")
        assert len(a) == 1 and a[0]["current_price"] == 100
        assert len(b) == 0  # bob 没有 price_surge

    # ------------------------------------------------------------------
    # 隔离表：extreme_track_snapshots / alerts
    # ------------------------------------------------------------------
    def test_insert_extreme_snapshot_and_get_latest(self, db):
        db.insert_extreme_snapshot(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            platform="youpin",
            price=128.5,
            quantity=42,
        )
        latest = db.get_latest_snapshot(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            platform="youpin",
        )
        assert latest is not None
        assert latest["price"] == 128.5
        assert latest["quantity"] == 42

    def test_insert_extreme_alert_and_get_latest(self, db):
        db.insert_extreme_alert(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            platform="youpin",
            alert_type="price_change",
            prev_price=125.0,
            curr_price=128.5,
            price_change_percent=2.8,
        )
        latest = db.get_latest_extreme_alert(
            user_id=1,
            market_hash_name="AK-47 | Redline (Field-Tested)",
            platform="youpin",
            alert_type="price_change",
        )
        assert latest is not None
        assert latest["prev_price"] == 125.0
        assert latest["curr_price"] == 128.5

    # ------------------------------------------------------------------
    # 隔离表：watchlist
    # ------------------------------------------------------------------
    def test_watchlist_crud_and_isolation(self, db):
        alice = db.create_user("alice", hash_password("xxxxxxxx"), role="user")
        bob = db.create_user("bob", hash_password("xxxxxxxx"), role="user")

        db.insert_watchlist_item(alice, "AK", display_name="A's AK")
        db.insert_watchlist_item(bob, "AK", display_name="B's AK")

        assert len(db.get_watchlist(alice)) == 1
        assert len(db.get_watchlist(bob)) == 1
        assert db.get_watchlist_item(alice, "AK")["display_name"] == "A's AK"
        assert db.get_watchlist_item(bob, "AK")["display_name"] == "B's AK"

        # update 只能命中自己
        assert db.update_watchlist_item(alice, "AK", threshold_percent=8) is True
        assert db.get_watchlist_threshold(alice, "AK") == 8.0
        assert db.get_watchlist_threshold(bob, "AK") == 5.0

        # 删除只删自己
        assert db.delete_watchlist_item(alice, "AK") is True
        assert db.get_watchlist(alice) == []
        assert len(db.get_watchlist(bob)) == 1

        # 计数也按用户
        assert db.get_watchlist_count(alice) == 0
        assert db.get_watchlist_count(bob) == 1

    # ------------------------------------------------------------------
    # 隔离表：extreme_track_config
    # ------------------------------------------------------------------
    def test_extreme_track_config_isolation(self, db):
        alice = db.create_user("alice", hash_password("xxxxxxxx"), role="user")
        bob = db.create_user("bob", hash_password("xxxxxxxx"), role="user")

        db.insert_extreme_track_config(alice, "AK", "BUFF", interval_seconds=60)
        db.insert_extreme_track_config(bob, "AK", "BUFF", interval_seconds=30)

        assert db.get_extreme_track_config(alice, "AK", "BUFF")[
            "interval_seconds"
        ] == 60
        assert db.get_extreme_track_config(bob, "AK", "BUFF")[
            "interval_seconds"
        ] == 30

        assert db.update_extreme_track_config(
            alice, "AK", "BUFF", interval_seconds=120
        ) is True
        assert db.get_extreme_track_config(alice, "AK", "BUFF")[
            "interval_seconds"
        ] == 120
        assert db.get_extreme_track_config(bob, "AK", "BUFF")[
            "interval_seconds"
        ] == 30  # 不受影响

        assert db.delete_extreme_track_config(alice, "AK", "BUFF") is True
        assert db.get_extreme_track_count(alice) == 0
        assert db.get_extreme_track_count(bob) == 1

    # ------------------------------------------------------------------
    # 用户 CRUD
    # ------------------------------------------------------------------
    def test_user_crud_basics(self, db):
        new_id = db.create_user(
            "alice",
            hash_password("xxxxxxxx"),
            role="user",
            must_change_password=True,
        )
        u = db.get_user_by_id(new_id)
        assert u and u["username"] == "alice" and u["must_change_password"] == 1
        assert db.get_user_by_username("alice") is not None
        assert db.get_user_by_username("nobody") is None

        # 至少有 admin + alice 两个用户
        users = db.list_users()
        usernames = {u["username"] for u in users}
        assert {"admin", "alice"} <= usernames

        assert db.count_admins() == 1
        db.update_user_role(new_id, "admin")
        assert db.count_admins() == 2

        assert db.delete_user(new_id) is True
        assert db.get_user_by_id(new_id) is None

    def test_cascade_delete_user(self, db):
        """删除用户应级联清空其 watchlist."""
        uid = db.create_user("alice", hash_password("xxxxxxxx"), role="user")
        db.insert_watchlist_item(uid, "AK")
        assert len(db.get_watchlist(uid)) == 1

        db.delete_user(uid)
        # FK ON DELETE CASCADE 让 watchlist 行也被删
        with db._cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM watchlist WHERE user_id = ?", (uid,)
            )
            assert cursor.fetchone()[0] == 0

    # ------------------------------------------------------------------
    # 归档（系统级，与 user_id 无关）
    # ------------------------------------------------------------------
    def test_archive_old_price_records_empty(self, db):
        result = db.archive_old_price_records(days=90)
        assert result["archived"] == 0
        assert result["deleted"] == 0
        assert result["aggregated"] == 0

    def test_archive_old_price_records(self, db):
        db.insert_item("AK-47 | Redline")
        db.insert_item("AWP | Asiimov")

        db.insert_price_record("AK-47 | Redline", "buff", 100.0)
        db.insert_price_record("AK-47 | Redline", "buff", 102.0)

        with db._cursor() as cursor:
            old_date = "date('now', '-91 days')"
            cursor.execute(
                f"""
                INSERT INTO price_records (market_hash_name, platform, price, recorded_at)
                VALUES ('AK-47 | Redline', 'buff', 90.0, {old_date})
                """
            )
            cursor.execute(
                f"""
                INSERT INTO price_records (market_hash_name, platform, price, recorded_at)
                VALUES ('AK-47 | Redline', 'buff', 92.0, {old_date})
                """
            )
            cursor.execute(
                f"""
                INSERT INTO price_records (market_hash_name, platform, price, recorded_at)
                VALUES ('AWP | Asiimov', 'uu', 200.0, {old_date})
                """
            )

        result = db.archive_old_price_records(days=90)
        assert result["aggregated"] == 2
        assert result["archived"] == 2
        assert result["deleted"] == 3

        archived = db.get_archived_price_history("AK-47 | Redline")
        assert len(archived) == 1
        assert archived[0]["avg_price"] == 91.0
        assert archived[0]["record_count"] == 2

        recent = db.get_price_history("AK-47 | Redline")
        assert len(recent) == 2
