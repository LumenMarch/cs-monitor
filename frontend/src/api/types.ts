/**
 * 后端 API 类型 · 与 web/schemas.py 对齐
 * 后端调整时请同步更新
 */

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user_id: number
  username: string
  role: string
  requires_password_change?: boolean
}

export interface MeResponse {
  id: number
  username: string
  role: string
  must_change_password?: boolean
  has_steamdt_key?: boolean
  created_at?: string
  last_login_at?: string
}

export interface VolatileItem {
  market_hash_name: string
  display_name?: string
  current_price?: number
  change_percent: number
  sparkline: number[]
}

export interface DashboardSummary {
  active_watchlist: number
  extreme_track_count: number
  today_alert_count: number
  yesterday_alert_count: number
  latest_price_count: number
  last_update?: string
  today_collection_count: number
  check_interval_minutes: number
  portfolio_history: unknown[]
  top_volatile: VolatileItem[]
  api_quota_percent: number
  watchlist_sparkline: number[]
}

export interface PlatformPriceMini {
  platform: string
  price: number
}

export interface WatchlistItemWithPrice {
  id: number
  market_hash_name: string
  display_name?: string
  threshold_percent: number
  enabled: number
  latest_price?: number
  platform?: string
  price_updated_at?: string
  change_24h?: number
  sparkline: number[]
  platform_prices: PlatformPriceMini[]
  icon_url?: string
  yesterday_close?: number
  created_at?: string
  updated_at?: string
}

export interface WatchlistItemUpdate {
  display_name?: string | null
  threshold_percent?: number | null
  enabled?: boolean | null
}

export interface WatchlistItemCreate {
  market_hash_name: string
  display_name?: string
  threshold_percent?: number
  enabled?: boolean
}

export interface AlertRecord {
  id: number
  market_hash_name: string
  display_name?: string
  alert_type: string
  current_price?: number
  baseline_price?: number
  change_percent?: number
  notified_at: string
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

export interface KlineOhlc {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

export interface KlineResponse {
  market_hash_name: string
  period: number
  data: KlineOhlc[]
}

export interface PlatformPriceItem {
  market_hash_name: string
  platform: string
  price: number
  recorded_at: string
}

export interface SearchItem {
  market_hash_name: string
  name?: string
  icon_url?: string
}
