<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        v-if="isMobile"
        class="topbar-icon-btn"
        type="button"
        aria-label="打开导航菜单"
        title="打开导航菜单"
        @click="emit('toggle-mobile-drawer')"
      >
        <Menu class="w-5 h-5" />
      </button>
      <button
        v-else
        class="topbar-icon-btn topbar-collapse-btn"
        type="button"
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="emit('toggle-collapse')"
      >
        <PanelLeftOpen v-if="collapsed" class="w-5 h-5" />
        <PanelLeftClose v-else class="w-5 h-5" />
      </button>
      <h2 class="topbar-title">{{ viewTitle }}</h2>
      <div class="topbar-divider" />
      <div class="topbar-search">
        <Search class="topbar-search__icon" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="topbar-search__input"
          autocomplete="off"
          aria-label="搜索饰品"
          @focus="handleSearchFocus"
          @input="handleSearchInput"
          @keydown.enter.prevent="goToFirstSearchResult"
          @keydown.esc="closeSearch"
          @blur="handleSearchBlur"
        />
        <div
          v-if="searchPanelVisible"
          class="topbar-search__panel"
          role="listbox"
        >
          <button
            v-for="item in searchResults"
            :key="item.market_hash_name"
            class="topbar-search__item"
            type="button"
            role="option"
            @mousedown.prevent="goToItem(item.market_hash_name)"
          >
            <span class="topbar-search__item-name">{{ item.name || item.market_hash_name }}</span>
            <span
              v-if="item.name && item.name !== item.market_hash_name"
              class="topbar-search__item-alias"
            >
              {{ item.market_hash_name }}
            </span>
          </button>
          <div v-if="searching" class="topbar-search__state">搜索中...</div>
          <div v-else-if="searchQuery.trim() && !searchResults.length" class="topbar-search__state">
            未找到匹配饰品
          </div>
        </div>
      </div>
    </div>
    <div class="topbar-right">
      <button class="topbar-icon-btn" type="button" title="刷新数据" aria-label="刷新数据" @click="handleRefresh">
        <RefreshCw class="w-5 h-5" />
      </button>
      <template v-for="action in contextActions" :key="action.id">
        <button
          :class="action.primary ? 'btn-primary' : 'btn-outline'"
          :style="action.style"
          class="topbar-action text-xs h-10 px-4"
          type="button"
          @click="action.handler"
        >
          <component :is="action.icon" v-if="action.icon" class="w-4 h-4" />
          {{ action.label }}
        </button>
      </template>

      <!-- 用户菜单 -->
      <NDropdown
        v-if="auth.isLoggedIn"
        trigger="click"
        :options="userMenuOptions"
        @select="onUserMenuSelect"
      >
        <button class="topbar-user" type="button" title="账号菜单" aria-label="账号菜单">
          <div class="topbar-user__avatar">
            {{ avatarLetter }}
          </div>
          <span class="topbar-user__name">{{ auth.username }}</span>
        </button>
      </NDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Search,
  RefreshCw,
  Activity,
  Plus,
  Zap,
  UserCog,
  Users as UsersIcon,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-vue-next'
import { NDropdown } from 'naive-ui'
import { useDashboardStore } from '@/stores/dashboard'
import { useWatchlistStore } from '@/stores/watchlist'
import { useAuthStore } from '@/stores/auth'
import { toastError, toastSuccess, toastWarning } from '@/composables/useToast'
import api, { type SearchItemResult } from '@/api'

const auth = useAuthStore()

const avatarLetter = computed(() => (auth.username || '?').charAt(0).toUpperCase())

const userMenuOptions = computed(() => {
  const items: Array<Record<string, unknown>> = [
    {
      label: `${auth.username}（${auth.isAdmin ? '管理员' : '普通用户'}）`,
      key: '__info',
      disabled: true,
    },
    { type: 'divider', key: '__d1' },
    {
      label: '个人中心',
      key: 'UserCenter',
      icon: () => h(UserCog, { size: 16 }),
    },
  ]
  if (auth.isAdmin) {
    items.push({
      label: '用户管理',
      key: 'Users',
      icon: () => h(UsersIcon, { size: 16 }),
    })
  }
  items.push(
    { type: 'divider', key: '__d2' },
    {
      label: '退出登录',
      key: 'logout',
      icon: () => h(LogOut, { size: 16 }),
    },
  )
  return items
})

