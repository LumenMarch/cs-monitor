"""捡漏雷达：数据库 + 扫描器 + API 端到端测试（多用户 v2 schema）."""

from __future__ import annotations

import json
import secrets
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from config import MonitorConfig
from core.bargain_scanner import BargainScanner
from storage.database import Database
from utils.security import hash_password
from web.app import create_app


ADMIN_PASSWORD = "admin-pass-1234"
USER_PASSWORD = "user-pass-5678"


# =============================================================================
# Database 层
# =============================================================================
class TestBargainDatabase:
    @pytest.fixture
    def db(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            d = Database(Path(tmpdir) / "test.db")
            d.create_user("alice", hash_password("xxxxxxxx"), role="user")
            d.create_user("bob", hash_password("yyyyyyyy"), role="user")
            yield d

    def test_default_config_returns_for_unset_user(self, db: Database):
        cfg = db.get_bargain_config(user_id=1)
        assert cfg["user_id"] == 1
        assert cfg["enabled"] == 0
        assert cfg["min_profit_percent"] == 5.0
        assert cfg["interval_minutes"] == 5

    def test_upsert_config_persists_and_updates(self, db: Database):
        first = db.upsert_bargain_config(
            user_id=1,
            enabled=True,
            min_profit_percent=10.0,
            buy_platforms=json.dumps(["BUFF"]),
        )
        assert first["enabled"] == 1
        assert first["min_profit_percent"] == 10.0
        assert json.loads(first["buy_platforms"]) == ["BUFF"]

        second = db.upsert_bargain_config(
            user_id=1, min_profit_percent=8.5, interval_minutes=10
        )
        # min_profit_percent 改了，其他保留
        assert second["min_profit_percent"] == 8.5
        assert second["interval_minutes"] == 10
        assert second["enabled"] == 1  # 上一次的状态保留
        assert json.loads(second["buy_platforms"]) == ["BUFF"]

    def test_list_active_users_isolates_disabled(self, db: Database):
        db.upsert_bargain_config(user_id=1, enabled=True)
        db.upsert_bargain_config(user_id=2, enabled=False)
        rows = db.list_users_with_bargain_enabled()
        assert {r["user_id"] for r in rows} == {1}

    def test_insert_and_paginate_opportunities(self, db: Database):
        for i in range(3):
            db.insert_bargain_opportunity(
                user_id=1,
                market_hash_name=f"item-{i}",
                buy_platform="BUFF",
                sell_platform="YYYP",
                buy_price=100.0,
                sell_price=120.0,
                profit_amount=20.0,
                profit_percent=20.0,
            )
        rows, total = db.get_bargain_opportunities(user_id=1, page=1, limit=2)
        assert total == 3
        assert len(rows) == 2

    def test_dismiss_excludes_from_default_list(self, db: Database):
        opp_id = db.insert_bargain_opportunity(
            user_id=1,
            market_hash_name="x",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        assert db.dismiss_bargain_opportunity(user_id=1, opportunity_id=opp_id) is True

        active, _ = db.get_bargain_opportunities(user_id=1)
        all_rows, _ = db.get_bargain_opportunities(user_id=1, include_dismissed=True)
        assert all(r["id"] != opp_id for r in active)
        assert any(r["id"] == opp_id for r in all_rows)

    def test_opportunities_isolated_between_users(self, db: Database):
        db.insert_bargain_opportunity(
            user_id=1,
            market_hash_name="ak",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        rows_alice, _ = db.get_bargain_opportunities(user_id=1)
        rows_bob, _ = db.get_bargain_opportunities(user_id=2)
        assert len(rows_alice) == 1
        assert len(rows_bob) == 0

    def test_has_recent_opportunity_cooldown(self, db: Database):
        assert not db.has_recent_bargain_opportunity(1, "x", "BUFF", "YYYP", 60)
        db.insert_bargain_opportunity(
            user_id=1,
            market_hash_name="x",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        assert db.has_recent_bargain_opportunity(1, "x", "BUFF", "YYYP", 60)
        # 不同买卖平台组合不命中
        assert not db.has_recent_bargain_opportunity(1, "x", "BUFF", "IGXE", 60)
        # cooldown=0 表示禁用冷却
        assert not db.has_recent_bargain_opportunity(1, "x", "BUFF", "YYYP", 0)


# =============================================================================
# BargainScanner
# =============================================================================
class TestBargainScanner:
    @pytest.fixture
    def env(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db = Database(Path(tmpdir) / "test.db")
            uid = db.create_user("alice", hash_password("xxxxxxxx"))
            cfg = MonitorConfig()
            yield {"db": db, "config": cfg, "user_id": uid}

    @staticmethod
    def _seed_price(db: Database, name: str, platform: str, price: float):
        db.insert_item(market_hash_name=name)
        db.insert_price_record(market_hash_name=name, platform=platform, price=price)

    def test_scan_disabled_returns_empty(self, env):
        db = env["db"]
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        assert scanner.scan() == []

    def test_scan_hits_threshold_default_steam_route(self, env):
        """默认平台策略：买入=国内三方，卖出=STEAM（无需显式配置白名单）."""
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"], enabled=True, min_profit_percent=5.0
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        scanner.notifier.send_bargain_alert = MagicMock(return_value=True)

        results = scanner.scan()
        assert len(results) == 1
        r = results[0]
        assert r["buy_platform"] == "BUFF"
        assert r["sell_platform"] == "STEAM"
        assert r["profit_amount"] == 30.0
        assert r["profit_percent"] == 30.0
        assert r["notified"] is True
        scanner.notifier.send_bargain_alert.assert_called_once()

    def test_scan_default_excludes_third_party_to_third_party(self, env):
        """默认策略不应在国内三方之间互相套利（卖出方默认锁 Steam）."""
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"], enabled=True, min_profit_percent=5.0
        )
        # 只在 BUFF / YYYP 之间有价差，没有 STEAM 价格 → 默认策略下不应命中
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "YYYP", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        assert scanner.scan() == []

    def test_scan_skips_below_threshold(self, env):
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"], enabled=True, min_profit_percent=50.0
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 110.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        assert scanner.scan() == []

    def test_scan_respects_cooldown(self, env):
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"],
            enabled=True,
            min_profit_percent=5.0,
            alert_cooldown_minutes=60,
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        scanner.notifier.send_bargain_alert = MagicMock(return_value=True)

        first = scanner.scan()
        second = scanner.scan()
        assert len(first) == 1
        assert len(second) == 0  # 冷却期内不重复

    def test_scan_respects_price_range(self, env):
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"],
            enabled=True,
            min_profit_percent=5.0,
            max_buy_price=50.0,
        )
        # buy_price=100 > max 50，应被过滤
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        assert scanner.scan() == []

    def test_scan_respects_buy_platform_whitelist(self, env):
        """显式配置 buy_platforms 只允许 IGXE，但只有 BUFF 价格 → 不命中."""
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"],
            enabled=True,
            min_profit_percent=5.0,
            buy_platforms=json.dumps(["IGXE"]),
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        assert scanner.scan() == []

    def test_scan_custom_sell_platform_overrides_default(self, env):
        """显式配置 sell_platforms 可覆盖默认 STEAM 锁定，做反向/任意方向套利."""
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"],
            enabled=True,
            min_profit_percent=5.0,
            sell_platforms=json.dumps(["YYYP"]),
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "YYYP", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        scanner.notifier.send_bargain_alert = MagicMock(return_value=True)

        results = scanner.scan()
        assert len(results) == 1
        assert results[0]["buy_platform"] == "BUFF"
        assert results[0]["sell_platform"] == "YYYP"

    def test_scan_notify_disabled_still_records(self, env):
        db = env["db"]
        db.upsert_bargain_config(
            user_id=env["user_id"],
            enabled=True,
            min_profit_percent=5.0,
            notify_enabled=False,
        )
        self._seed_price(db, "AK", "BUFF", 100.0)
        self._seed_price(db, "AK", "STEAM", 130.0)
        scanner = BargainScanner(db, env["config"], env["user_id"])
        scanner.notifier = MagicMock()
        scanner.notifier.send_bargain_alert = MagicMock(return_value=True)

        results = scanner.scan()
        assert len(results) == 1
        assert results[0]["notified"] is False
        scanner.notifier.send_bargain_alert.assert_not_called()


# =============================================================================
# Web API
# =============================================================================
def _build_config() -> MonitorConfig:
    cfg = MonitorConfig()
    cfg.master_encryption_key = Fernet.generate_key().decode()
    cfg.jwt_secret_key = secrets.token_urlsafe(64)
    return cfg


class TestBargainAPI:
    @pytest.fixture
    def env(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db = Database(Path(tmpdir) / "test.db")
            admin_id = db.create_user(
                "admin", hash_password(ADMIN_PASSWORD), role="admin",
                must_change_password=False,
            )
            user_id = db.create_user(
                "alice", hash_password(USER_PASSWORD), role="user",
                must_change_password=False,
            )
            cfg = _build_config()
            app = create_app(db, cfg)

            with TestClient(app) as c:
                r = c.post(
                    "/api/auth/login",
                    json={"username": "admin", "password": ADMIN_PASSWORD},
                )
                admin_token = r.json()["access_token"]
                r = c.post(
                    "/api/auth/login",
                    json={"username": "alice", "password": USER_PASSWORD},
                )
                user_token = r.json()["access_token"]

                c.headers["Authorization"] = f"Bearer {admin_token}"
                yield {
                    "client": c,
                    "db": db,
                    "admin_id": admin_id,
                    "user_id": user_id,
                    "admin_token": admin_token,
                    "user_token": user_token,
                }

    def test_get_config_returns_defaults(self, env):
        r = env["client"].get("/api/bargain/config")
        assert r.status_code == 200
        body = r.json()
        assert body["enabled"] == 0
        assert body["min_profit_percent"] == 5.0
        assert body["buy_platforms"] == []

    def test_update_and_get_config_round_trip(self, env):
        payload = {
            "enabled": True,
            "min_profit_percent": 12.5,
            "buy_platforms": ["BUFF", "C5GAME"],
            "interval_minutes": 10,
        }
        r = env["client"].put("/api/bargain/config", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["enabled"] == 1
        assert body["min_profit_percent"] == 12.5
        assert body["buy_platforms"] == ["BUFF", "C5GAME"]
        assert body["interval_minutes"] == 10

        # 重新 GET 也应一致
        r2 = env["client"].get("/api/bargain/config")
        assert r2.json()["min_profit_percent"] == 12.5

    def test_update_rejects_invalid_max_buy_price(self, env):
        r = env["client"].put(
            "/api/bargain/config",
            json={"min_buy_price": 100, "max_buy_price": 50},
        )
        assert r.status_code == 400

    def test_manual_scan_requires_enabled(self, env):
        r = env["client"].post("/api/bargain/scan")
        assert r.status_code == 400

    def test_opportunities_isolated_between_users(self, env):
        client = env["client"]
        db = env["db"]

        db.insert_bargain_opportunity(
            user_id=env["admin_id"],
            market_hash_name="admin-only",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        db.insert_bargain_opportunity(
            user_id=env["user_id"],
            market_hash_name="alice-only",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )

        # admin 视角
        r = client.get("/api/bargain/opportunities")
        names = [op["market_hash_name"] for op in r.json()["items"]]
        assert names == ["admin-only"]

        # 切换到 alice
        client.headers["Authorization"] = f"Bearer {env['user_token']}"
        r2 = client.get("/api/bargain/opportunities")
        names2 = [op["market_hash_name"] for op in r2.json()["items"]]
        assert names2 == ["alice-only"]

    def test_dismiss_then_optional_include(self, env):
        client = env["client"]
        db = env["db"]
        opp_id = db.insert_bargain_opportunity(
            user_id=env["admin_id"],
            market_hash_name="x",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        r = client.delete(f"/api/bargain/opportunities/{opp_id}")
        assert r.status_code == 200

        default = client.get("/api/bargain/opportunities").json()
        included = client.get(
            "/api/bargain/opportunities", params={"include_dismissed": True}
        ).json()
        assert default["total"] == 0
        assert included["total"] == 1

    def test_dismiss_other_user_opportunity_returns_404(self, env):
        db = env["db"]
        opp_id = db.insert_bargain_opportunity(
            user_id=env["user_id"],  # 属于 alice
            market_hash_name="x",
            buy_platform="BUFF",
            sell_platform="YYYP",
            buy_price=10.0,
            sell_price=12.0,
            profit_amount=2.0,
            profit_percent=20.0,
        )
        # admin 尝试忽略别人的机会 → 404
        r = env["client"].delete(f"/api/bargain/opportunities/{opp_id}")
        assert r.status_code == 404
