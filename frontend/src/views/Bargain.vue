<template>
  <div class="bargain">
    <!-- 标题区 -->
    <div class="bargain__header">
      <div>
        <h2 class="bargain__title">跨市差价雷达</h2>
        <p class="bargain__desc">扫描国内平台与 Steam 社区市场的价格差，按利润阈值沉淀可行动机会。</p>
      </div>
      <div class="bargain__header-actions">
        <button
          class="btn-secondary text-xs h-9 px-4"
          :disabled="!config.enabled || scanning"
          @click="handleManualScan"
        >
          <Radar class="w-4 h-4" />
          {{ scanning ? '扫描中…' : '立即扫描' }}
        </button>
      </div>
    </div>

    <section class="metric-strip">
      <div class="metric-cell">
        <span class="metric-cell__label">Scanner</span>
        <span class="metric-cell__value bargain__metric-state">{{ config.enabled ? 'ON' : 'OFF' }}</span>
        <span class="metric-cell__sub">{{ config.enabled ? '差价扫描已启用' : '保存配置后启用扫描' }}</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">Interval</span>
        <span class="metric-cell__value">{{ config.interval_minutes }}</span>
        <span class="metric-cell__sub">分钟 / 轮</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">Min Profit</span>
        <span class="metric-cell__value">{{ config.min_profit_percent.toFixed(1) }}%</span>
        <span class="metric-cell__sub">最低毛利率</span>
      </div>
      <div class="metric-cell">
        <span class="metric-cell__label">Open Signals</span>
        <span class="metric-cell__value">{{ activeOpportunityCount }}</span>
        <span class="metric-cell__sub">当前未忽略机会</span>
      </div>
    </section>

    <!-- 配置卡片 -->
    <div class="glass-card bargain__config">
      <div class="bargain__config-head">
        <div>
          <h3 class="bargain__config-title">扫描参数</h3>
          <p class="bargain__config-sub">默认买入方为国内三方、卖出方为 Steam；可自定义白名单覆盖。扫描完全基于本地价格记录，不消耗 SteamDT 配额。</p>
        </div>
        <label class="bargain__switch">
          <span>启用</span>
          <n-switch v-model:value="enabledModel" :loading="saving" />
        </label>
      </div>

      <div class="bargain__form-grid">
        <div class="bargain__field">
          <label>最小毛利率 (%)，不含 Steam 15% 税</label>
          <n-input-number
            v-model:value="config.min_profit_percent"
            :min="0"
            :max="500"
            :step="0.5"
            :precision="2"
          />
        </div>
        <div class="bargain__field">
          <label>最小毛利金额 (¥)</label>
          <n-input-number
            v-model:value="config.min_profit_amount"
            :min="0"
            :step="1"
            :precision="2"
          />
        </div>
        <div class="bargain__field">
          <label>买入价区间下限 (¥)</label>
          <n-input-number
            v-model:value="config.min_buy_price"
            :min="0"
            :step="1"
            :precision="2"
          />
        </div>
        <div class="bargain__field">
          <label>买入价区间上限 (¥，0=不限)</label>
          <n-input-number
            v-model:value="config.max_buy_price"
            :min="0"
            :step="1"
            :precision="2"
          />
        </div>
        <div class="bargain__field">
          <label>扫描间隔 (分钟)</label>
          <n-input-number v-model:value="config.interval_minutes" :min="1" :max="1440" />
        </div>
        <div class="bargain__field">
          <label>告警冷却 (分钟)</label>
          <n-input-number v-model:value="config.alert_cooldown_minutes" :min="0" :max="10080" />
        </div>
        <div class="bargain__field bargain__field--full">
          <label>买入平台白名单（留空 = 默认 BUFF / YYYP / IGXE / C5GAME）</label>
          <n-select
            v-model:value="config.buy_platforms"
            multiple
            filterable
            tag
            :options="buyPlatformOptions"
            placeholder="留空使用默认国内三方平台"
          />
        </div>
        <div class="bargain__field bargain__field--full">
          <label>卖出平台白名单（留空 = 默认 STEAM）</label>
          <n-select
            v-model:value="config.sell_platforms"
            multiple
            filterable
            tag
            :options="sellPlatformOptions"
            placeholder="留空仅扫描 STEAM 作为卖出方"
          />
        </div>
        <div class="bargain__field bargain__field--full bargain__field--inline">
          <span>命中后推送到当前通知渠道（Steam 15% 税请自行折算）</span>
          <n-switch v-model:value="notifyModel" />
        </div>
      </div>

      <div class="bargain__form-actions">
        <button class="btn-primary text-xs h-9 px-4" :disabled="saving" @click="saveConfig">
          <Save class="w-4 h-4" />
          保存配置
        </button>
        <span v-if="config.updated_at" class="bargain__updated-at">
          上次保存：{{ formatDateTime(config.updated_at) }}
        </span>
      </div>
    </div>

    <!-- 机会列表 -->
    <div class="bargain__list-section">
      <div class="bargain__list-head">
        <h3 class="bargain__list-title">差价机会</h3>
        <div class="bargain__filters">
          <n-input
            v-model:value="filterName"
            placeholder="按饰品名称过滤"
            clearable
            size="small"
            @keydown.enter="reload(1)"
          />
          <n-input-number
            v-model:value="filterMinProfit"
            placeholder="最小利润率"
            :min="0"
            size="small"
            style="width: 9rem"
            @update:value="reload(1)"
          />
          <n-checkbox v-model:checked="includeDismissed" @update:checked="reload(1)">
            含已忽略
          </n-checkbox>
        </div>
      </div>

      <div v-if="loading" class="glass-card bargain__table-wrap">
        <div v-for="n in 5" :key="n" class="bargain__skeleton-row">
          <div class="skeleton-line" style="width: 30%; height: 1rem;" />
          <div class="skeleton-line" style="width: 18%; height: 1rem;" />
          <div class="skeleton-line" style="width: 18%; height: 1rem;" />
          <div class="skeleton-line" style="width: 18%; height: 1rem;" />
          <div class="skeleton-line" style="width: 10%; height: 1rem;" />
        </div>
      </div>

      <div v-else-if="items.length === 0" class="glass-card bargain__empty">
        <Radar class="bargain__empty-icon" />
        <p class="bargain__empty-text">
          {{ config.enabled ? '暂无机会，等待下次扫描…' : '请先启用跨市差价扫描并保存配置' }}
        </p>
      </div>

      <div v-else class="glass-card bargain__table-wrap">
        <table class="bargain__table">
          <thead>
            <tr>
              <th>饰品</th>
              <th>买入</th>
              <th>卖出</th>
              <th>毛利</th>
              <th>毛利率</th>
              <th>扫描时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="op in items" :key="op.id" :class="op.dismissed ? 'bargain__row--dismissed' : ''">
              <td class="bargain__name">{{ op.display_name || op.market_hash_name }}</td>
              <td>
                <span class="bargain__platform">{{ op.buy_platform }}</span>
                <span class="font-mono-num"> ¥{{ op.buy_price.toFixed(2) }}</span>
              </td>
              <td>
                <span class="bargain__platform">{{ op.sell_platform }}</span>
                <span class="font-mono-num"> ¥{{ op.sell_price.toFixed(2) }}</span>
              </td>
              <td class="bargain__profit font-mono-num">+¥{{ op.profit_amount.toFixed(2) }}</td>
              <td class="bargain__profit-pct font-mono-num">+{{ op.profit_percent.toFixed(2) }}%</td>
              <td class="bargain__time font-mono-num">{{ formatDateTime(op.scanned_at) }}</td>
              <td>
                <button
                  v-if="!op.dismissed"
                  class="bargain__action"
                  title="忽略这条机会"
                  @click="dismiss(op.id)"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <span v-else class="bargain__dismissed-tag">已忽略</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > limit" class="bargain__pagination">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / limit)"
          :page-size="limit"
          @update:page="reload"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NCheckbox, NInput, NInputNumber, NPagination, NSelect, NSwitch } from 'naive-ui'