function onUserMenuSelect(key: string) {
  if (key === 'logout') {
    auth.logout()
    router.replace({ name: 'Login' })
    return
  }
  router.push({ name: key })
}

defineProps<{
  collapsed: boolean
  isMobile: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-collapse'): void
  (e: 'toggle-mobile-drawer'): void
}>()

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()
const watchlistStore = useWatchlistStore()
const searchQuery = ref('')
const searchResults = ref<SearchItemResult[]>([])
const searching = ref(false)
const searchFocused = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const viewTitle = computed(() => {
  const map: Record<string, string> = {
    Dashboard: '数据概览',
    Watchlist: '监控清单',
    ExtremeTrack: '极致追踪',
    Alerts: '历史告警',
    Stats: '市场趋势分析',
    Settings: '系统配置',
    ItemDetail: '饰品详情',
    UserCenter: '个人中心',
    Users: '用户管理',
  }
  return map[route.name as string] || '仪表盘'
})

const searchPlaceholder = computed(() => {
  return '快速搜索饰品名称...'
})

const searchPanelVisible = computed(() =>
  searchFocused.value && (!!searchQuery.value.trim() || searching.value),
)

interface ContextAction {
  id: string
  label: string
  icon?: Component
  primary: boolean
  handler: () => void
  style?: string
}

const contextActions = computed<ContextAction[]>(() => {
  const name = route.name as string
  switch (name) {
    case 'Dashboard':
      return [
        { id: 'status', label: '服务状态', icon: Activity, primary: false, handler: handleStatusCheck },
        { id: 'sync', label: '强制同步', icon: RefreshCw, primary: true, handler: handleForceSync },
      ]
    case 'Watchlist':
      return [
        { id: 'add', label: '新增监控项', icon: Plus, primary: true, handler: () => router.push({ name: 'Watchlist', query: { action: 'add' } }) },
      ]
    case 'ExtremeTrack':
      return [
        { id: 'speed', label: 'API 测速', icon: Activity, primary: false, handler: handleStatusCheck, style: 'color: #16a34a; border-color: rgba(34,197,94,0.3)' },
        { id: 'start', label: '启动新任务', icon: Zap, primary: true, handler: () => router.push({ name: 'ExtremeTrack', query: { action: 'add' } }), style: 'background: #22c55e; color: #052e16; box-shadow: 0 4px 12px rgba(34,197,94,0.2)' },
      ]
    default:
      return []
  }
})

function handleRefresh() {
  dashboardStore.loadAll()
  toastSuccess('数据刷新中...')
}

async function handleStatusCheck() {
  const startedAt = performance.now()
  try {
    const { data } = await api.health()
    const duration = Math.round(performance.now() - startedAt)
    toastSuccess(`服务正常，延迟 ${duration}ms，数据库 ${data.database}`)
  } catch {
    toastError('服务状态检查失败')
  }
}

async function handleForceSync() {
  try {
    const result = await watchlistStore.refreshPrices()
    toastSuccess(`同步完成：成功 ${result.success} / 失败 ${result.failed}`)
  } catch (e: unknown) {
    const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    toastError(detail || '全量同步失败')
  }
}

function handleSearchFocus() {
  searchFocused.value = true
}

function handleSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 180)
}

function closeSearch() {
  searchFocused.value = false
  searchResults.value = []
}

function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchResults.value = []

  const q = searchQuery.value.trim()
  if (!q) {
    searching.value = false
    return
  }

  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const { data } = await api.searchItems(q, 6)
      searchResults.value = data
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 250)
}

function goToFirstSearchResult() {
  const first = searchResults.value[0]
  if (!first) {
    toastWarning('没有可跳转的搜索结果')
    return
  }
  goToItem(first.market_hash_name)
}

function goToItem(marketHashName: string) {
  searchQuery.value = ''
  searchResults.value = []
  searchFocused.value = false
  router.push({
    name: 'ItemDetail',
    params: { name: marketHashName },
  })
}

watch(
  () => route.fullPath,
  () => {
    closeSearch()
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  },
)
</script>

