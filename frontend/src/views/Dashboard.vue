<template>
  <div class="dashboard">
    <template v-if="dashboard.loading">
      <div class="dashboard__header">
        <div>
          <div class="cs-skeleton" style="width: 12rem; height: 1.75rem;" />
          <div class="cs-skeleton" style="width: 18rem; height: 0.875rem; margin-top: 0.625rem;" />
        </div>
      </div>
      <div class="metric-strip">
        <div v-for="n in 4" :key="n" class="metric-cell">
          <div class="cs-skeleton" style="width: 5rem; height: 0.625rem;" />
          <div class="cs-skeleton" style="width: 4rem; height: 1.75rem; margin-top: 0.75rem;" />
        </div>
      </div>
      <div class="dashboard__grid">
        <div class="glass-card dashboard__panel dashboard__panel--wide">
          <div class="cs-skeleton" style="width: 10rem; height: 0.75rem;" />
          <div class="dashboard__bars">
            <div v-for="n in 18" :key="n" class="cs-skeleton dashboard__bar-skeleton" />
          </div>
        </div>
        <div class="glass-card dashboard__panel">
          <div v-for="n in 5" :key="n" class="cs-skeleton" style="width: 100%; height: 2.25rem; margin-bottom: 0.625rem;" />
        </div>
      </div>
    </template>

    <template v-else>
      <header class="dashboard__header">
        <div>
          <p class="dashboard__eyebrow">SkinRadar Command</p>
          <h1 class="dashboard__title">雷达指挥台</h1>
          <p class="dashboard__desc">聚合监控清单、极值追踪、告警流与跨市机会的实时工作台。</p>
        </div>
        <div class="dashboard__status">
          <span class="status-dot" />
          <div>
            <span class="dashboard__status-label">API 链路活跃</span>
            <strong class="dashboard__status-value">{{ lastUpdateLabel }}</strong>
          </div>
        </div>
      </header>

      <section class="metric-strip" aria-label="雷达核心指标">
        <div class="metric-cell">
          <span class="metric-cell__label">Active Watch</span>
          <span class="metric-cell__value">{{ dashboard.activeWatchlistCount }}</span>
          <span class="metric-cell__sub">高频追踪 {{ dashboard.extremeTrackCount }} 个</span>
        </div>
        <div class="metric-cell">
          <span class="metric-cell__label">Alert Today</span>
          <span class="metric-cell__value metric-cell__value--alert">{{ dashboard.todayAlertCount }}</span>
          <span class="metric-cell__sub">{{ alertDiffLabel }}</span>
        </div>
        <div class="metric-cell">
          <span class="metric-cell__label">Collections</span>
          <span class="metric-cell__value">{{ dashboard.todayCollectionCount.toLocaleString() }}</span>
          <span class="metric-cell__sub">采集间隔 {{ dashboard.checkIntervalMinutes }} 分钟</span>
        </div>
        <div class="metric-cell">
          <span class="metric-cell__label">Price Records</span>
          <span class="metric-cell__value">{{ dashboard.latestPriceCount.toLocaleString() }}</span>
          <span class="metric-cell__sub">API 配额 {{ dashboard.apiQuotaPercent }}%</span>
        </div>
      </section>

      <section class="dashboard__grid">
        <div class="glass-card dashboard__panel dashboard__panel--wide">
          <div class="dashboard__panel-head">
            <div>
              <h2 class="terminal-section-title">Portfolio Pulse</h2>
              <p class="terminal-muted">监控清单走势与采集脉冲</p>
            </div>
            <button class="btn-outline dashboard__mini-action" type="button" @click="handleRefresh">
              <RefreshCw class="w-3.5 h-3.5" />
              刷新
            </button>
          </div>
          <div class="dashboard__bars" aria-label="监控清单趋势">
            <template v-if="barHeights.length">
              <div
                v-for="(h, i) in barHeights"
                :key="i"
                class="dashboard__bar"
                :style="{ height: `${h}%`, transitionDelay: `${i * 24}ms` }"
              />
            </template>
            <div v-else class="dashboard__empty">暂无趋势数据</div>
          </div>
          <div class="dashboard__pulse-footer">
            <span>样本 {{ barHeights.length || 0 }}</span>
            <span>最后更新 {{ lastUpdateLabel }}</span>
          </div>
        </div>

        <div class="glass-card dashboard__panel">
          <div class="dashboard__panel-head">
            <div>
              <h2 class="terminal-section-title">Quick Ops</h2>
              <p class="terminal-muted">雷达任务入口</p>
            </div>
            <Zap class="dashboard__head-icon" />
          </div>
          <div class="dashboard__ops">
            <button type="button" class="dashboard__op" @click="$router.push({ name: 'Watchlist' })">
              <ListOrdered class="w-4 h-4" />
              <span>监控清单</span>
              <strong>{{ dashboard.activeWatchlistCount }}</strong>
            </button>
            <button type="button" class="dashboard__op" @click="$router.push({ name: 'ExtremeTrack' })">
              <Radar class="w-4 h-4" />
              <span>高频追踪</span>
              <strong>{{ dashboard.extremeTrackCount }}</strong>
            </button>
            <button type="button" class="dashboard__op" @click="$router.push({ name: 'Bargain' })">
              <Activity class="w-4 h-4" />
              <span>跨市差价</span>
              <strong>Scan</strong>
            </button>
          </div>
        </div>

        <div class="glass-card dashboard__panel">
          <div class="dashboard__panel-head">
            <div>
              <h2 class="terminal-section-title">Volatility Watch</h2>
              <p class="terminal-muted">24h 波动榜</p>
            </div>
          </div>
          <div v-if="topMovers.length" class="dashboard__movers">
            <button
              v-for="item in topMovers"
              :key="item.market_hash_name"
              type="button"
              class="dashboard__mover"
              @click="$router.push({ name: 'ItemDetail', params: { name: item.market_hash_name } })"
            >
              <span class="dashboard__mover-name">{{ item.display_name || item.market_hash_name }}</span>
              <span
                class="dashboard__mover-change font-mono-num"
                :class="(item.change_percent ?? item.change_24h ?? 0) >= 0 ? 'is-up' : 'is-down'"
              >
                {{ formatPercent(item.change_percent ?? item.change_24h) }}
              </span>
            </button>
          </div>
          <div v-else class="dashboard__empty">暂无波动样本</div>
        </div>

        <div class="glass-card dashboard__panel">
          <div class="dashboard__panel-head">
            <div>
              <h2 class="terminal-section-title">Alert Feed</h2>
              <p class="terminal-muted">最近告警</p>
            </div>
            <button class="dashboard__link" type="button" @click="$router.push({ name: 'Alerts' })">全部</button>
          </div>
          <div v-if="dashboard.alerts.length" class="dashboard__alerts">
            <div v-for="alert in dashboard.alerts.slice(0, 5)" :key="alert.id" class="dashboard__alert">
              <span class="dashboard__alert-type">{{ alert.alert_type }}</span>
              <strong>{{ alert.display_name || alert.market_hash_name }}</strong>
              <span class="font-mono-num">{{ formatUTCToLocal(alert.notified_at) }}</span>
            </div>
          </div>
          <div v-else class="dashboard__empty">暂无告警记录</div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Activity, ListOrdered, Radar, RefreshCw, Zap } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'
