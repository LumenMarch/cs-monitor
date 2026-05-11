<template>
  <div class="stats">
    <header class="stats__header">
      <div>
        <p class="stats__eyebrow">SkinRadar Analytics</p>
        <h2 class="stats__title">市场趋势分析</h2>
        <p class="stats__desc">基于现有监控、告警和采集数据生成前端聚合视图，不新增后端接口。</p>
      </div>
      <button class="btn-outline stats__refresh" type="button" :disabled="loading" @click="reload">
        <RefreshCw class="w-4 h-4" />
        {{ loading ? '刷新中' : '刷新分析' }}
      </button>
    </header>

    <section class="metric-strip">
      <div class="metric-cell">
        <span class="metric-cell__label">Tracked Items</span>
        <span class="metric-cell__value">{{ watchlist.length }}</span>
        <span class="metric-cell__sub">启用 {{ enabledCount }} 个，暂停 {{ pausedCount }} 个</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">Avg Change</span>
        <span class="metric-cell__value" :class="avgChange >= 0 ? 'is-up' : 'is-down'">{{ signed(avgChange) }}%</span>
        <span class="metric-cell__sub">按 24h 变化均值估算</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">Alerts</span>
        <span class="metric-cell__value">{{ dashboard.todayAlertCount }}</span>
        <span class="metric-cell__sub">昨日 {{ dashboard.yesterdayAlertCount }} 条</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">API Quota</span>
        <span class="metric-cell__value">{{ dashboard.apiQuotaPercent }}%</span>
        <span class="metric-cell__sub">采集次数 {{ dashboard.todayCollectionCount.toLocaleString() }}</span>
      </div>
    </section>

    <section class="stats__grid">
      <div class="glass-card stats__panel stats__panel--wide">
        <div class="stats__panel-head">
          <div>
            <h3 class="terminal-section-title">Collection Pulse</h3>
            <p class="terminal-muted">监控清单价格序列快照</p>
          </div>
          <span class="stats__sample font-mono-num">{{ pulseBars.length }} samples</span>
        </div>
        <div class="stats__pulse">
          <div
            v-for="(height, index) in pulseBars"
            :key="index"
            class="stats__pulse-bar"
            :style="{ height: `${height}%` }"
          />
          <div v-if="!pulseBars.length" class="stats__empty">暂无趋势样本</div>
        </div>
      </div>

      <div class="glass-card stats__panel">
        <div class="stats__panel-head">
          <div>
            <h3 class="terminal-section-title">Alert Mix</h3>
            <p class="terminal-muted">最近告警类型分布</p>
          </div>
        </div>
        <div v-if="alertTypeSummary.length" class="stats__bars">
          <div v-for="row in alertTypeSummary" :key="row.type" class="stats__bar-row">
            <div class="stats__bar-label">
              <span>{{ row.label }}</span>
              <strong>{{ row.count }}</strong>
            </div>
            <div class="stats__bar-track">
              <div class="stats__bar-fill" :style="{ width: `${row.percent}%` }" />
            </div>
          </div>
        </div>
        <div v-else class="stats__empty">暂无告警样本</div>
      </div>

      <div class="glass-card stats__panel">
        <div class="stats__panel-head">
          <div>
            <h3 class="terminal-section-title">Volatility Ranking</h3>
            <p class="terminal-muted">监控清单 24h 波动排行</p>
          </div>
        </div>
        <div v-if="rankedWatchItems.length" class="stats__rank-list">
          <button
            v-for="item in rankedWatchItems"
            :key="item.market_hash_name"
            type="button"
            class="stats__rank-row"
            @click="$router.push({ name: 'ItemDetail', params: { name: item.market_hash_name } })"
          >
            <span>{{ item.display_name || item.market_hash_name }}</span>
            <strong class="font-mono-num" :class="(item.change_24h ?? 0) >= 0 ? 'is-up' : 'is-down'">
              {{ signed(item.change_24h ?? 0) }}%
            </strong>
          </button>
        </div>
        <div v-else class="stats__empty">暂无波动数据</div>
      </div>

      <div class="glass-card stats__panel">
        <div class="stats__panel-head">
          <div>
            <h3 class="terminal-section-title">Platform Coverage</h3>
            <p class="terminal-muted">平台价格覆盖</p>
          </div>
        </div>
        <div v-if="platformSummary.length" class="stats__platforms">
          <div v-for="row in platformSummary" :key="row.platform" class="stats__platform">
            <span>{{ row.platform }}</span>
            <strong>{{ row.count }}</strong>
          </div>
        </div>
        <div v-else class="stats__empty">暂无平台价格</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard'
