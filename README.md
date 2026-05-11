# CS2 饰品价格监控 Web 仪表盘 (cs-monitor · fork 定制版)

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Vue 3](https://img.shields.io/badge/vue-3-4FC08D.svg)](https://vuejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 本仓库 fork 自上游 [`Pgooone/cs-monitor`](https://github.com/Pgooone/cs-monitor)，已在 `feature/bargain-radar` 分支落地以下定制：
> - **多用户认证 + 数据隔离**：用户独立 watchlist / 告警 / 极致追踪；个人 SteamDT API Key 经 Fernet 加密存 DB
> - **跨市差价**：从国内三方平台（BUFF / YYYP / IGXE / C5GAME）低价买入、Steam 社区市场高价卖出的跨市价差扫描器
>
> 上游 `main` 分支仅用于同步上游代码；所有定制改动落在 `feature/bargain-radar`（GitHub 默认分支）。

一个轻量级、可自托管的 **CS2 饰品价格监控平台**，基于 [SteamDT](https://doc.steamdt.com/) 开放平台 API。Web 仪表盘里完成所有监控操作：登录账号、查看价格、管理清单、分析趋势、接收告警、扫描跨市差价机会。

> 开发规范见 [`CLAUDE.md`](CLAUDE.md)。

---

## 核心功能

### 1. 多用户认证与数据隔离
- **JWT 登录**：bcrypt 哈希密码（rounds=12）+ HS256 访问令牌，强制首次登录改密
- **每用户独立 SteamDT Key**：用户在 Web 端填入个人 Key，经 `cryptography.Fernet` 对称加密存 DB；调度器循环时按用户解密、各自跑各自的采集
- **业务数据按 `user_id` 隔离**：watchlist / 告警 / 极致追踪 / 跨市差价配置和机会列表跨用户互不可见
- **管理员后台**：用户增删改、重置密码、启停账号
- **CLI 兜底**：`scripts/manage_users.py` 提供 list / create / reset-password / set-key 命令，用于初始 bootstrap 或忘密恢复

### 2. Web 仪表盘
登录后即可在 `http://localhost:8080` 完成所有操作：
- **Dashboard 首页**：终端概览大卡片、Sparkline 走势、24h 波动热度、API 配额、实时统计
- **饰品搜索**：本地 39,000+ 饰品数据库，中英文/无分隔符匹配（输入 `ak47` 命中 AK-47），含实时价格查询
- **监控清单**：玻璃拟态卡片视图、Sparkline 迷你图、平台比价、饰品图片、24h 涨跌、阈值编辑
- **饰品详情**：ECharts K 线 (OHLC + MA 均线)、多平台价差、历史告警关联
- **极致追踪**：雷达强度进度条 + shimmer 动画、毫秒级快照、卡片网格布局
- **跨市差价**：扫描参数表单 + 机会列表表格 + 一键扫描 / 忽略 / 分页过滤
- **告警历史**：极客表格、类型标签（红涨/绿跌/琥珀量）、按天统计
- **数据分析**：跨市套利汇总占位（建设中）
- **个人中心**：改密、绑定 / 更新 SteamDT API Key
- **用户管理（仅 admin）**：增删改用户、重置密码、启停账号
- **设计系统**：深黑底 + Indigo 品牌紫 (#6366f1) + 玻璃拟态；完整 light / dark 主题适配；`Cmd/Ctrl + K` 全局搜索

### 3. 普通监控模式
按设定间隔（默认 30 分钟）批量巡检所有用户的 watchlist，与**前一交易日 K 线收盘价**对比检测波动：
- 涨幅 ≥ 阈值% → `price_surge` 涨价告警
- 跌幅 ≤ -阈值% → `price_drop` 跌价告警
- 同一饰品同一方向 **4 小时内仅告警 1 次**（冷却机制，每用户独立）
- 启动时自动重算全部历史告警的基准价，让基准与最新 K 线对齐

### 4. 极致追踪模式
单品高频狙击，自定义秒级轮询追踪指定平台的**价格**和**在售数量**：
- 支持 `any`（任何变动）和 `percent`（超百分比）双模式
- 429 限流时**自动降频**（间隔翻倍，最大 1 小时），连续成功 10 次后逐步恢复
- 支持**免打扰时段** (`quiet_hours`) 和**自定义冷却期**
- 价格 & 数量同时变动 → 合并为一条通知（带量价方向智能提示）

### 5. 跨市差价（低买高卖扫描）
基于本地 `price_records`（SteamDT batch 已采集的各平台最新价）做跨平台价差扫描，**不消耗额外 SteamDT 配额**：
- 默认买入方：BUFF / YYYP / IGXE / C5GAME（国内三方）
- 默认卖出方：STEAM（社区市场）
- 用户可自定义白名单覆盖默认，做反向或任意方向套利
- 阈值控制：最小毛利率 / 最小毛利金额 / 买入价区间 / 告警冷却
- 命中后通过当前通知渠道推送（注意 Steam 15% 税需自行折算）
- 每用户独立配置 + 独立机会列表

### 6. 多渠道通知
- 企业微信机器人 Webhook
- **Telegram Bot**（支持代理访问，中国大陆可用）
- Server 酱

> Telegram 在中国大陆使用需要代理：`.env` 中配置 `TELEGRAM_PROXY=http://127.0.0.1:7890`。

### 7. SQLite 持久化（多用户 schema v3）
- 全局表（市场公共数据）：`items` / `items_fts` / `price_records` / `archived_prices` / `system_config`
- 用户隔离表：`users` / `watchlist` / `extreme_track_config` / `alert_logs` / `extreme_track_snapshots` / `extreme_track_alerts` / `bargain_scan_config` / `bargain_opportunities`
- WAL 模式、外键级联删除（删用户即清掉其所有数据）
- 90 天以上原始价格按天聚合归档到 `archived_prices`

---

## 项目架构

```
cs-monitor/
├── main.py                       # 主程序入口（调度器 + FastAPI Web 服务）
├── config.py                     # 配置类（dataclass + dotenv）
├── pyproject.toml                # Python 项目元数据 + 依赖（uv 管理）
├── uv.lock                       # 锁定的依赖版本（提交到 git）
├── .env.example                  # 环境变量模板
├── CLAUDE.md                     # fork 定制开发指南
├── CHANGELOG.md                  # 改动日志（按阶段）
├── scripts/
│   └── manage_users.py           # 用户管理 CLI
├── api/
│   ├── steamdt.py                # SteamDT API 封装（重试 / 节流 / 异常分层）
│   └── steam_images.py           # Steam 饰品图标抓取
├── core/
│   ├── monitor.py                # 普通监控：价格采集
│   ├── analyzer.py               # 波动分析（前日 K 线收盘价基准）+ 告警
│   ├── scheduler.py              # APScheduler 多用户调度器
│   ├── extreme_tracker.py        # 极致追踪：高频单品狙击
│   ├── trend_analyzer.py         # 趋势分析（MA5/10/20 + surge/drop/oscillate）
│   └── bargain_scanner.py        # 跨市差价：跨平台低买高卖扫描
├── web/                          # FastAPI Web 层
│   ├── app.py                    # 应用入口（CORS / 静态前端 SPA fallback）
│   ├── deps.py                   # 认证 / DB / 配置依赖注入
│   ├── schemas.py                # Pydantic 模型
│   └── routers/
│       ├── auth.py               # 登录 / 改密 / SteamDT Key 绑定
│       ├── users.py              # 用户管理（admin）
│       ├── dashboard.py          # Dashboard 概览
│       ├── watchlist.py          # 监控清单 CRUD + 手动刷新
│       ├── alerts.py             # 告警列表 / 统计
│       ├── prices.py             # 价格查询 / 本地搜索
│       ├── extreme_track.py      # 极致追踪配置 / 快照 / 告警
│       ├── bargain.py            # 跨市差价配置 / 机会 / 扫描
│       ├── kline.py              # K 线 / 套利 / 趋势
│       ├── settings.py           # 通知配置 / DB 导出
│       └── archive.py            # 历史价格归档
├── frontend/                     # Vue 3 前端（bun 管理）
│   ├── package.json
│   ├── bun.lock
│   ├── vite.config.ts
│   └── src/
│       ├── views/                # Login/ChangePassword/Dashboard/Watchlist/
│       │                         # ExtremeTrack/Bargain/Alerts/ItemDetail/
│       │                         # StatsView/Settings/UserCenter/Users
│       ├── components/           # base / layout / business 三层
│       ├── stores/               # Pinia（auth / theme / ...）
│       ├── router/               # 路由守卫（认证 / 强制改密 / admin）
│       ├── styles/               # tokens / theme / global.css
│       └── api/                  # axios 封装 + 401/403 拦截器
├── notify/
│   ├── base.py                   # 通知渠道抽象基类
│   ├── manager.py                # 通知管理器（普通 / 极致追踪 / 跨市差价）
│   ├── wecom.py                  # 企业微信机器人
│   ├── telegram.py               # Telegram Bot
│   └── serverchan.py             # Server 酱
├── storage/
│   ├── models.py                 # 数据库表结构（schema v3）+ ALL_TABLES
│   └── database.py               # SQLite 连接 + CRUD（按 user_id 隔离）
├── utils/
│   ├── logger.py                 # loguru 日志配置
│   └── security.py               # bcrypt / Fernet / JWT 封装
├── data/
│   ├── prices.db                 # SQLite（运行时生成，多用户 schema v3）
│   └── logs/                     # 日志文件输出目录
└── tests/                        # 132 个测试
    ├── test_api.py
    ├── test_monitor.py
    ├── test_analyzer.py
    ├── test_extreme_tracker.py
    ├── test_trend_analyzer.py
    ├── test_notify.py
    ├── test_storage.py
    ├── test_bargain.py           # 跨市差价 DB + Scanner + API
    └── test_web_api.py           # 完整 Web API + 多用户隔离
```

---

## 快速开始

### 1. 环境准备

需要 **Python 3.12+** 和 **Node.js 18+ / Bun 1.x**。

```bash
cd cs-monitor
./init.sh
```

`init.sh` 调用 `uv sync` 安装 Python 依赖（按 `pyproject.toml` + `uv.lock`），通过 `bun install` 安装前端依赖（按 `bun.lock`）。前置工具：

- [uv](https://docs.astral.sh/uv/)：`brew install uv` 或 `curl -LsSf https://astral.sh/uv/install.sh | sh`
- [bun](https://bun.sh/)：`brew install oven-sh/bun/bun` 或 `curl -fsSL https://bun.sh/install | bash`

### 2. 配置环境变量

```bash
cp .env.example .env
```

**必填三件套（多用户认证）**：

```bash
# Fernet 主密钥：加密用户 SteamDT API Key（一旦设定不可更改）
# 生成：uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
MASTER_ENCRYPTION_KEY=

# JWT 签名密钥
# 生成：uv run python -c "import secrets; print(secrets.token_urlsafe(64))"
JWT_SECRET_KEY=

# Admin 首次启动初始密码（登录后强制改密；改密后此变量失效）
ADMIN_INITIAL_PASSWORD=
```

**可选**：

- `STEAMDT_API_KEY`：系统级 Key，仅用于全市场任务（items 同步、归档基准价重算）；用户级 Key 在 Web 端绑定，互不冲突
- 通知渠道至少配置一种：`WECOM_WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID` / `SERVERCHAN_SENDKEY`

### 3. 运行主程序

推荐用一键脚本（自带依赖同步、前端构建、.env 必填项校验）：

```bash
# 生产模式：构建前端 + 启动后端（http://localhost:8080）
./scripts/run.sh

# 开发模式：后端 + Vite dev 并行（前端 http://localhost:5173 带热更新）
./scripts/dev.sh
```

也可以手动启动：

```bash
# 首次或前端代码更新后构建一次
cd frontend && bun run build && cd ..

# 启动后端 + 静态托管前端
uv run python main.py
```

启动流程：
1. 自动建表 (`schema_version=3`)；若检测到旧版单租户 schema 会**自动备份**到 `data/legacy_<ts>/` 后清空重建
2. 自动创建 `admin` 用户，密码取自 `ADMIN_INITIAL_PASSWORD`，标记为「首次登录强制改密」
3. 后台调度器启动：监控 / 极致追踪 / 跨市差价 / 价格归档 / 全市场饰品同步
4. FastAPI 服务在 `http://localhost:8080` 启动

打开浏览器访问 `http://localhost:8080` → 用 `admin` + `ADMIN_INITIAL_PASSWORD` 登录 → 改密 → 进入个人中心绑定 SteamDT API Key → 调度器下一轮就会用你的 Key 开始采集。

按 `Ctrl+C` 优雅退出。

### 4. 用户管理 CLI

需要在 Web 之外操作（比如忘密重置、批量初始化）：

```bash
# 列出所有用户
uv run python scripts/manage_users.py list

# 创建用户（交互输入密码）
uv run python scripts/manage_users.py create alice --role user

# 重置某用户密码
uv run python scripts/manage_users.py reset-password alice

# 为某用户设置 SteamDT API Key（getpass 输入，自动 Fernet 加密）
uv run python scripts/manage_users.py set-key alice
```

### 5. Docker 一键部署

```bash
# 1. 配置 .env（必填项与上文一致）
cp .env.example .env

# 2. 构建并启动
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f

# 4. 访问
open http://localhost:8080
```

**数据持久化**：`docker-compose.yml` 已将 `./data` 挂载到容器，SQLite 与日志不随容器销毁。
**健康检查**：每 30 秒探测 `/api/health`，连续 3 次失败自动重启。
**停止**：`docker-compose down`。

### 6. 测试与检查

```bash
# Python 后端：132 个测试
uv run pytest tests/

# Lint
uv run ruff check .

# 字节码编译（语法检查）
uv run python -m py_compile main.py config.py api/*.py core/*.py notify/*.py storage/*.py utils/*.py web/*.py web/routers/*.py

# 前端类型检查 + 构建
cd frontend && bunx vue-tsc --noEmit && bun run build
```

---

## 配置说明

监控清单 / 极致追踪配置 / 跨市差价配置全部存 DB，按用户隔离，通过 Web 仪表盘或 CLI 维护，**不需要修改 `config.py`**。

`config.py` 中的默认值（`watchlist` / `extreme_track_list`）仅在主程序逻辑中用作占位，多用户改造后实际不再自动导入到 DB——每个用户登录后在自己的 Watchlist 页面添加监控项即可。

---

## 改造指引

继续在此基础上开发可以从以下方向入手：

1. **更多通知渠道**：钉钉、Discord、Bark 等（新增 `notify/*.py` + 在 `NotificationManager._create_channel` 注册即可）
2. **机会回测**：把 `bargain_opportunities` 历史数据接入回测视图，统计实际命中后的收益曲线
3. **桌面端打包**：Tauri 2.x 封装为 Windows/macOS/Linux 原生应用
4. **数据归档优化**：更细的归档颗粒度（小时 / 平台）

> 已完成：多用户认证 + 数据隔离、跨市差价跨市扫描、K 线趋势分析、Docker 部署、数据归档、玻璃拟态设计系统、本地饰品搜索 (39K+)、饰品图片自动获取、上游同步分支策略。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端语言 | Python 3.12+ | 类型提示、dataclass |
| Web 框架 | FastAPI | 异步、OpenAPI 文档 |
| HTTP 客户端 | httpx | 同步请求 + 重试 |
| 调度 | APScheduler | BackgroundScheduler 多用户循环 |
| 数据库 | SQLite (WAL, schema v3) | 零配置、并发读写、按 `user_id` 隔离 |
| 认证 | bcrypt + pyjwt | rounds=12 / HS256 |
| 加密 | cryptography.Fernet | 用户 SteamDT API Key 对称加密存 DB |
| 前端框架 | Vue 3 + Vite + TypeScript | Composition API + `<script setup>` |
| 包管理 | uv (Python) / bun (前端) | 统一锁文件 |
| UI 组件库 | Naive UI | 中文文档完善 |
| 图标 | lucide-vue-next | 与设计参考一致 |
| 图表 | ECharts 5 | 按需引入（避免 `import *`） |
| 状态 | Pinia | 轻量 |
| CSS | UnoCSS + tokens.ts | 原子化 + 设计令牌 |
| 日志 | loguru | 彩色控制台 + 文件 |
| 测试 | pytest + TestClient | 132 个用例 / 0 警告 |

---

## 开发规范

详见 [`CLAUDE.md`](CLAUDE.md)：

- **分支策略**：`main` 同步上游，`feature/bargain-radar` 为定制主线
- **包管理**：统一走 `uv`（Python）与 `bun`（前端），不要回退 pip / npm
- **多用户安全**：bcrypt 密码哈希 + Fernet 加密用户敏感凭据 + JWT 访问令牌；按 `user_id` 隔离的查询/写入**必须**带 `user_id` 过滤
- **DB schema 改动**：变更 `storage/models.py` 后必须升 `SCHEMA_VERSION`，验证旧库自动备份重建路径
- **测试隔离**：测试用 `tempfile` 临时 DB，不准写入仓库 `data/prices.db`
- **提交规范**：Conventional Commits 风格中文；一个 commit 一个语义单元

---

## License

MIT License - 可自由修改和商用。
