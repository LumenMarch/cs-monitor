import client from './client'
import type {
  AlertRecord,
  AlertStatsResponse,
  DashboardSummary,
  ExtremeAlertListResponse,
  ExtremeTrackConfig,
  ExtremeTrackConfigCreate,
  ExtremeTrackSnapshot,
  KlineResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  NotifySettings,
  NotifyTestRequest,
  PlatformPriceItem,
  SearchItem,
  SystemInfo,
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

export async function updateSteamdtKey(apiKey: string): Promise<void> {
  await client.put('/auth/steamdt-key', { api_key: apiKey })
}

export async function deleteSteamdtKey(): Promise<void> {
  await client.delete('/auth/steamdt-key')
}

/* —— System info —— */

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const { data } = await client.get<SystemInfo>('/settings/system')
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

export async function searchItems(q: string, limit = 20): Promise<SearchItem[]> {
  const { data } = await client.get<SearchItem[]>('/prices/search', {
    params: { q, limit },
  })
  return data
}

/* —— Extreme Track —— */

export async function fetchExtremeTracks(): Promise<ExtremeTrackConfig[]> {
  const { data } = await client.get<ExtremeTrackConfig[]>('/extreme-track')
  return data
}

export async function createExtremeTrack(
  payload: ExtremeTrackConfigCreate,
): Promise<ExtremeTrackConfig> {
  const { data } = await client.post<ExtremeTrackConfig>('/extreme-track', payload)
  return data
}

export async function fetchExtremeSnapshots(): Promise<ExtremeTrackSnapshot[]> {
  const { data } = await client.get<ExtremeTrackSnapshot[]>('/extreme-track/snapshots')
  return data
}

export interface ExtremeAlertsParams {
  page?: number
  limit?: number
  alert_type?: string
  start_date?: string
  end_date?: string
  market_hash_name?: string
}

export async function fetchExtremeAlerts(
  params: ExtremeAlertsParams = {},
): Promise<ExtremeAlertListResponse> {
  const { data } = await client.get<ExtremeAlertListResponse>('/extreme-track/alerts', { params })
  return data
}

export async function toggleExtremeTrack(
  marketHashName: string,
  platform: string,
): Promise<{ market_hash_name: string; platform: string; enabled: boolean }> {
  const { data } = await client.post(
    `/extreme-track/${encodeURIComponent(marketHashName)}/${encodeURIComponent(platform)}/toggle`,
  )
  return data
}

export async function deleteExtremeTrack(
  marketHashName: string,
  platform: string,
): Promise<void> {
  await client.delete(
    `/extreme-track/${encodeURIComponent(marketHashName)}/${encodeURIComponent(platform)}`,
  )
}

/* —— Notify settings(admin only) —— */

export async function fetchNotifySettings(): Promise<NotifySettings> {
  const { data } = await client.get<NotifySettings>('/settings/notify')
  return data
}

export async function updateNotifySettings(payload: NotifySettings): Promise<void> {
  await client.put('/settings/notify', payload)
}

export async function testNotify(payload: NotifyTestRequest = {}): Promise<void> {
  await client.post('/settings/notify/test', payload)
}

/* —— Database admin —— */

export async function clearDatabase(): Promise<void> {
  await client.post('/settings/db/clear', null, { params: { confirm: true } })
}

/** 通过 axios(带 token)下载数据库文件,触发浏览器 Save dialog */
export async function downloadDatabase(): Promise<void> {
  const resp = await client.get('/settings/db/export', { responseType: 'blob' })
  const blob = resp.data as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cs_monitor.db'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
