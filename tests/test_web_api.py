"""Web API 测试（多用户 v2）.

设计：
- 每个测试用一个临时 DB
- 默认 admin 用户已建好（密码 testpass-1234）
- client fixture 自动登录 admin，所有请求带 Authorization: Bearer <token>
- 部分测试创建额外用户验证隔离
"""

from __future__ import annotations

import secrets
import tempfile
from pathlib import Path

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from config import MonitorConfig
from storage.database import Database
from utils.security import hash_password
from web.app import create_app


ADMIN_PASSWORD = "testpass-1234"


def _build_config() -> MonitorConfig:
    cfg = MonitorConfig.from_env()
    cfg.master_encryption_key = Fernet.generate_key().decode()
    cfg.jwt_secret_key = secrets.token_urlsafe(64)
    cfg.jwt_expire_hours = 1
    cfg.api_key = ""
    return cfg


@pytest.fixture
def env():
    """每个测试一个独立 DB + 已建好 admin 的 TestClient（带 token）."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db = Database(Path(tmpdir) / "test.db")
        admin_id = db.create_user(
            "admin",
            hash_password(ADMIN_PASSWORD),
            role="admin",
            must_change_password=False,
        )
        cfg = _build_config()
        app = create_app(db, cfg)
        with TestClient(app) as c:
            r = c.post(
                "/api/auth/login",
                json={"username": "admin", "password": ADMIN_PASSWORD},
            )
            assert r.status_code == 200
            c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
            yield {"client": c, "db": db, "config": cfg, "admin_id": admin_id}


@pytest.fixture
def client(env) -> TestClient:
    return env["client"]


# =============================================================================
# 认证
# =============================================================================
class TestAuthEndpoint:
    def test_login_success(self, env) -> None:
        c: TestClient = env["client"]
        r = c.post(
            "/api/auth/login",
            json={"username": "admin", "password": ADMIN_PASSWORD},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"]
        assert data["token_type"] == "bearer"
        assert data["username"] == "admin"
        assert data["role"] == "admin"
        assert data["requires_password_change"] is False

    def test_login_failure_wrong_password(self, env) -> None:
        c: TestClient = env["client"]
        r = c.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_login_failure_unknown_user(self, env) -> None:
        c: TestClient = env["client"]
        r = c.post(
            "/api/auth/login",
            json={"username": "ghost", "password": "anything"},
        )
        assert r.status_code == 401

    def test_must_change_password_flag(self, env) -> None:
        c: TestClient = env["client"]
        env["db"].create_user(
            "newbie",
            hash_password("init-pwd-1234"),
            role="user",
            must_change_password=True,
        )
        r = c.post(
            "/api/auth/login",
            json={"username": "newbie", "password": "init-pwd-1234"},
        )
        assert r.status_code == 200 and r.json()["requires_password_change"] is True

    def test_me_endpoint(self, client: TestClient) -> None:
        r = client.get("/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"
        assert data["has_steamdt_key"] is False

    def test_access_protected_without_token(self, client: TestClient) -> None:
        original = client.headers.pop("Authorization", None)
        try:
            r = client.get("/api/watchlist")
            assert r.status_code == 401
        finally:
            if original:
                client.headers["Authorization"] = original

    def test_access_protected_with_invalid_token(self, client: TestClient) -> None:
        original = client.headers.get("Authorization", "")
        client.headers["Authorization"] = "Bearer notarealtoken"
        try:
            r = client.get("/api/watchlist")
            assert r.status_code == 401
        finally:
            client.headers["Authorization"] = original

    def test_change_password_success(self, client: TestClient) -> None:
        r = client.post(
            "/api/auth/change-password",
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": "new-strong-pwd-9876",
            },
        )
        assert r.status_code == 204

    def test_change_password_wrong_current(self, client: TestClient) -> None:
        r = client.post(
            "/api/auth/change-password",
            json={"current_password": "wrong", "new_password": "new-pwd-9876"},
        )
        assert r.status_code == 400

    def test_change_password_too_short(self, client: TestClient) -> None:
        r = client.post(
            "/api/auth/change-password",
            json={"current_password": ADMIN_PASSWORD, "new_password": "short"},
        )
        # Pydantic min_length=8 → 422
        assert r.status_code == 422

    def test_steamdt_key_set_and_clear(self, client: TestClient) -> None:
        # 设
        r = client.put("/api/auth/steamdt-key", json={"api_key": "sk-real-key"})
        assert r.status_code == 204
        assert client.get("/api/auth/me").json()["has_steamdt_key"] is True
        # 清
        r = client.delete("/api/auth/steamdt-key")
        assert r.status_code == 204
        assert client.get("/api/auth/me").json()["has_steamdt_key"] is False


# =============================================================================
# 用户管理（admin CRUD）
# =============================================================================
class TestUsersEndpoint:
    def test_list_users(self, client: TestClient) -> None:
        r = client.get("/api/users")
        assert r.status_code == 200
        data = r.json()
        assert any(u["username"] == "admin" for u in data)

    def test_create_user(self, client: TestClient) -> None:
        r = client.post(
            "/api/users",
            json={
                "username": "alice",
                "password": "alice-pwd-1234",
                "role": "user",
                "must_change_password": True,
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["username"] == "alice"
        assert data["role"] == "user"

    def test_create_duplicate_user(self, client: TestClient) -> None:
        body = {
            "username": "dup",
            "password": "dup-pwd-1234",
            "role": "user",
            "must_change_password": False,
        }
        assert client.post("/api/users", json=body).status_code == 201
        assert client.post("/api/users", json=body).status_code == 409

    def test_non_admin_blocked(self, env) -> None:
        c: TestClient = env["client"]
        env["db"].create_user(
            "alice", hash_password("alice-pwd-1234"), role="user"
        )
        # 切到 alice 登录
        r = c.post(
            "/api/auth/login",
            json={"username": "alice", "password": "alice-pwd-1234"},
        )
        c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        # alice 访问 /api/users → 403
        assert c.get("/api/users").status_code == 403

    def test_cannot_delete_self(self, client: TestClient, env) -> None:
        r = client.delete(f"/api/users/{env['admin_id']}")
        assert r.status_code == 400

    def test_cannot_demote_last_admin(self, client: TestClient, env) -> None:
        r = client.patch(
            f"/api/users/{env['admin_id']}", json={"role": "user"}
        )
        assert r.status_code == 400


# =============================================================================
# Health（无需认证）
# =============================================================================
class TestHealthEndpoint:
    def test_health_check(self, client: TestClient) -> None:
        original = client.headers.pop("Authorization", None)
        try:
            r = client.get("/api/health")
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "ok"
            assert "database" in data
        finally:
            if original:
                client.headers["Authorization"] = original


# =============================================================================
# Dashboard
# =============================================================================
class TestDashboardEndpoint:
    def test_dashboard_summary_empty(self, client: TestClient) -> None:
        r = client.get("/api/dashboard/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["active_watchlist"] == 0
        assert data["extreme_track_count"] == 0
        assert data["today_alert_count"] == 0

    def test_cors_preflight(self, client: TestClient) -> None:
        r = client.options(
            "/api/dashboard/summary",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert r.status_code == 200
        assert "access-control-allow-origin" in r.headers


# =============================================================================
# Watchlist
# =============================================================================
class TestWatchlistEndpoint:
    def test_get_watchlist_empty(self, client: TestClient) -> None:
        r = client.get("/api/watchlist")
        assert r.status_code == 200 and r.json() == []

    def test_create_watchlist_item(self, client: TestClient) -> None:
        payload = {
            "market_hash_name": "Test Knife | Doppler (Factory New)",
            "display_name": "Test Knife",
            "threshold_percent": 3.0,
            "enabled": True,
        }
        r = client.post("/api/watchlist", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["market_hash_name"] == payload["market_hash_name"]
        assert data["threshold_percent"] == 3.0
        assert data["enabled"] == 1

    def test_create_duplicate_watchlist_item(self, client: TestClient) -> None:
        payload = {"market_hash_name": "Duplicate Item", "threshold_percent": 5.0}
        assert client.post("/api/watchlist", json=payload).status_code == 200
        assert client.post("/api/watchlist", json=payload).status_code == 409

    def test_update_watchlist_item(self, client: TestClient) -> None:
        client.post(
            "/api/watchlist",
            json={"market_hash_name": "Update Item", "threshold_percent": 5.0},
        )
        r = client.put(
            "/api/watchlist/Update%20Item",
            json={"threshold_percent": 10.0, "enabled": False},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["threshold_percent"] == 10.0
        assert data["enabled"] == 0

    def test_update_nonexistent_item(self, client: TestClient) -> None:
        r = client.put(
            "/api/watchlist/Nonexistent",
            json={"threshold_percent": 10.0},
        )
        assert r.status_code == 404

    def test_delete_watchlist_item(self, client: TestClient) -> None:
        client.post(
            "/api/watchlist",
            json={"market_hash_name": "Delete Item", "threshold_percent": 5.0},
        )
        r = client.delete("/api/watchlist/Delete%20Item")
        assert r.status_code == 200
        assert client.get("/api/watchlist").json() == []

    def test_delete_nonexistent_item(self, client: TestClient) -> None:
        assert client.delete("/api/watchlist/Nonexistent").status_code == 404

    def test_watchlist_isolated_between_users(self, env) -> None:
        """admin 加饰品后，alice 看到的列表仍然为空."""
        c: TestClient = env["client"]
        c.post(
            "/api/watchlist",
            json={"market_hash_name": "AdminOnly", "threshold_percent": 5.0},
        )
        # 切到 alice
        env["db"].create_user(
            "alice", hash_password("alice-pwd-1234"), role="user"
        )
        r = c.post(
            "/api/auth/login",
            json={"username": "alice", "password": "alice-pwd-1234"},
        )
        c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        assert c.get("/api/watchlist").json() == []


# =============================================================================
# Alerts
# =============================================================================
class TestAlertsEndpoint:
    def test_get_alerts_empty(self, client: TestClient) -> None:
        r = client.get("/api/alerts")
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_alerts_with_data(self, client: TestClient, env) -> None:
        db = env["db"]
        admin_id = env["admin_id"]
        db.insert_alert_log(
            admin_id, "AK-47 | Redline", "price_surge",
            current_price=100.0, baseline_price=90.0, change_percent=11.11,
        )
        db.insert_alert_log(
            admin_id, "AWP | Asiimov", "price_drop",
            current_price=80.0, baseline_price=100.0, change_percent=-20.0,
        )
        r = client.get("/api/alerts")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        names = {it["market_hash_name"] for it in data["items"]}
        assert names == {"AK-47 | Redline", "AWP | Asiimov"}

    def test_get_alerts_filter_by_type(self, client: TestClient, env) -> None:
        db = env["db"]
        admin_id = env["admin_id"]
        db.insert_alert_log(admin_id, "Item A", "price_surge", current_price=100)
        db.insert_alert_log(admin_id, "Item B", "price_drop", current_price=80)

        r = client.get("/api/alerts?alert_type=price_surge")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["alert_type"] == "price_surge"

    def test_get_alerts_pagination(self, client: TestClient, env) -> None:
        db = env["db"]
        admin_id = env["admin_id"]
        for i in range(5):
            db.insert_alert_log(
                admin_id, f"Item {i}", "price_surge", current_price=float(i)
            )
        r = client.get("/api/alerts?page=1&limit=2")
        assert len(r.json()["items"]) == 2
        r = client.get("/api/alerts?page=2&limit=2")
        assert len(r.json()["items"]) == 2

    def test_get_alert_stats(self, client: TestClient, env) -> None:
        db = env["db"]
        admin_id = env["admin_id"]
        db.insert_alert_log(admin_id, "A", "price_surge", current_price=100)
        db.insert_alert_log(admin_id, "B", "price_surge", current_price=90)
        db.insert_alert_log(admin_id, "C", "price_drop", current_price=80)
        r = client.get("/api/alerts/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 3
        assert "by_day" in data and "by_type" in data

    def test_alerts_isolated_between_users(self, env) -> None:
        c: TestClient = env["client"]
        db = env["db"]
        # admin 有 1 条
        db.insert_alert_log(
            env["admin_id"], "AdminItem", "price_surge", current_price=100
        )
        # alice 注册并登录
        alice_id = db.create_user(
            "alice", hash_password("alice-pwd-1234"), role="user"
        )
        db.insert_alert_log(
            alice_id, "AliceItem", "price_drop", current_price=80
        )
        r = c.post(
            "/api/auth/login",
            json={"username": "alice", "password": "alice-pwd-1234"},
        )
        c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        items = c.get("/api/alerts").json()["items"]
        names = {it["market_hash_name"] for it in items}
        assert names == {"AliceItem"}


# =============================================================================
# Prices（市场公共数据，无 user 隔离）
# =============================================================================
class TestPricesEndpoint:
    def test_get_latest_prices_empty(self, client: TestClient) -> None:
        r = client.get("/api/prices/latest")
        assert r.status_code == 200 and r.json() == []

    def test_get_latest_prices(self, client: TestClient, env) -> None:
        db = env["db"]
        db.insert_item("AK-47 | Redline")
        db.insert_item("AWP | Asiimov")
        db.insert_price_record("AK-47 | Redline", "buff", 100.0)
        db.insert_price_record("AK-47 | Redline", "uu", 98.0)
        db.insert_price_record("AWP | Asiimov", "buff", 200.0)
        r = client.get("/api/prices/latest")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3

    def test_get_price_history(self, client: TestClient, env) -> None:
        db = env["db"]
        db.insert_item("AK-47 | Redline")
        db.insert_price_record("AK-47 | Redline", "buff", 100.0)
        db.insert_price_record("AK-47 | Redline", "buff", 105.0)
        db.insert_price_record("AK-47 | Redline", "uu", 98.0)
        r = client.get("/api/prices/AK-47%20%7C%20Redline/history")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_get_price_history_with_platform_filter(self, client: TestClient, env) -> None:
        db = env["db"]
        db.insert_item("AK-47 | Redline")
        db.insert_price_record("AK-47 | Redline", "buff", 100.0)
        db.insert_price_record("AK-47 | Redline", "uu", 98.0)
        r = client.get(
            "/api/prices/AK-47%20%7C%20Redline/history?platform=buff"
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1 and data[0]["platform"] == "buff"

    def test_get_price_by_platforms(self, client: TestClient, env) -> None:
        db = env["db"]
        db.insert_item("AK-47 | Redline")
        db.insert_price_record("AK-47 | Redline", "buff", 100.0)
        db.insert_price_record("AK-47 | Redline", "uu", 98.0)
        r = client.get("/api/prices/AK-47%20%7C%20Redline/platforms")
        assert r.status_code == 200
        platforms = {it["platform"] for it in r.json()}
        assert platforms == {"buff", "uu"}


# =============================================================================
# Extreme Track
# =============================================================================
class TestExtremeTrackEndpoint:
    def test_get_extreme_track_empty(self, client: TestClient) -> None:
        r = client.get("/api/extreme-track")
        assert r.status_code == 200 and r.json() == []

    def test_create_extreme_track_config(self, client: TestClient) -> None:
        payload = {
            "market_hash_name": "AK-47 | Redline",
            "platform": "buff",
            "interval_seconds": 30,
            "enabled": True,
            "price_change_mode": "percent",
            "price_threshold_percent": 1.0,
        }
        r = client.post("/api/extreme-track", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["interval_seconds"] == 30
        assert data["enabled"] == 1
        assert data["price_change_mode"] == "percent"

    def test_create_duplicate_extreme_track(self, client: TestClient) -> None:
        payload = {"market_hash_name": "Duplicate", "platform": "buff"}
        assert client.post("/api/extreme-track", json=payload).status_code == 200
        assert client.post("/api/extreme-track", json=payload).status_code == 409

    def test_update_extreme_track_config(self, client: TestClient) -> None:
        client.post(
            "/api/extreme-track",
            json={
                "market_hash_name": "Update Item",
                "platform": "buff",
                "interval_seconds": 60,
            },
        )
        r = client.put(
            "/api/extreme-track/Update%20Item/buff",
            json={"interval_seconds": 120, "enabled": False},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["interval_seconds"] == 120 and data["enabled"] == 0

    def test_update_nonexistent_extreme_track(self, client: TestClient) -> None:
        r = client.put(
            "/api/extreme-track/Nonexistent/buff",
            json={"interval_seconds": 120},
        )
        assert r.status_code == 404

    def test_delete_extreme_track_config(self, client: TestClient) -> None:
        client.post(
            "/api/extreme-track",
            json={"market_hash_name": "Delete Item", "platform": "buff"},
        )
        r = client.delete("/api/extreme-track/Delete%20Item/buff")
        assert r.status_code == 200
        assert client.get("/api/extreme-track").json() == []

    def test_delete_nonexistent_extreme_track(self, client: TestClient) -> None:
        r = client.delete("/api/extreme-track/Nonexistent/buff")
        assert r.status_code == 404

    def test_toggle_extreme_track_config(self, client: TestClient) -> None:
        client.post(
            "/api/extreme-track",
            json={
                "market_hash_name": "Toggle Item",
                "platform": "buff",
                "enabled": True,
            },
        )
        r = client.post("/api/extreme-track/Toggle%20Item/buff/toggle")
        assert r.status_code == 200 and r.json()["enabled"] is False
        r = client.post("/api/extreme-track/Toggle%20Item/buff/toggle")
        assert r.status_code == 200 and r.json()["enabled"] is True

    def test_toggle_nonexistent_extreme_track(self, client: TestClient) -> None:
        r = client.post("/api/extreme-track/Nonexistent/buff/toggle")
        assert r.status_code == 404

    def test_extreme_track_isolated_between_users(self, env) -> None:
        c: TestClient = env["client"]
        c.post(
            "/api/extreme-track",
            json={"market_hash_name": "AdminItem", "platform": "buff"},
        )
        env["db"].create_user(
            "alice", hash_password("alice-pwd-1234"), role="user"
        )
        r = c.post(
            "/api/auth/login",
            json={"username": "alice", "password": "alice-pwd-1234"},
        )
        c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        assert c.get("/api/extreme-track").json() == []