import { useWatchlistStore } from '@/stores/watchlist'

interface AlertTypeSummary {
  type: string
  label: string
  count: number
  percent: number
}

const dashboard = useDashboardStore()
const watchStore = useWatchlistStore()
const loading = ref(false)

const watchlist = computed(() => dashboard.watchlist.length ? dashboard.watchlist : watchStore.items)
const enabledCount = computed(() => watchlist.value.filter((item) => item.enabled).length)
const pausedCount = computed(() => Math.max(0, watchlist.value.length - enabledCount.value))

const avgChange = computed(() => {
  const values = watchlist.value
    .map((item) => item.change_24h)
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
})

const pulseBars = computed(() => {
  const values = dashboard.watchlistSparkline.filter((value) => Number.isFinite(value))
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return values.map(() => 55)
  return values.map((value) => Math.round(16 + ((value - min) / (max - min)) * 84))
})

const alertTypeSummary = computed<AlertTypeSummary[]>(() => {
  const labelMap: Record<string, string> = {
    price_surge: '涨价',
    price_drop: '跌价',
    price_change: '价格变动',
    quantity_change: '数量变动',
    both: '综合变动',
  }
  const counts = dashboard.alerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1
    return acc
  }, {})
  const max = Math.max(1, ...Object.values(counts))
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: labelMap[type] || type,
      count,
      percent: Math.round((count / max) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

const rankedWatchItems = computed(() => {
  return [...watchlist.value]
    .filter((item) => item.change_24h != null)
    .sort((a, b) => Math.abs(b.change_24h ?? 0) - Math.abs(a.change_24h ?? 0))
    .slice(0, 8)
})

const platformSummary = computed(() => {
  const counts = watchlist.value.reduce<Record<string, number>>((acc, item) => {
    for (const price of item.platform_prices || []) {
      if (price.price <= 0) continue
      acc[price.platform] = (acc[price.platform] || 0) + 1
    }
    return acc
  }, {})
  return Object.entries(counts)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
})

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

async function reload() {
  loading.value = true
  try {
    await Promise.all([dashboard.loadAll(), watchStore.fetchItems()])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  reload()
})
</script>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 92rem;
  margin: 0 auto;
}

.stats__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.stats__eyebrow {
  margin: 0 0 0.375rem;
  color: var(--cs-radar);
  font-size: 0.6875rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.stats__title {
  margin: 0;
  color: var(--cs-text-primary);
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 900;
  letter-spacing: 0;
}

.stats__desc {
  margin: 0.5rem 0 0;
  color: var(--cs-text-secondary);
  font-size: 0.875rem;
}

.stats__refresh {
  height: 2.25rem;
  padding: 0 0.875rem;
  font-size: 0.75rem;
}

.stats__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.8fr);
  gap: 1rem;
}

.stats__panel {
  min-height: 18rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats__panel--wide {
  min-height: 20rem;
}

.stats__panel-head,
.stats__bar-label,
.stats__platform,
.stats__rank-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.stats__sample {
  color: var(--cs-text-muted);
  font-size: 0.75rem;
}

.stats__pulse {
  min-height: 12rem;
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

.stats__pulse-bar {
  flex: 1;
  min-width: 0.35rem;
  border-radius: 0.25rem 0.25rem 0 0;
  background: linear-gradient(180deg, #22c55e, #6366f1);
}

.stats__bars,
.stats__rank-list,
.stats__platforms {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stats__bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.stats__bar-label {
  color: var(--cs-text-primary);
  font-size: 0.8125rem;
  font-weight: 800;
}

.stats__bar-track {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.stats__bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6366f1, #22c55e);
}

.stats__rank-row {
  width: 100%;
  padding: 0.75rem 0;
  border: none;
  border-bottom: 1px solid var(--cs-panel-line);
  background: transparent;
  color: var(--cs-text-primary);
  cursor: pointer;
  text-align: left;
}

.stats__rank-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats__platform {
  padding: 0.75rem;
  border: 1px solid var(--cs-border);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
}

.stats__platform span {
  color: var(--cs-text-secondary);
  font-weight: 800;
}

.stats__platform strong {
  color: var(--cs-radar);
  font-family: 'JetBrains Mono', monospace;
}

.stats__empty {
  min-height: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cs-text-muted);
  font-size: 0.8125rem;
}

.is-up {
  color: var(--color-up, #ef4444);
}

.is-down {
  color: var(--color-down, #22c55e);
}

@media (max-width: 1080px) {
  .stats__grid {
    grid-template-columns: 1fr;
  }
}
</style>
