"""CLI: 离线管理用户.

用法示例：
  uv run python scripts/manage_users.py list
  uv run python scripts/manage_users.py create alice --role user
  uv run python scripts/manage_users.py reset-password alice
  uv run python scripts/manage_users.py set-role alice admin
  uv run python scripts/manage_users.py activate alice
  uv run python scripts/manage_users.py deactivate alice
  uv run python scripts/manage_users.py delete alice
  uv run python scripts/manage_users.py set-key alice
  uv run python scripts/manage_users.py clear-key alice

密码与 API Key 通过 stdin 交互输入（getpass），不会出现在命令行历史里.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sqlite3
import sys
from pathlib import Path

# 让脚本既能从仓库根目录跑，也能通过 uv run 跑（让 Python 找到包路径）
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import MonitorConfig
from storage.database import Database
from utils.security import EncryptionError, encrypt_secret, hash_password


# 允许通过 CS_MONITOR_DB 环境变量覆盖（测试/多部署场景）
DB_PATH = Path(os.getenv("CS_MONITOR_DB") or (ROOT / "data" / "prices.db"))


def _open(require_master_key: bool = False) -> tuple[Database, MonitorConfig]:
    config = MonitorConfig.from_env()
    if require_master_key and not config.master_encryption_key:
        print(
            "ERROR: MASTER_ENCRYPTION_KEY 未设置，无法加密 API Key", file=sys.stderr
        )
        sys.exit(1)
    db = Database(DB_PATH)
    return db, config


def _prompt_password(prompt: str = "密码: ", confirm: bool = True) -> str:
    pwd = getpass.getpass(prompt)
    if len(pwd) < 8:
        print("ERROR: 密码至少 8 位", file=sys.stderr)
        sys.exit(1)
    if confirm:
        again = getpass.getpass("再次输入: ")
        if pwd != again:
            print("ERROR: 两次输入不一致", file=sys.stderr)
            sys.exit(1)
    return pwd


def _find_user(db: Database, ident: str) -> dict:
    """支持按 username 或数字 id 查找."""
    if ident.isdigit():
        u = db.get_user_by_id(int(ident))
    else:
        u = db.get_user_by_username(ident)
    if u is None:
        print(f"ERROR: 用户 {ident!r} 不存在", file=sys.stderr)
        sys.exit(1)
    return u


# --- subcommands -------------------------------------------------------------


def cmd_list(args: argparse.Namespace) -> None:
    db, _ = _open()
    rows = db.list_users(include_inactive=args.all)
    if not rows:
        print("（无用户）")
        return
    print(f"{'ID':<4} {'USERNAME':<20} {'ROLE':<8} {'ACTIVE':<7} {'CHGPWD':<7} {'KEY':<5} LAST_LOGIN")
    for r in rows:
        print(
            f"{r['id']:<4} {r['username']:<20} {r['role']:<8} "
            f"{'yes' if r['is_active'] else 'no':<7} "
            f"{'yes' if r['must_change_password'] else 'no':<7} "
            f"{'yes' if r['steamdt_api_key_encrypted'] else 'no':<5} "
            f"{r['last_login_at'] or '-'}"
        )


def cmd_create(args: argparse.Namespace) -> None:
    db, _ = _open()
    pwd = _prompt_password("初始密码: ")
    try:
        new_id = db.create_user(
            username=args.username,
            password_hash=hash_password(pwd),
            role=args.role,
            must_change_password=not args.no_force_change,
        )
    except sqlite3.IntegrityError:
        print(f"ERROR: 用户名 {args.username!r} 已存在", file=sys.stderr)
        sys.exit(1)
    print(f"✅ 已创建用户 id={new_id} username={args.username} role={args.role}")


def cmd_delete(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    if target["role"] == "admin" and db.count_admins() <= 1:
        print("ERROR: 至少需要保留一个 admin", file=sys.stderr)
        sys.exit(1)
    db.delete_user(target["id"])
    print(f"✅ 已删除用户 id={target['id']} username={target['username']}")


def cmd_reset_password(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    pwd = _prompt_password("新密码: ")
    db.update_user_password(
        target["id"],
        hash_password(pwd),
        must_change_password=not args.no_force_change,
    )
    print(
        f"✅ 已重置密码 user={target['username']} "
        f"(must_change={not args.no_force_change})"
    )


def cmd_set_role(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    if args.role not in {"admin", "user"}:
        print("ERROR: role 必须是 admin / user", file=sys.stderr)
        sys.exit(1)
    if (
        target["role"] == "admin"
        and args.role != "admin"
        and db.count_admins() <= 1
    ):
        print("ERROR: 至少需要保留一个 admin", file=sys.stderr)
        sys.exit(1)
    db.update_user_role(target["id"], args.role)
    print(f"✅ user={target['username']} role={args.role}")


def cmd_activate(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    db.set_user_active(target["id"], True)
    print(f"✅ 启用 user={target['username']}")


def cmd_deactivate(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    if (
        target["role"] == "admin"
        and target["is_active"]
        and db.count_admins() <= 1
    ):
        print("ERROR: 至少需要保留一个激活 admin", file=sys.stderr)
        sys.exit(1)
    db.set_user_active(target["id"], False)
    print(f"✅ 停用 user={target['username']}")


def cmd_set_key(args: argparse.Namespace) -> None:
    db, config = _open(require_master_key=True)
    target = _find_user(db, args.ident)
    key = getpass.getpass("SteamDT API Key: ").strip()
    if not key:
        print("ERROR: API Key 不能为空", file=sys.stderr)
        sys.exit(1)
    try:
        token = encrypt_secret(key, config.master_encryption_key)
    except EncryptionError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    db.set_user_steamdt_key_encrypted(target["id"], token)
    print(f"✅ 已为 user={target['username']} 设置加密 SteamDT API Key")


def cmd_clear_key(args: argparse.Namespace) -> None:
    db, _ = _open()
    target = _find_user(db, args.ident)
    db.set_user_steamdt_key_encrypted(target["id"], None)
    print(f"✅ 已清除 user={target['username']} 的 SteamDT API Key")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="cs-monitor 用户管理 CLI（离线、无需登录 Web）"
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("list", help="列出所有用户")
    sp.add_argument("--all", action="store_true", help="包含停用用户")
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("create", help="创建用户")
    sp.add_argument("username")
    sp.add_argument("--role", choices=["admin", "user"], default="user")
    sp.add_argument(
        "--no-force-change",
        action="store_true",
        help="首次登录不强制改密（默认强制）",
    )
    sp.set_defaults(func=cmd_create)

    sp = sub.add_parser("delete", help="删除用户（级联清空其数据）")
    sp.add_argument("ident", help="用户名或用户 id")
    sp.set_defaults(func=cmd_delete)

    sp = sub.add_parser("reset-password", help="重置用户密码")
    sp.add_argument("ident")
    sp.add_argument(
        "--no-force-change",
        action="store_true",
        help="重置后不强制改密（默认强制）",
    )
    sp.set_defaults(func=cmd_reset_password)

    sp = sub.add_parser("set-role", help="修改用户角色")
    sp.add_argument("ident")
    sp.add_argument("role", choices=["admin", "user"])
    sp.set_defaults(func=cmd_set_role)

    sp = sub.add_parser("activate", help="启用用户")
    sp.add_argument("ident")
    sp.set_defaults(func=cmd_activate)

    sp = sub.add_parser("deactivate", help="停用用户")
    sp.add_argument("ident")
    sp.set_defaults(func=cmd_deactivate)

    sp = sub.add_parser("set-key", help="设置用户 SteamDT API Key（加密存 DB）")
    sp.add_argument("ident")
    sp.set_defaults(func=cmd_set_key)

    sp = sub.add_parser("clear-key", help="清除用户 SteamDT API Key")
    sp.add_argument("ident")
    sp.set_defaults(func=cmd_clear_key)

    return p


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