import { toastSuccess } from '@/composables/useToast'
import { formatUTCToLocal } from '@/utils/date'

const dashboard = useDashboardStore()

const barHeights = computed(() => {
  const values = dashboard.watchlistSparkline.filter((value) => Number.isFinite(value))
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return values.map(() => 52)
  return values.map((value) => Math.round(18 + ((value - min) / (max - min)) * 82))
})

const topMovers = computed(() => {
  const volatile = dashboard.topVolatile.map((item) => ({
    ...item,
    change_24h: null as number | null,
  }))
  const watchlist = dashboard.watchlist
    .filter((item) => item.change_24h != null)
    .map((item) => ({
      market_hash_name: item.market_hash_name,
      display_name: item.display_name,
      current_price: item.latest_price,
      change_percent: item.change_24h ?? 0,
      change_24h: item.change_24h,
      sparkline: item.sparkline,
    }))
  return [...volatile, ...watchlist]
    .sort((a, b) => Math.abs(b.change_percent ?? 0) - Math.abs(a.change_percent ?? 0))
    .slice(0, 6)
})

const lastUpdateLabel = computed(() => {
  if (!dashboard.lastUpdate || dashboard.lastUpdate === '-') return '等待采集'
  return formatUTCToLocal(dashboard.lastUpdate)
})

