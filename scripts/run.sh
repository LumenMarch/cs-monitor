#!/usr/bin/env bash
# =============================================================================
# scripts/run.sh - 本地生产模式一键启动
# =============================================================================
# 流程：依赖同步 → 前端构建 → 后端单进程（静态托管前端）
# 访问：http://localhost:8080（端口受 .env 中 WEB_PORT 控制）
# Ctrl+C 优雅退出.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

err()  { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
info() { echo -e "${GREEN}→ $*${NC}"; }
warn() { echo -e "${YELLOW}! $*${NC}"; }

# ---------- 工具链检查 ----------
command -v uv  >/dev/null 2>&1 || err "uv 未安装：curl -LsSf https://astral.sh/uv/install.sh | sh"
command -v bun >/dev/null 2>&1 || err "bun 未安装：curl -fsSL https://bun.sh/install | bash"

# ---------- .env 校验 ----------
[ -f .env ] || err ".env 不存在，请先：cp .env.example .env 并填写必填项"

read_env() {
    # 从 .env 读取某个变量值（兼容值中含 = 的情况，去掉前后引号）
    local key="$1"
    local line value
    line=$(grep -E "^${key}=" .env | head -1 || true)
    [ -z "$line" ] && { echo ""; return; }
    value="${line#${key}=}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    echo "$value"
}

for var in MASTER_ENCRYPTION_KEY JWT_SECRET_KEY; do
    val=$(read_env "$var")
    [ -n "$val" ] || err ".env 缺少必填项 $var（生成方法见 .env.example 顶部注释或 README）"
done

ADMIN_PWD=$(read_env ADMIN_INITIAL_PASSWORD)
if [ -z "$ADMIN_PWD" ]; then
    warn "ADMIN_INITIAL_PASSWORD 未设置；若数据库中尚无 admin 用户，启动会失败"
fi

# ---------- Python 依赖 ----------
info "同步 Python 依赖（uv sync）"
uv sync --quiet

# ---------- 前端依赖 ----------
if [ ! -d frontend/node_modules ]; then
    info "安装前端依赖（bun install）"
    (cd frontend && bun install)
fi

# ---------- 前端构建 ----------
info "构建前端到 frontend/dist（bun run build）"
(cd frontend && bun run build > /dev/null)

# ---------- 启动后端 ----------
PORT=$(read_env WEB_PORT); PORT="${PORT:-8080}"
echo "──────────────────────────────────────────"
echo -e "  ${GREEN}后端 + 静态前端${NC}: http://localhost:${PORT}"
echo "  Ctrl+C 优雅退出"
echo "──────────────────────────────────────────"
exec uv run python main.py
