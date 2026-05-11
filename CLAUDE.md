# CS2 饰品监控 · fork 定制开发指南

## Project Context

基于 Python 3.12+ / FastAPI / Vue 3 的 CS2 饰品价格监控平台，使用 SteamDT API、APScheduler、SQLite 和 loguru。提供 Web 仪表盘。

本仓库是 **fork 自上游 `Pgooone/cs-monitor`** 的定制版本，当前主线工作：
- **多用户认证 + 数据隔离**：用户独立 watchlist / 告警 / 极致追踪 / 个人 SteamDT API Key（Fernet 加密存 DB）
- **捡漏雷达**：跨平台价差扫描功能（待集成）



---

## 分支策略

| 分支 | 用途 |
|---|---|
| `main` | **仅用于同步 fork 上游代码**，不在 main 上直接做定制 |
| `feature/bargain-radar` | 定制主线分支（GitHub 默认分支），所有改动走这里 |

同步上游流程：
```bash
git checkout main && git pull upstream main && git push origin main
git checkout feature/bargain-radar && git rebase main # 或 merge，视冲突量决定
```

---

## 环境与命令

```bash
# 首次初始化（uv sync + 前端 bun install）
./init.sh

# Python 依赖管理（统一走 uv）
uv sync # 同步 .venv 到 uv.lock
uv add <pkg> # 加运行时依赖
uv add --dev <pkg> # 加开发依赖
uv lock --upgrade # 升级所有锁定版本

# 运行主程序（scheduler + FastAPI on :8080）
uv run python main.py

# 后端测试与检查
uv run pytest tests/
uv run python -m py_compile main.py config.py api/*.py core/*.py notify/*.py storage/*.py utils/*.py web/*.py web/routers/*.py
uv run ruff check .
uv run mypy main.py config.py api/ core/ notify/ storage/ utils/ web/

# 用户管理 CLI（多用户改造后新增）
uv run python scripts/manage_users.py list
uv run python scripts/manage_users.py create <username> --role <admin|user>
uv run python scripts/manage_users.py reset-password <username>
uv run python scripts/manage_users.py set-key <username> # 设置 SteamDT API Key（getpass 输入）

# 前端（bun）
cd frontend && bun install                # 同步 node_modules 到 bun.lock
cd frontend && bun add <pkg>              # 加依赖
cd frontend && bun add -d <pkg>           # 加 dev 依赖
cd frontend && bun run dev                # http://localhost:5173
cd frontend && bun run build              # 输出到 frontend/dist
cd frontend && bunx vue-tsc --noEmit      # TypeScript 严格检查
cd frontend && bun run lint
```

---

## Coding Conventions

### Python（Backend）
- Python 3.12+ with type hints
- HTTP 用 `httpx`（不用 `requests`）
- 日志用 `loguru`（不用标准 `logging`）
- 配置/数据模型用 `dataclass`；API I/O 模型用 Pydantic v2
- 路径用 `pathlib`，不用 `os.path`
- 函数尽量保持 < 50 行；公开方法写 docstring
- `async`/`await` 仅在确有收益时使用

### 多用户安全（v2 schema）
- 密码用 `bcrypt`（`BCRYPT_ROUNDS = 12`）；不要存明文，不要自己写哈希
- 用户敏感凭据（如 SteamDT API Key）用 `cryptography.Fernet` 对称加密后存 DB；明文仅在 API 调用瞬间出现
- JWT 用 `pyjwt` HS256；签发/解码必须经过 `utils/security.py` 封装
- DB 中受隔离的表（`watchlist` / `extreme_track_config` / `alert_logs` / `extreme_track_*`）的所有查询/写入**必须**带 `user_id` 过滤
- 全局表（`items` / `price_records` / `archived_prices` / `system_config`）不带 `user_id`

### TypeScript/Vue（Frontend）
- Vue 3 Composition API + `<script setup>` + TS strict
- 状态用 Pinia，UI 用 Naive UI，原子样式用 UnoCSS
- ECharts 必须按需引入（`echarts/core` + `echarts/charts` + `echarts/components`，禁止 `import * as echarts`）
- API 调用集中于 `frontend/src/api/index.ts`
- 所有颜色 / 间距 / 圆角 / 阴影必须来自 `styles/tokens.ts`，禁止硬编码
- 同时支持 light/dark 主题（`useTheme` composable）
- 涨跌色通过 `tokens.colorUp / colorDown`，支持中国/国际习惯切换
- 数字（价格、百分比）用 `JetBrains Mono` 等宽
- 组件分层（不混放）：
 - `components/base/`：纯展示组件
 - `components/layout/`：布局组件
 - `components/business/`：业务组件
- 列表/表格/图表首次加载必有骨架屏，数据到位淡入切换（200ms）
- 动效克制：240ms 页面淡入+上移 4px / 100ms 数字高亮；无意义大动画禁止
- 无障碍：图标按钮必须有 `aria-label`；表单必须 `label-for`；焦点环可见
- 国际化：用户可见字符串走 `vue-i18n $t`

---

## Testing Guidelines

**MUST**：
- 改动 `utils/security.py` / `storage/database.py` / `core/*` / `notify/*` / `api/steamdt.py` → 必须跑 `uv run pytest tests/` 通过
- 改动 `web/` → `uv run python -m py_compile` + `TestClient` 端到端覆盖（参考 [`tests/test_web_api.py`](tests/test_web_api.py)）
- 测试中不得真调外部 API（mock 掉 `httpx`、SteamDT、Steam 社区市场等）
- 不得在测试里写真实仓库 `data/prices.db`（用 `tempfile` 或环境变量 `CS_MONITOR_DB`）

**前端 MUST**：
- `bun run build` 通过
- 同时跑过 light / dark 两种主题验证
- 移动端 (375px) / 桌面 (1024px+) / 大屏 (1440px+) 三档断点都试

**SteamDT API 文档**：实现 API 封装前必读 [`api/API_REFERENCE.md`](api/API_REFERENCE.md) 和 https://doc.steamdt.com/llms.txt。

---

## Key Rules

1. **fork 主线在 `feature/bargain-radar`**：定制改动不要直接落 main
2. **一个 commit 一个语义单元**：相关代码 + 文档更新（progress.txt / CLAUDE.md / README）一起提交；commit message 用 Conventional Commits 风格中文（参考既有 commit）
3. **不破坏既有 Web 功能**：业务改造（user_id 化、调度器多用户化）必须保持现有 Dashboard / 监控 / 极致追踪在迁移后仍能跑
4. **DB schema 改动**：`storage/models.py` 改 schema 后必须更新 `SCHEMA_VERSION` 并验证旧库自动备份重建（`Database._maybe_reset_legacy_schema`）路径
5. **SQLite WAL 模式**：所有新数据库连接保持 WAL 模式开启
6. **测试不写真实仓库 DB**：用 `tempfile` 隔离，否则会污染开发环境
7. **敏感字段**：API Key、密码哈希、JWT secret 不进日志、不进 commit、不进测试断言文本
8. **删除上游归档代码**：上游已 `archived/` 的内容不要复活，要复用就重写
9. **`.env` 与 `.env.example` 同步**：新增配置必须同步 `.env.example` 并在 README/进度日志中说明
10. **uv 是唯一 Python 包管理器**：不要回退到 pip 或手动管理 `.venv`；新增依赖一律 `uv add`
11. **bun 是唯一前端包管理器**：不要回退到 npm/yarn/pnpm；新增依赖一律 `bun add`（或 `bun add -d`），`bun.lock` 必须 commit