import { Radar, Save, X } from 'lucide-vue-next'
import api, { type BargainOpportunity, type BargainScanConfig } from '@/api'
import { toastError, toastInfo, toastSuccess } from '@/composables/useToast'
import { formatUTCToLocal } from '@/utils/date'

const config = ref<BargainScanConfig>({
  enabled: 0,
  min_profit_percent: 5,
  min_profit_amount: 0,
  min_buy_price: 0,
  max_buy_price: 0,
  buy_platforms: [],
  sell_platforms: [],
  interval_minutes: 5,
  alert_cooldown_minutes: 60,
  notify_enabled: 1,
  updated_at: null,
})

const enabledModel = computed({
  get: () => !!config.value.enabled,
  set: (v: boolean) => {
    config.value.enabled = v ? 1 : 0
  },
})
const notifyModel = computed({
  get: () => !!config.value.notify_enabled,
  set: (v: boolean) => {
    config.value.notify_enabled = v ? 1 : 0
  },
})

const items = ref<BargainOpportunity[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const loading = ref(false)
const saving = ref(false)
const scanning = ref(false)
const filterName = ref('')
const filterMinProfit = ref<number | null>(null)
const includeDismissed = ref(false)

const activeOpportunityCount = computed(() => items.value.filter((item) => !item.dismissed).length)

const buyPlatformOptions = [
  { label: 'BUFF', value: 'BUFF' },
  { label: 'YYYP（悠悠有品）', value: 'YYYP' },
  { label: 'IGXE', value: 'IGXE' },
  { label: 'C5GAME', value: 'C5GAME' },
]
const sellPlatformOptions = [
  { label: 'STEAM 社区市场', value: 'STEAM' },
]

function formatDateTime(iso: string | null): string {
  return iso ? formatUTCToLocal(iso) : '—'
}

async function loadConfig() {
  try {
    const { data } = await api.getBargainConfig()
    config.value = data
  } catch {
    toastError('加载扫描配置失败')
  }
}

async function reload(p?: number) {
  loading.value = true
  if (typeof p === 'number') page.value = p
  try {
    const { data } = await api.listBargainOpportunities({
      page: page.value,
      limit: limit.value,
      include_dismissed: includeDismissed.value,
      market_hash_name: filterName.value || undefined,
      min_profit_percent: filterMinProfit.value ?? undefined,
    })
    items.value = data.items
    total.value = data.total
  } catch {
    toastError('加载机会列表失败')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const { data } = await api.updateBargainConfig({
      enabled: !!config.value.enabled,
      min_profit_percent: config.value.min_profit_percent,
      min_profit_amount: config.value.min_profit_amount,
      min_buy_price: config.value.min_buy_price,
      max_buy_price: config.value.max_buy_price,
      buy_platforms: config.value.buy_platforms,
      sell_platforms: config.value.sell_platforms,
      interval_minutes: config.value.interval_minutes,
      alert_cooldown_minutes: config.value.alert_cooldown_minutes,
      notify_enabled: !!config.value.notify_enabled,
    })
    config.value = data
    toastSuccess('扫描配置已保存')
  } catch (err: any) {
    toastError(err?.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleManualScan() {
  scanning.value = true
  try {
    const { data } = await api.runBargainScan()
    if (data.scanned > 0) {
      toastSuccess(`本轮新增 ${data.scanned} 条机会`)
    } else {
      toastInfo('本轮无新机会')
    }
    await reload(1)
  } catch (err: any) {
    toastError(err?.response?.data?.detail || '扫描失败')
  } finally {
    scanning.value = false
  }
}

async function dismiss(id: number) {
  try {
    await api.dismissBargainOpportunity(id)
    await reload()
  } catch {
    toastError('忽略失败')
  }
}

onMounted(async () => {
  await loadConfig()
  await reload(1)
})
</script>

<style scoped>
.bargain {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin: 0 auto;
}

.bargain__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.bargain__title {
  font-size: 1.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0;
  color: #ffffff;
  margin: 0;
}

.bargain__desc {
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.bargain__metric-state {
  color: var(--cs-radar);
  font-size: 1.35rem;
}

.bargain__header-actions {
  display: flex;
  gap: 0.5rem;
}

.bargain__config {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bargain__config-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.bargain__config-title {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.bargain__config-sub {
  color: #94a3b8;
  font-size: 0.75rem;
  margin: 0.25rem 0 0 0;
}

.bargain__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #cbd5e1;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.bargain__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 1024px) {
  .bargain__form-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.bargain__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.bargain__field label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.bargain__field--full {
  grid-column: 1 / -1;
}

.bargain__field--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.bargain__field--inline span {
  font-size: 0.8125rem;
  color: #cbd5e1;
  font-weight: 600;
}

.bargain__form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bargain__updated-at {
  font-size: 0.75rem;
  color: #94a3b8;
}

.bargain__list-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bargain__list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.bargain__list-title {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.bargain__filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bargain__table-wrap {
  padding: 0;
  overflow: hidden;
}

.bargain__table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.bargain__table thead {
  background: rgba(15, 15, 18, 0.5);
  border-bottom: 1px solid #1f1f23;
}

.bargain__table th {
  padding: 0.875rem 1.25rem;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.bargain__table td {
  padding: 0.875rem 1.25rem;
  font-size: 0.8125rem;
}

.bargain__table tbody tr {
  transition: background 200ms;
}

.bargain__table tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

.bargain__table tbody tr + tr {
  border-top: 1px solid #1f1f23;
}

.bargain__row--dismissed {
  opacity: 0.55;
}

.bargain__name {
  font-weight: 700;
  color: #ffffff;
}

.bargain__platform {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  margin-right: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 0.25rem;
  font-size: 10px;
  font-weight: 700;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.08);
}

.bargain__profit {
  color: #22c55e;
  font-weight: 700;
}

.bargain__profit-pct {
  color: #22c55e;
  font-weight: 800;
}

.bargain__time {
  color: #94a3b8;
  font-size: 0.75rem;
}

.bargain__action {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  transition: background 150ms;
}

.bargain__action:hover {
  background: rgba(239, 68, 68, 0.15);
}

.bargain__dismissed-tag {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.bargain__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
}

.bargain__empty-icon {
  width: 3rem;
  height: 3rem;
  color: #94a3b8;
  opacity: 0.3;
  margin-bottom: 1rem;
}

.bargain__empty-text {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.bargain__skeleton-row {
  display: flex;
  gap: 2rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #1f1f23;
}

.bargain__pagination {
  display: flex;
  justify-content: center;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  font-weight: 700;
  border: 1px solid #2d2d35;
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  transition: background 150ms;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

html:not(.dark) .bargain__title { color: #0f172a; }
html:not(.dark) .bargain__desc { color: #64748b; }
html:not(.dark) .bargain__config-title { color: #0f172a; }
html:not(.dark) .bargain__list-title { color: #0f172a; }
html:not(.dark) .bargain__name { color: #0f172a; }
html:not(.dark) .bargain__table thead { background: rgba(248, 250, 252, 0.5); border-color: #e2e8f0; }
html:not(.dark) .bargain__table tbody tr + tr { border-color: #e2e8f0; }
html:not(.dark) .bargain__table tbody tr:hover { background: rgba(0, 0, 0, 0.02); }
html:not(.dark) .bargain__platform { color: #4f46e5; }
html:not(.dark) .bargain__skeleton-row { border-color: #e2e8f0; }
html:not(.dark) .btn-secondary { border-color: #cbd5e1; background: rgba(255, 255, 255, 0.7); color: #334155; }
html:not(.dark) .btn-secondary:hover:not(:disabled) { background: rgba(0, 0, 0, 0.04); }
</style>
