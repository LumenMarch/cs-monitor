# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/) 规范，记录所有用户可感知的项目变更。

`[bargain-radar 分支]` 章节记录本仓库（fork 自 `Pgooone/cs-monitor`）在 `feature/bargain-radar` 分支上的定制改动，与上游版本号脱钩。

---

## [bargain-radar 分支] · 进行中

### Added — 第五阶段：测试重写（2026-05-11）

- `tests/test_storage.py` 重写：14 项（含 5 项新增跨用户隔离场景）
- `tests/test_monitor.py` 改造：4 项，fixture 加 user_id
- `tests/test_analyzer.py` 改造：11 项，mock 从旧 7day_average 切换到 get_item_kline 日 K，
  缓存字段从 `_avg_cache` 改为 `_baseline_cache`
- `tests/test_extreme_tracker.py` 改造：7 项，user_id 注入构造器与 DB 调用
- `tests/test_web_api.py` 整体重写：49 项，含真实登录流程、用户管理 CRUD、
  watchlist/alerts/extreme-track 跨用户隔离验证、admin-only 守卫
- `tests/test_trend_analyzer.py` 修复 fixture 日期硬编码（被 30 天窗口截断的上游 bug）：
  改用 `_recent_dates()` 相对今天生成
- `core/analyzer.py` 顺手修复 `datetime.utcnow()` 弃用警告

测试现状：**109 passed, 0 warnings**

### Changed — 前端包管理切换到 bun（2026-05-11）

- 删除 `frontend/package-lock.json`，改用 `frontend/bun.lock`（文本格式，bun 1.3+ 默认）
- `init.sh`：检测 `bun` 而非 `node`，`bun install` 替代 `npm install`
- `Dockerfile` Stage 1 镜像从 `node:20-slim` 切换为 `oven/bun:1`；`bun install --frozen-lockfile` + `bun run build`
- `CLAUDE.md` / `README.md` 所有 `npm` 命令更新为 `bun` / `bunx`
- 新增 Key Rule #11：**bun 是唯一前端包管理器**，新增依赖一律 `bun add`

### Added — 第四阶段：前端多用户 UI（2026-05-11）

**核心基础设施：**
- `frontend/src/api/index.ts`：
  - 加入 `getStoredToken / setStoredToken / clearStoredToken`（localStorage 持久化）
  - request 拦截器自动注入 `Authorization: Bearer <token>`
  - response 拦截器：401 → 清 token 跳 `/login?next=...`；403 + `X-Password-Change-Required` → 跳 `/change-password`
  - 新增 11 个 auth/users 接口方法（login / me / changePassword / setSteamdtKey / deleteSteamdtKey / listUsers / createUser / updateUser / resetUserPassword / deleteUser）
- `frontend/src/stores/auth.ts`：重写为真实多用户 store，暴露 `token / user / isLoggedIn / isAdmin / username / requiresPasswordChange / hasSteamdtKey` 等响应式状态
- `frontend/src/router/index.ts`：
  - 加入 `/login`、`/change-password`、`/user-center`、`/users`
  - 全局 `beforeEach` 守卫：未登录跳 Login、必改密拦截、admin-only 路由保护、已登录访问 /login 跳首页
- `frontend/src/main.ts`：启动时 `auth.initFromStorage()` 校验 token

**新建页面（4 个）：**
- `views/Login.vue`：登录页 + 错误提示 + `next` 参数返回
- `views/ChangePassword.vue`：改密页（强制改密时禁用取消按钮）
- `views/UserCenter.vue`：个人中心 = 账号信息 + SteamDT API Key 管理 + 改密
- `views/Users.vue`：管理员后台 = 用户列表 + 新建 / 切换角色 / 启停 / 重置密码 / 删除 + 防自损守卫

**布局集成：**
- `components/layout/SidebarContent.vue`：侧边栏菜单加"个人中心"、对 admin 加"用户管理"
- `components/layout/TopBar.vue`：右上角加用户头像 + 下拉菜单（个人中心 / 用户管理 / 退出登录）

构建验证：`npm run build` 通过，`vue-tsc --noEmit` 0 错误

### Added — 第三阶段：调度器多用户循环（2026-05-11）

- `core/monitor.py` `PriceMonitor` 接收 `user_id`，watchlist 采集按用户隔离
- `core/analyzer.py` `PriceAnalyzer` 接收 `user_id`，告警冷却 / 阈值查询 / 写入按 user_id；
  `recalculate_all_baselines` 改为系统级（按 alert.id 更新）
- `core/extreme_tracker.py` `ExtremeTracker` 接收 `user_id`，track_id 加 `u{id}::` 前缀
  避免跨用户串扰；snapshots / extreme_alerts 全部按 user_id 隔离
- `core/scheduler.py` 完全重写为多用户调度：
  - 每个 monitor / extreme_tracker tick 循环 `list_users_with_steamdt_key()`
  - 按用户解密其 SteamDT Key、临时创建 client、跑完立即 close
  - items 同步 / 启动基准价重算：系统级任务，优先 .env 系统 Key，无则借用任一用户 Key
- `main.py`：调度器始终启动（不再以系统级 Key 为前置条件）

