import axios from 'axios'
import { toastError, toastWarning } from '@/composables/useToast'

const TOKEN_STORAGE_KEY = 'cs-monitor.access_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request 拦截器：注入 JWT + 请求日志
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data || '')
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response 拦截器：错误处理 + 401/403 自动跳转
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`)
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail || error.message || '未知错误'
    const url = error.config?.url || ''

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[API] ${error.config?.method?.toUpperCase()} ${url} -> ${status}:`, detail)
    }

    // 401：token 过期/无效 → 清 token 跳登录页（避免在 login 接口本身的 401 上死循环）
    if (status === 401 && !url.includes('/auth/login')) {
      clearStoredToken()
      const isOnLoginPage = window.location.pathname === '/login'
      if (!isOnLoginPage) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      }
    }

    // 403 + X-Password-Change-Required → 强制改密
    if (
      status === 403
      && error.response?.headers?.['x-password-change-required'] === '1'
      && !window.location.pathname.startsWith('/change-password')
    ) {
      window.location.href = '/change-password'
    }

    if (status >= 500) {
      toastError(`服务器错误 (${status})：${detail}`)
    } else if (status === 429) {
      toastWarning('请求过于频繁，请稍后再试')
    }

    return Promise.reject(error)
  },
)

export interface VolatileItem {
  market_hash_name: string
  display_name: string | null
  current_price: number | null
  change_percent: number
  sparkline: number[]
}

export interface DashboardSummary {
  active_watchlist: number
  extreme_track_count: number
  today_alert_count: number
  yesterday_alert_count: number
  latest_price_count: number
  last_update: string | null
  today_collection_count: number
  check_interval_minutes: number
  portfolio_history: { date: string; value: number }[]
  top_volatile: VolatileItem[]
  api_quota_percent: number
  watchlist_sparkline: number[]
}

export interface WatchlistItem {
  id: number
  market_hash_name: string
  display_name: string | null
  threshold_percent: number
  enabled: number
  created_at: string | null
  updated_at: string | null
}

export interface PlatformPriceMini {
  platform: string
  price: number
}