<style scoped>
.topbar {
  height: 5rem;
  border-bottom: 1px solid #1f1f23;
  background: rgba(5, 5, 5, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 40;
  flex-shrink: 0;
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.topbar-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
  margin: 0;
  white-space: nowrap;
}

.topbar-divider {
  height: 1.5rem;
  width: 1px;
  background: #1f1f23;
}

.topbar-search {
  position: relative;
  z-index: 2;
}

.topbar-search__icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #94a3b8;
  transition: color 200ms;
}

.topbar-search:focus-within .topbar-search__icon {
  color: #6366f1;
}

.topbar-search__input {
  background: #0f0f12;
  border: 1px solid #1f1f23;
  color: #ffffff;
  font-size: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.625rem 1rem 0.625rem 2.75rem;
  width: 12rem;
  transition: all 200ms;
  outline: none;
  font-weight: 500;
}

.topbar-search__input:focus {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.05);
  width: 20rem;
}

.topbar-search__input::placeholder {
  color: #71717a;
}

.topbar-search__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  width: min(26rem, calc(100vw - 2rem));
  padding: 0.375rem;
  border: 1px solid #1f1f23;
  border-radius: 0.75rem;
  background: rgba(15, 15, 18, 0.98);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}

.topbar-search__item {
  width: 100%;
  border: none;
  background: transparent;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  text-align: left;
}

.topbar-search__item:hover,
.topbar-search__item:focus-visible {
  background: rgba(99, 102, 241, 0.12);
}

.topbar-search__item-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 700;
}

.topbar-search__item-alias,
.topbar-search__state {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  color: #94a3b8;
}

.topbar-search__state {
  padding: 0.625rem 0.75rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.topbar-icon-btn {
  padding: 0.625rem;
  color: #94a3b8;
  border-radius: 0.75rem;
  transition: all 200ms;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topbar-icon-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.topbar-icon-btn:focus-visible,
.topbar-user:focus-visible,
.topbar-action:focus-visible {
  outline: 2px solid var(--cs-border-focus);
  outline-offset: 2px;
}

html:not(.dark) .topbar {
  border-bottom-color: #e2e8f0;
  background: rgba(248, 250, 252, 0.5);
}

html:not(.dark) .topbar-title {
  color: #0f172a;
}

html:not(.dark) .topbar-divider {
  background: #e2e8f0;
}

html:not(.dark) .topbar-search__input {
  background: #ffffff;
  border-color: #e2e8f0;
  color: #0f172a;
}

html:not(.dark) .topbar-search__input:focus {
  border-color: rgba(99, 102, 241, 0.5);
}

html:not(.dark) .topbar-search__panel {
  background: rgba(255, 255, 255, 0.98);
  border-color: #e2e8f0;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

html:not(.dark) .topbar-search__item {
  color: #0f172a;
}

html:not(.dark) .topbar-search__item:hover,
html:not(.dark) .topbar-search__item:focus-visible {
  background: rgba(99, 102, 241, 0.08);
}

html:not(.dark) .topbar-icon-btn {
  color: #64748b;
}

html:not(.dark) .topbar-icon-btn:hover {
  color: #0f172a;
  background: rgba(0, 0, 0, 0.04);
}

/* 用户菜单按钮 */
.topbar-user {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 150ms;
  font-size: 0.85rem;
}

.topbar-user:hover {
  background: rgba(99, 102, 241, 0.16);
  border-color: rgba(99, 102, 241, 0.45);
}

.topbar-user__avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  flex-shrink: 0;
}

.topbar-user__name {
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .topbar-user__name {
    display: none;
  }
}

html:not(.dark) .topbar-user {
  color: #1e293b;
}

@media (max-width: 1100px) {
  .topbar-search__input:focus {
    width: 14rem;
  }
}

@media (max-width: 860px) {
  .topbar {
    padding: 0 1rem;
  }

  .topbar-search {
    display: none;
  }

  .topbar-divider {
    display: none;
  }

  .topbar-action {
    display: none;
  }
}

@media (max-width: 640px) {
  .topbar {
    height: 4rem;
  }

  .topbar-title {
    font-size: 1rem;
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topbar-left,
  .topbar-right {
    gap: 0.5rem;
  }

  .topbar-icon-btn {
    padding: 0.5rem;
  }
}
</style>