### Added — 第二阶段：业务 router user_id 隔离（2026-05-11）

- `storage/database.py` 25+ DB 方法签名加 `user_id` 必填，所有受隔离表（watchlist /
  extreme_track_config / alert_logs / extreme_track_snapshots / extreme_track_alerts）
  的 CRUD 一律强制传入 `user_id`，删除已不再使用的 `import_default_watchlist` /
  `import_default_extreme_track`
- 8 个业务 routers 全部按当前登录用户隔离：watchlist / extreme_track / alerts /
  dashboard / prices / kline / archive / settings
- 关键端点支持"优先用用户 SteamDT API Key、回退系统级 Key"：
  `/api/watchlist/refresh`、`/api/prices/lookup`、`/api/kline/{name}`
- 通知设置 / 数据库导出与清空 / 归档触发全部改为 `require_admin`
- `web/deps.require_password_changed` 全面接入业务路由（首次登录未改密拦截）

### Added — 第一阶段：uv 迁移 + 多用户认证骨架（2026-05-11，commit 89ee00c）

**工程基础设施**
- 切换到 uv 管理 Python 依赖（`pyproject.toml` + `uv.lock` 取代 `requirements.txt`）
- 重写 `init.sh` 与 `Dockerfile` 使用 uv

**多用户认证骨架（schema v2）**
- `utils/security.py`：bcrypt 密码哈希 + Fernet 对称加密 + JWT 三件套
- `storage/models.py` 重构：新增 `users` 表；隔离表加 `user_id NOT NULL + ON DELETE CASCADE`；全局市场数据保持共享
- 启动时检测旧单租户 schema 自动备份 `.db` 到 `data/legacy_<ts>/` 后清空重建
- 真实 `/api/auth/login | me | change-password | steamdt-key`（取代上游单租户 stub）
- `/api/users/*` 管理员 CRUD（含最后 admin 保护、不能删自己等防御）
- `main.py` 启动自动建 admin（按 `ADMIN_INITIAL_PASSWORD`）+ 首登强制改密
- `scripts/manage_users.py` 离线 CLI 工具

**配置变更（必须更新 .env）**
- 新增必填项：`MASTER_ENCRYPTION_KEY` / `JWT_SECRET_KEY` / `ADMIN_INITIAL_PASSWORD`
- 移除：`ADMIN_PASSWORD` / `JWT_SECRET` / `JWT_EXPIRY_HOURS`
- `STEAMDT_API_KEY` 降级为可选系统级 Key（用户在 Web 端各自配置自己的 Key）

### Removed
- `archived/` 目录（上游归档的 Agent 开发资料与 WebSocket 旧代码）
- `docs/` 目录（上游某次 bug 审查记录）
- GitHub 仓库的 Projects 功能（issues / wiki / discussions / projects 全部关闭）

### Pending
- 业务 routers（watchlist / extreme_track / alerts / dashboard / kline / prices / archive / settings）的 `user_id` 隔离改造
- 调度器多用户化（循环每个有 SteamDT Key 的用户）
- 前端：登录页 / 强制改密页 / 用户中心 / admin 管理后台
- 捡漏雷达功能集成（跨平台价差扫描）

---

## 上游历史（< fork 时间点）

下面记录 fork 时刻（2026-05-11）从上游继承的版本历史。本仓库不再向这些段追加内容。

---

## [3.0.0] — 2026-04-28