export interface WatchlistItemWithPrice {
  id: number
  market_hash_name: string
  display_name: string | null
  threshold_percent: number
  enabled: number
  latest_price: number | null
  platform: string | null
  price_updated_at: string | null
  change_24h: number | null
  sparkline: number[]
  platform_prices: PlatformPriceMini[]
  icon_url?: string | null
  yesterday_close: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AlertRecord {
  id: number
  market_hash_name: string
  display_name: string | null
  alert_type: string
  current_price: number | null
  baseline_price: number | null
  change_percent: number | null
  notified_at: string
}

export interface ExtremeAlertRecord {
  id: number
  market_hash_name: string
  display_name: string | null
  platform: string
  alert_type: string
  prev_price: number | null
  curr_price: number | null
  price_change_percent: number | null
  prev_quantity: number | null
  curr_quantity: number | null
  quantity_change_percent: number | null
  notified_at: string
}

export interface AlertListResponse {
  items: AlertRecord[]
  total: number
  page: number
  limit: number
}

export interface ExtremeAlertListResponse {
  items: ExtremeAlertRecord[]
  total: number
  page: number
  limit: number
}

export interface AlertStatsItem {
  date: string
  alert_type: string
  count: number
}

export interface AlertStatsResponse {
  total: number
  by_day: AlertStatsItem[]
  by_type: AlertStatsItem[]
}

export interface PriceHistoryItem {
  id: number
  market_hash_name: string
  platform: string
  price: number
  recorded_at: string
}

export interface PlatformPriceItem {
  market_hash_name: string
  platform: string
  price: number
  recorded_at: string
}

export interface CreateWatchlistPayload {
  market_hash_name: string
  display_name?: string | null
  threshold_percent?: number
  enabled?: boolean
}

export interface UpdateWatchlistPayload {
  display_name?: string | null
  threshold_percent?: number
  enabled?: boolean
}

export interface ExtremeTrackConfig {
  id: number
  market_hash_name: string
  display_name: string | null
  platform: string
  interval_seconds: number
  enabled: number
  price_track_enabled: number
  price_change_mode: string
  price_threshold_percent: number
  quantity_track_enabled: number
  quantity_change_mode: string
  quantity_threshold_percent: number
  alert_cooldown_seconds: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  icon_url?: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateExtremeTrackPayload {
  market_hash_name: string
  platform: string
  interval_seconds?: number
  enabled?: boolean
  price_track_enabled?: boolean
  price_change_mode?: string
  price_threshold_percent?: number
  quantity_track_enabled?: boolean
  quantity_change_mode?: string
  quantity_threshold_percent?: number
  alert_cooldown_seconds?: number
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
}

export interface UpdateExtremeTrackPayload {
  interval_seconds?: number
  enabled?: boolean
  price_track_enabled?: boolean
  price_change_mode?: string
  price_threshold_percent?: number
  quantity_track_enabled?: boolean
  quantity_change_mode?: string
  quantity_threshold_percent?: number
  alert_cooldown_seconds?: number
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
}

export interface NotifySettings {
  notify_channel: string
  wecom_webhook_url: string
  telegram_bot_token: string
  telegram_chat_id: string
  serverchan_sendkey: string
}

export interface KlineDataItem {
  date: string
  timestamp?: number
  open: number
  close: number
  high: number
  low: number
  volume: number
}

export interface KlineResponse {
  market_hash_name: string
  period: number
  data: KlineDataItem[]
}

export interface ArbitrageItem {
  market_hash_name: string
  min_price: number
  min_platform: string
  max_price: number
  max_platform: string
  spread: number
  spread_percent: number
  platforms: PlatformPriceItem[]
}

export interface DailyPricePoint {
  date: string
  price: number
}

export interface TrendAnalysisResponse {
  market_hash_name: string
  trend: string
  daily_prices: DailyPricePoint[]
  ma5: (number | null)[]
  ma10: (number | null)[]
  ma20: (number | null)[]
}

export interface RefreshItemResult {
  market_hash_name: string
  ok: boolean
  latest_price: number | null
  platform_count: number
  error: string | null
}

export interface RefreshResponse {
  total: number
  success: number
  failed: number
  duration_ms: number
  items: RefreshItemResult[]
}

/** 本地搜索结果项 */
// ============================================================
// 认证与用户管理（v2 多用户）
// ============================================================
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user_id: number
  username: string
  role: string
  requires_password_change: boolean
}

export interface MeResponse {
  id: number
  username: string
  role: string
  must_change_password: boolean
  has_steamdt_key: boolean
  created_at: string | null
  last_login_at: string | null
}

export interface UserResponse {
  id: number
  username: string
  role: string
  is_active: boolean
  must_change_password: boolean
  has_steamdt_key: boolean
  created_at: string | null
  last_login_at: string | null
}

export interface CreateUserPayload {
  username: string
  password: string
  role: 'admin' | 'user'
  must_change_password: boolean
}

export interface UpdateUserPayload {
  role?: 'admin' | 'user'
  is_active?: boolean
}

export interface ResetPasswordPayload {
  new_password: string
  must_change_password: boolean
}

export interface SearchItemResult {
  market_hash_name: string
  name: string | null
  icon_url?: string | null
}

/** 实时价格查询结果 */
export interface ItemPriceResult {
  market_hash_name: string
  display_name: string | null
  dataList: { platform: string; sellPrice: number }[]
  in_watchlist: boolean
}

export default {
  // ─── 认证 ──────────────────────────────────────────────
  login(payload: { username: string; password: string }) {
    return api.post<LoginResponse>('/auth/login', payload)
  },
  me() {
    return api.get<MeResponse>('/auth/me')
  },
  changePassword(payload: { current_password: string; new_password: string }) {
    return api.post('/auth/change-password', payload)
  },
  setSteamdtKey(api_key: string) {
    return api.put('/auth/steamdt-key', { api_key })
  },
  deleteSteamdtKey() {
    return api.delete('/auth/steamdt-key')
  },

  // ─── 用户管理（仅 admin）───────────────────────────────
  listUsers(include_inactive = false) {
    return api.get<UserResponse[]>('/users', { params: { include_inactive } })
  },
  createUser(payload: CreateUserPayload) {
    return api.post<UserResponse>('/users', payload)
  },
  updateUser(id: number, payload: UpdateUserPayload) {
    return api.patch<UserResponse>(`/users/${id}`, payload)
  },
  resetUserPassword(id: number, payload: ResetPasswordPayload) {
    return api.post(`/users/${id}/reset-password`, payload)
  },
  deleteUser(id: number) {
    return api.delete(`/users/${id}`)
  },

  // ─── 业务接口（保持不变）────────────────────────────────
  health() {
    return api.get('/health')
  },
  dashboardSummary() {
    return api.get<DashboardSummary>('/dashboard/summary')
  },
  watchlist() {
    return api.get<WatchlistItemWithPrice[]>('/watchlist')
  },
  createWatchlistItem(payload: CreateWatchlistPayload) {
    return api.post<WatchlistItem>('/watchlist', payload)
  },
  updateWatchlistItem(marketHashName: string, payload: UpdateWatchlistPayload) {
    return api.put<WatchlistItem>(`/watchlist/${encodeURIComponent(marketHashName)}`, payload)
  },
  deleteWatchlistItem(marketHashName: string) {
    return api.delete(`/watchlist/${encodeURIComponent(marketHashName)}`)
  },
  alerts(page = 1, limit = 10, params?: { alert_type?: string; start_date?: string; end_date?: string; market_hash_name?: string }) {
    return api.get<AlertListResponse>('/alerts', { params: { page, limit, ...params } })
  },
  alertStats(params?: { start_date?: string; end_date?: string }) {
    return api.get<AlertStatsResponse>('/alerts/stats', { params })
  },
  extremeAlerts(page = 1, limit = 10, params?: { alert_type?: string; start_date?: string; end_date?: string; market_hash_name?: string }) {
    return api.get<ExtremeAlertListResponse>('/extreme-track/alerts', { params: { page, limit, ...params } })
  },
  priceHistory(marketHashName: string, days?: number, platform?: string) {
    return api.get<PriceHistoryItem[]>(`/prices/${encodeURIComponent(marketHashName)}/history`, {
      params: { days, platform },
    })
  },
  platformPrices(marketHashName: string) {
    return api.get<PlatformPriceItem[]>(`/prices/${encodeURIComponent(marketHashName)}/platforms`)
  },
  extremeTrackList() {
    return api.get<ExtremeTrackConfig[]>('/extreme-track')
  },
  extremeTrackSnapshots() {
    return api.get<{ market_hash_name: string; platform: string; price: number; quantity: number; recorded_at: string }[]>('/extreme-track/snapshots')
  },
  createExtremeTrack(payload: CreateExtremeTrackPayload) {
    return api.post<ExtremeTrackConfig>('/extreme-track', payload)
  },
  updateExtremeTrack(marketHashName: string, platform: string, payload: UpdateExtremeTrackPayload) {
    return api.put<ExtremeTrackConfig>(`/extreme-track/${encodeURIComponent(marketHashName)}/${encodeURIComponent(platform)}`, payload)
  },
  deleteExtremeTrack(marketHashName: string, platform: string) {
    return api.delete(`/extreme-track/${encodeURIComponent(marketHashName)}/${encodeURIComponent(platform)}`)
  },
  toggleExtremeTrack(marketHashName: string, platform: string) {
    return api.post(`/extreme-track/${encodeURIComponent(marketHashName)}/${encodeURIComponent(platform)}/toggle`)
  },
  getNotifySettings() {
    return api.get<NotifySettings>('/settings/notify')
  },
  updateNotifySettings(payload: Partial<NotifySettings>) {
    return api.put('/settings/notify', payload)
  },
  testNotify(channel?: string, extra?: Record<string, any>) {
    return api.post('/settings/notify/test', { channel, extra })
  },
  systemInfo() {
    return api.get<{ version: string; db_path: string; db_size: number; db_size_human: string; data_dir: string; watchlist_count: number; extreme_track_count: number }>('/settings/system')
  },
  exportDb() {
    return api.get('/settings/db/export', { responseType: 'blob' })
  },
  clearDb() {
    return api.post('/settings/db/clear?confirm=true')
  },
  kline(marketHashName: string, period?: number, count?: number, platform?: string) {
    return api.get<KlineResponse>(`/kline/${encodeURIComponent(marketHashName)}`, {
      params: { period, count, platform },
    })
  },
  arbitrage() {
    return api.get<ArbitrageItem[]>('/arbitrage')
  },
  arbitrageItem(marketHashName: string) {
    return api.get<ArbitrageItem>(`/arbitrage/${encodeURIComponent(marketHashName)}`)
  },
  trends(marketHashName: string, days?: number) {
    return api.get<TrendAnalysisResponse>(`/trends/${encodeURIComponent(marketHashName)}`, {
      params: { days },
    })
  },
  searchItemPrice(q: string) {
    return api.get('/prices/search', { params: { q } })
  },
  /** 本地模糊搜索饰品（不查实时价格） */
  searchItems(q: string, limit = 20) {
    return api.get<SearchItemResult[]>('/prices/search', { params: { q, limit } })
  },
  /** 通过精确 marketHashName 查实时价格 */
  lookupItemPrice(marketHashName: string) {
    return api.get<ItemPriceResult>('/prices/lookup', { params: { market_hash_name: marketHashName } })
  },
  refreshWatchlist(marketHashNames?: string[] | null) {
    return api.post<RefreshResponse>('/watchlist/refresh', {
      market_hash_names: marketHashNames ?? null,
    })
  },
  /** 获取饰品图标 URL（优先数据库缓存） */
  getItemIcon(marketHashName: string) {
    return api.get<{ market_hash_name: string; icon_url: string | null }>(
      `/prices/items/${encodeURIComponent(marketHashName)}/icon`,
    )
  },
  /** 批量同步所有缺少图标的饰品 */
  syncItemIcons() {
    return api.post<{ synced: number; total: number; message?: string }>('/prices/items/icons/sync')
  },
}
