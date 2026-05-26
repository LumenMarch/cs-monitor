#!/usr/bin/env bash
# =============================================================================
# scripts/dev.sh - 本地开发模式（前后端并行）
# =============================================================================
# 流程：依赖同步 → 后端 uvicorn + Vite dev 并行启动
# 访问：
#   - 后端 API:  http://localhost:8080
#   - 前端 UI:   http://localhost:5173  ← 开发时用这个，自带热更新
# 任一进程退出或 Ctrl+C 时同步停止另一进程.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

err()  { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
info() { echo -e "${GREEN}→ $*${NC}"; }
warn() { echo -e "${YELLOW}! $*${NC}"; }

# ---------- 工具链 ----------
command -v uv  >/dev/null 2>&1 || err "uv 未安装"
command -v npm >/dev/null 2>&1 || err "npm 未安装"

# ---------- .env 校验 ----------
[ -f .env ] || err ".env 不存在，请先：cp .env.example .env 并填写必填项"

read_env() {
    local key="$1" line value
    line=$(grep -E "^${key}=" .env | head -1 || true)
    [ -z "$line" ] && { echo ""; return; }
    value="${line#${key}=}"
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    echo "$value"
}

for var in MASTER_ENCRYPTION_KEY JWT_SECRET_KEY; do
    val=$(read_env "$var")
    [ -n "$val" ] || err ".env 缺少必填项 $var"
done

ADMIN_PWD=$(read_env ADMIN_INITIAL_PASSWORD)
[ -n "$ADMIN_PWD" ] || warn "ADMIN_INITIAL_PASSWORD 未设置；若 DB 中尚无 admin 用户启动会失败"

# ---------- 依赖同步 ----------
info "同步 Python 依赖（uv sync）"
uv sync --quiet

if [ ! -d frontend/node_modules ]; then
    info "安装前端依赖（npm install）"
    (cd frontend && npm install)
fi

# ---------- 子进程管理 ----------
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    info "停止开发服务器..."
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # 给 3 秒优雅退出，再 SIGKILL 兜底
    local i=0
    while [ $i -lt 30 ]; do
        local alive=0
        [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null && alive=1
        [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null && alive=1
        [ $alive -eq 0 ] && break
        sleep 0.1
        i=$((i + 1))
    done
    [ -n "$BACKEND_PID" ] && kill -9 "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill -9 "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}✓ 已退出${NC}"
}
trap cleanup EXIT INT TERM

# ---------- 启动 ----------
info "启动后端（uv run python main.py）"
uv run python main.py &
BACKEND_PID=$!

info "启动前端 Vite dev（npm run dev）"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "──────────────────────────────────────────"
echo -e "  ${CYAN}后端 API${NC}:  http://localhost:8080"
echo -e "  ${MAGENTA}前端 UI${NC}:   http://localhost:5173  ← 开发用这个（带热更新）"
echo "  Ctrl+C 同时停止两个进程"
echo "──────────────────────────────────────────"

# 任一子进程退出就触发清理（trap 会执行）
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done

# 提示具体是哪个进程先挂了
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    warn "后端进程已退出"
fi
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    warn "前端进程已退出"
fi