大型 UI 重构，项目从"Trading Terminal Pro"全面升级为"极客终端"视觉风格，对齐 [Gemini 设计的 React 参考项目](https://github.com/Pgooone/cs-)。

### Added
- **饰品图片功能**：通过 Steam 社区市场 API 自动获取饰品图标，前端新增 `SteamItemImage` 组件展示，支持加载失败时 emoji fallback
- **数据分析页面 (StatsView)**：全新占位页，扫描线动画和 LineChart 图标，为后续市场趋势分析功能预留入口
- `GET /items/{name}/icon` API 端点：查询单个饰品图标
- `POST /items/icons/sync` API 端点：批量同步所有监控项饰品图标
- 数据库 `items` 表新增 `icon_url` 列
- 支持 `TELEGRAM_PROXY` 环境变量代理访问 Steam 社区 API

### Changed
- **设计系统全面重写**：配色从"深空蓝 + 电光橙"切换为"极客黑 + Indigo 品牌紫 (#6366f1)"；背景 #050505，卡片 #0f0f12，边框 #1f1f23
- **玻璃拟态系统**：新增 `.glass-card`、`.btn-primary`、`.btn-outline`、`.nav-item`、`.nav-item-active` 等 CSS 类，全局 shimmer 扫光动画
- **Dashboard 页面重构**：改为"终端概览"布局，大卡片 + 柱状图动画 + 核心功能快捷按钮 + API 生命周期状态
- **Watchlist 页面重构**：纯卡片视图（去除表格/双视图切换），glass-card + 悬停动画 + Sparkline 迷你走势 + 平台价格标签
- **ExtremeTrack 页面重构**：雷达强度进度条 + shimmer 动画 + 内存快照实时数据 + 品牌色光效
- **Alerts 页面重构**：极客表格风格，红涨/绿跌/琥珀量类型标签；去除 Tab 切换、筛选器、柱状图、详情抽屉
- **Settings 页面重构**：三段式纵向布局（去除左侧子导航），紫色圆形开关滑块，通知渠道状态灯
- **Sidebar 重构**：响应式宽度（小屏仅图标 w-20，大屏展开 w-64），Logo + lucide-vue-next 图标 + API 状态灯
- **TopBar 重构**：上下文感知，根据当前路由动态切换标题/搜索框/操作按钮
- **AppLayout 重构**：背景装饰光晕效果 + 页面切换动画（300ms 淡入 + 上移）
- **图标库迁移**：`@vicons/ionicons5` → `lucide-vue-next`，与 React 参考项目图标系统保持一致
- **深色模式增强**：完整 light / dark 浅色主题适配

### Fixed
- ItemDetail 页面 trends 请求独立容错，避免一个趋势 API 失败导致整页崩溃
- Alerts 查询 SQL 列名歧义修复：LEFT JOIN 后 `market_hash_name` 未限定表别名导致 500 错误

### Removed
- Naive UI 的 `NMenu`、`NLayoutSider` 等布局组件，改为纯 HTML + CSS 实现
- Watchlist 表格视图（双视图切换入口）
- Alerts 页面的 Tab 切换、筛选器、柱状图、详情抽屉
- Settings 页面左侧子导航
- `@vicons/ionicons5` 图标库

---

## [2.1.0] — 2026-04-26

前端视觉升级与功能完善。

### Added
- **Trading Terminal Pro 设计系统**：深空蓝 + 电光橙配色（参考 BUFF.163.com 专业交易平台风格），CSS 变量驱动的主题切换
- **Watchlist BUFF 风格卡片视图**：饰品卡片布局、Sparkline 迷你走势图、平台价格对比
- **Dashboard 饰品搜索框**：支持在首页直接搜索和查看价格
- **Telegram Bot 通知渠道**：支持通过 HTTP 代理访问（中国大陆可用）
- **通知测试功能**：设置页可直接测试各渠道通知推送
- **创建/刷新端点**：`POST /refresh` API，前端刷新按钮，支持手动触发数据采集

### Changed
- 后端移除 JWT 认证，API 全部对外开放（无需登录即可使用 Web 仪表盘）
- WebSocket 实时推送改为轮询机制（解决 403 问题）
- 前端展示优先使用中文名称（`display_name`）
- 配置项 `WECOM_WEBHOOK_URL` 拆分为 `WECOM_WEBHOOK_MONITOR_URL` 和 `WECOM_WEBHOOK_EXTREME_URL`

### Fixed
- Dashboard 今日采集次数显示为 0
- Watchlist 重复行、告警零价、Settings 500 三个 P1 级 Bug
- 搜索结果排序优化（武器优先于贴纸）+ 无分隔符匹配（`ak47` → AK-47）
- 极致追踪平台名称大小写不敏感比较

---

## [2.0.0] — 2026-04-24

Web 仪表盘从零到一，项目从纯 CLI 工具进化为完整的 Web 应用。

### Added
- **FastAPI Web 服务**：RESTful API（价格、监控清单、告警、极致追踪、K 线、趋势、搜索）
- **Vue 3 前端 SPA**：Vite + TypeScript + Naive UI + ECharts
- **Dashboard 首页**：KPI 统计卡片 + 组合价值曲线 + 实时告警流 + 热度榜 + 采集状态
- **监控清单管理页**：表格式管理，支持添加/删除/编辑监控项
- **饰品详情页**：ECharts K 线图（OHLC + MA 均线 + 成交量），平台多维度对比
- **极致追踪管理页**：卡片网格、极值进度条、运行状态徽章、实时面板
- **告警历史页**：卡片化展示、日期分组、详情抽屉
- **系统设置页**：通知配置、数据目录管理、主题切换
- **WebSocket 实时推送**：告警和极致追踪数据实时推送
- **全量饰品搜索**：本地 39,000+ 饰品数据库，中英文模糊匹配
- **Docker 一键部署**：`docker-compose up -d`，内置健康检查
- **数据归档功能**：历史价格自动归档清理
- **JWT 用户认证**：登录保护
- SQLite WAL 模式：支持并发读写

### Changed
- 监控清单从 `config.py` 迁移到 SQLite 数据库，可通过 API 动态管理
- 极致追踪配置持久化到数据库

---

## [1.0.0] — 2026-04-22

首个正式版本，CLI 后台监控核心功能。

### Added
- **普通监控模式**：批量巡检多个饰品，每 30 分钟采集价格，7 天均价波动检测
- **极致追踪模式**：单品高频狙击，秒级轮询，429 自动降频，免打扰时段
- **企业微信机器人通知**：涨价/跌价告警，同一饰品同一方向 4 小时冷却
- **SQLite 持久化**：自动记录价格历史和告警日志
- SteamDT API 封装（重试、延迟、异常处理）
- 单元测试覆盖（共 86+ 个用例）
- 优雅退出机制（SIGINT/SIGTERM）