const alertDiffLabel = computed(() => {
  const diff = dashboard.alertDiff.diff
  if (diff === 0) return '与昨日持平'
  return `${diff > 0 ? '+' : ''}${diff} 较昨日`
})

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function handleRefresh() {
  dashboard.loadAll()
  toastSuccess('雷达数据刷新中')
}

dashboard.loadAll()
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 92rem;
  margin: 0 auto;
}

.dashboard__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.dashboard__eyebrow {
  margin: 0 0 0.375rem;
  color: var(--cs-radar);
  font-size: 0.6875rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.dashboard__title {
  margin: 0;
  color: var(--cs-text-primary);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
}

.dashboard__desc {
  margin: 0.625rem 0 0;
  color: var(--cs-text-secondary);
  font-size: 0.875rem;
}

.dashboard__status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 17rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--cs-border);
  border-radius: 0.5rem;
  background: var(--cs-bg-glass);
}

.dashboard__status-label {
  display: block;
  color: var(--cs-text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dashboard__status-value {
  display: block;
  margin-top: 0.25rem;
  color: var(--cs-text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.metric-cell__value--alert {
  color: var(--color-up, #ef4444);
}

.dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 0.7fr);
  gap: 1rem;
}

.dashboard__panel {
  min-height: 18rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard__panel--wide {
  min-height: 20rem;
}

.dashboard__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard__head-icon {
  width: 1rem;
  height: 1rem;
  color: var(--cs-radar);
}

.dashboard__mini-action {
  height: 2rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
}

.dashboard__bars {
  min-height: 11rem;
  display: flex;
  align-items: end;
  gap: 0.375rem;
  padding: 1rem;
  border: 1px solid var(--cs-border);
  border-radius: 0.5rem;
  background:
    linear-gradient(var(--cs-panel-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--cs-panel-line) 1px, transparent 1px);
  background-size: 100% 25%, 8.333% 100%;
}

.dashboard__bar,
.dashboard__bar-skeleton {
  flex: 1;
  min-width: 0.35rem;
  border-radius: 0.25rem 0.25rem 0 0;
}

.dashboard__bar {
  background: linear-gradient(180deg, #22c55e, #6366f1);
  box-shadow: 0 -8px 24px rgba(34, 197, 94, 0.12);
  animation: bar-in 420ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

.dashboard__bar-skeleton {
  height: 70%;
}

@keyframes bar-in {
  from { transform: scaleY(0.2); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}

.dashboard__pulse-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--cs-text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.dashboard__ops,
.dashboard__movers,
.dashboard__alerts {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.dashboard__op,
.dashboard__mover {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--cs-border);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  color: var(--cs-text-primary);
  cursor: pointer;
  transition: background var(--cs-transition-fast), border-color var(--cs-transition-fast);
}

.dashboard__op:hover,
.dashboard__mover:hover {
  background: var(--cs-bg-hover);
  border-color: #343a46;
}

.dashboard__op strong,
.dashboard__mover-change {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  letter-spacing: 0;
}

.dashboard__mover-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}

.is-up {
  color: var(--color-up, #ef4444);
}

.is-down {
  color: var(--color-down, #22c55e);
}

.dashboard__link {
  border: none;
  background: transparent;
  color: var(--cs-brand-primary-hover);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 800;
}

.dashboard__alert {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.25rem 0.75rem;
  padding: 0.675rem 0;
  border-bottom: 1px solid var(--cs-panel-line);
}

.dashboard__alert strong {
  overflow: hidden;
  color: var(--cs-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard__alert span:last-child {
  grid-column: 2;
  color: var(--cs-text-muted);
  font-size: 0.6875rem;
}

.dashboard__alert-type {
  color: var(--cs-radar);
  font-size: 0.6875rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dashboard__empty {
  min-height: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cs-text-muted);
  font-size: 0.8125rem;
}

@media (max-width: 1080px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard__status {
    width: 100%;
    min-width: 0;
  }

  .dashboard__panel {
    min-height: auto;
  }
}
</style>
