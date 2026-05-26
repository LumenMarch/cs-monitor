import client from './client'
import type {
  AlertRecord,
  AlertStatsResponse,
  DashboardSummary,
  KlineResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  PlatformPriceItem,
  WatchlistItemCreate,
  WatchlistItemUpdate,
  WatchlistItemWithPrice,
} from './types'

/* —— Auth —— */

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', req)
  return data
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await client.get<MeResponse>('/auth/me')
  return data
}

/* —— Dashboard —— */

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await client.get<DashboardSummary>('/dashboard/summary')
  return data
}

/* —— Watchlist —— */

export async function fetchWatchlist(): Promise<WatchlistItemWithPrice[]> {
  const { data } = await client.get<WatchlistItemWithPrice[]>('/watchlist')
  return data
}

export async function createWatchlistItem(payload: WatchlistItemCreate): Promise<unknown> {
  const { data } = await client.post('/watchlist', payload)
  return data
}

export async function updateWatchlistItem(
  marketHashName: string,
  payload: WatchlistItemUpdate,
): Promise<unknown> {
  const { data } = await client.put(`/watchlist/${encodeURIComponent(marketHashName)}`, payload)
  return data
}

export async function deleteWatchlistItem(marketHashName: string): Promise<void> {
  await client.delete(`/watchlist/${encodeURIComponent(marketHashName)}`)
}

export async function refreshWatchlist(): Promise<unknown> {
  const { data } = await client.post('/watchlist/refresh')
  return data
}

/* —— Alerts —— */

export interface AlertsListParams {
  page?: number
  limit?: number
  alert_type?: string
  start_date?: string
  end_date?: string
  market_hash_name?: string
}

export async function fetchAlerts(params: AlertsListParams = {}): Promise<{
  items: AlertRecord[]
  total: number
}> {
  const { data } = await client.get('/alerts', { params })
  return data
}

export interface AlertStatsParams {
  start_date?: string
  end_date?: string
}

export async function fetchAlertStats(params: AlertStatsParams = {}): Promise<AlertStatsResponse> {
  const { data } = await client.get<AlertStatsResponse>('/alerts/stats', { params })
  return data
}

/* —— K-line —— */

export interface KlineParams {
  /** SteamDT period:1=hour, 2=day, 3=week, 4=month */
  period?: number
  count?: number
  platform?: string
}

export async function fetchKline(
  marketHashName: string,
  params: KlineParams = {},
): Promise<KlineResponse> {
  const { data } = await client.get<KlineResponse>(
    `/kline/${encodeURIComponent(marketHashName)}`,
    { params },
  )
  return data
}

/* —— Prices —— */

export async function fetchPlatformPrices(marketHashName: string): Promise<PlatformPriceItem[]> {
  const { data } = await client.get<PlatformPriceItem[]>(
    `/prices/${encodeURIComponent(marketHashName)}/platforms`,
  )
  return data
}
