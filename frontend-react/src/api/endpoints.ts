import client from './client'
import type {
  AlertRecord,
  DashboardSummary,
  LoginRequest,
  LoginResponse,
  MeResponse,
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
