/**
 * Mock data · 移植自 design 原型 data.js
 * 所有饰品名为原创("Crimson Trace" / "Glacier Echo" 等)以规避 Valve IP
 */

export type Wear = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'
export type Category = 'Rifle' | 'Sniper' | 'Pistol' | 'Knife'

export interface WatchItem {
  id: number
  name: string
  wear: Wear
  category: Category
  price: number
  change24: number
  change7d: number
  threshold: number
  monitoring: boolean
  series: number[]
}

export interface Alert {
  id: number
  time: string
  kind: 'surge' | 'drop' | 'qty'
  name: string
  wear: Wear
  desc: string
  delta: number
  price: number
  platform: string
}

export interface Track {
  id: number
  item: string
  wear: Wear
  platform: string
  interval: string
  type: string
  intensity: number
  lastDelta: string
  listings: number
  live: boolean
}

export interface OHLC {
  open: number
  close: number
  high: number
  low: number
  volume: number
}

export interface PlatformPrice {
  name: string
  code: string
  price: number
  listings: number
  change: number
}

export interface Collection {
  time: string
  items: number
  status: 'ok' | 'warn' | 'err'
  duration: string
  note?: string
}

export interface HeatRow {
  name: string
  wear: Wear
  row: number[]
}

/* —— Deterministic pseudo-random,保证每次刷新数据稳定 —— */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function makeSeries({
  start,
  drift = 0,
  vol = 0.03,
  len = 90,
  seed = 1,
}: {
  start: number
  drift?: number
  vol?: number
  len?: number
  seed?: number
}): number[] {
  const r = seeded(seed)
  const arr: number[] = []
  let p = start
  for (let i = 0; i < len; i++) {
    const step = (r() - 0.5) * 2 * vol * p + drift * p
    p = Math.max(0.01, p + step)
    arr.push(Number(p.toFixed(2)))
  }
  return arr
}

function makeOHLC({
  start,
  len = 60,
  seed = 1,
  vol = 0.04,
  drift = 0,
}: {
  start: number
  len?: number
  seed?: number
  vol?: number
  drift?: number
}): OHLC[] {
  const r = seeded(seed)
  const arr: OHLC[] = []
  let prev = start
  for (let i = 0; i < len; i++) {
    const open = prev
    const close = Math.max(0.01, open + (r() - 0.45 + drift) * vol * open * 2)
    const high = Math.max(open, close) * (1 + r() * vol * 0.4)
    const low = Math.min(open, close) * (1 - r() * vol * 0.4)
    const volume = Math.round(80 + r() * 220)
    arr.push({
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      volume,
    })
    prev = close
  }
  return arr
}

export const WATCHLIST: WatchItem[] = [
  { id: 1, name: 'AK-47 | Crimson Trace', wear: 'FT', category: 'Rifle', price: 142.85, change24: 4.21, change7d: 8.6, threshold: 5, monitoring: true, series: makeSeries({ start: 130, drift: 0.0015, vol: 0.025, seed: 11 }) },
  { id: 2, name: 'AWP | Glacier Echo', wear: 'MW', category: 'Sniper', price: 482.10, change24: -2.74, change7d: -5.1, threshold: 4, monitoring: true, series: makeSeries({ start: 510, drift: -0.001, vol: 0.022, seed: 22 }) },
  { id: 3, name: 'M4A4 | Solar Storm', wear: 'FT', category: 'Rifle', price: 89.40, change24: 1.12, change7d: 2.3, threshold: 5, monitoring: true, series: makeSeries({ start: 86, drift: 0.0005, vol: 0.018, seed: 33 }) },
  { id: 4, name: 'Karambit | Midnight Vein', wear: 'FN', category: 'Knife', price: 1842.00, change24: 6.85, change7d: 12.4, threshold: 6, monitoring: true, series: makeSeries({ start: 1620, drift: 0.002, vol: 0.028, seed: 44 }) },
  { id: 5, name: 'Glock-18 | Paper Lantern', wear: 'FN', category: 'Pistol', price: 12.30, change24: -0.84, change7d: -1.9, threshold: 5, monitoring: true, series: makeSeries({ start: 12.8, drift: -0.0008, vol: 0.02, seed: 55 }) },
  { id: 6, name: 'USP-S | Wolfshade', wear: 'MW', category: 'Pistol', price: 32.75, change24: 0.46, change7d: 1.1, threshold: 5, monitoring: false, series: makeSeries({ start: 32, drift: 0.0003, vol: 0.014, seed: 66 }) },
  { id: 7, name: 'Desert Eagle | Lacquer Dragon', wear: 'FT', category: 'Pistol', price: 64.20, change24: 3.40, change7d: 5.7, threshold: 5, monitoring: true, series: makeSeries({ start: 60, drift: 0.001, vol: 0.022, seed: 77 }) },
  { id: 8, name: 'Bayonet | Frostbite', wear: 'FN', category: 'Knife', price: 968.50, change24: -1.18, change7d: -3.2, threshold: 5, monitoring: true, series: makeSeries({ start: 998, drift: -0.0005, vol: 0.02, seed: 88 }) },
  { id: 9, name: 'M4A1-S | Ivory Path', wear: 'FN', category: 'Rifle', price: 211.40, change24: 5.12, change7d: 9.8, threshold: 5, monitoring: true, series: makeSeries({ start: 190, drift: 0.0018, vol: 0.024, seed: 99 }) },
  { id: 10, name: 'AUG | Static Echo', wear: 'FT', category: 'Rifle', price: 27.90, change24: -0.92, change7d: -2.1, threshold: 5, monitoring: true, series: makeSeries({ start: 28.5, drift: -0.0004, vol: 0.016, seed: 101 }) },
  { id: 11, name: 'Five-SeveN | Tundra Plate', wear: 'MW', category: 'Pistol', price: 41.65, change24: 2.18, change7d: 4.2, threshold: 5, monitoring: true, series: makeSeries({ start: 39, drift: 0.0008, vol: 0.018, seed: 113 }) },
  { id: 12, name: 'SSG 08 | Quiet Crow', wear: 'FN', category: 'Sniper', price: 19.85, change24: 0.31, change7d: 0.8, threshold: 5, monitoring: true, series: makeSeries({ start: 19.5, drift: 0.0002, vol: 0.013, seed: 127 }) },
]

export const ALERTS_TODAY: Alert[] = [
  { id: 1, time: '14:32', kind: 'surge', name: 'Karambit | Midnight Vein', wear: 'FN', desc: 'Crossed 7d high · spike vs 7-day avg', delta: 6.85, price: 1842, platform: 'BUFF' },
  { id: 2, time: '13:08', kind: 'drop', name: 'AWP | Glacier Echo', wear: 'MW', desc: 'Drop vs baseline, listings up 14%', delta: -2.74, price: 482.1, platform: 'YYYP' },
  { id: 3, time: '11:54', kind: 'surge', name: 'M4A1-S | Ivory Path', wear: 'FN', desc: 'Surge vs 7-day avg · cool-down 4h', delta: 5.12, price: 211.4, platform: 'C5' },
  { id: 4, time: '10:21', kind: 'qty', name: 'AK-47 | Crimson Trace', wear: 'FT', desc: 'Listings −8% in 15min · liquidity tight', delta: 4.21, price: 142.85, platform: 'BUFF' },
  { id: 5, time: '09:47', kind: 'drop', name: 'Glock-18 | Paper Lantern', wear: 'FN', desc: 'Tracker triggered: any change', delta: -0.84, price: 12.3, platform: 'STEAM' },
  { id: 6, time: '09:02', kind: 'surge', name: 'Desert Eagle | Lacquer Dragon', wear: 'FT', desc: 'Surge vs 7-day avg, spread 4.1%', delta: 3.4, price: 64.2, platform: 'BUFF' },
  { id: 7, time: '08:14', kind: 'drop', name: 'Bayonet | Frostbite', wear: 'FN', desc: 'Drop vs baseline · 1st of 3 today', delta: -1.18, price: 968.5, platform: 'C5' },
  { id: 8, time: '07:33', kind: 'surge', name: 'Five-SeveN | Tundra Plate', wear: 'MW', desc: 'Surge: short squeeze suspected', delta: 2.18, price: 41.65, platform: 'YYYP' },
]

export const TRACKS: Track[] = [
  { id: 1, item: 'Karambit | Midnight Vein', wear: 'FN', platform: 'BUFF', interval: '5s', type: 'price+qty', intensity: 0.92, lastDelta: '+0.81%', listings: 14, live: true },
  { id: 2, item: 'AWP | Glacier Echo', wear: 'MW', platform: 'YYYP', interval: '10s', type: 'price', intensity: 0.74, lastDelta: '−0.42%', listings: 38, live: true },
  { id: 3, item: 'Bayonet | Frostbite', wear: 'FN', platform: 'C5', interval: '15s', type: 'qty', intensity: 0.51, lastDelta: 'qty −2', listings: 6, live: true },
  { id: 4, item: 'M4A1-S | Ivory Path', wear: 'FN', platform: 'BUFF', interval: '30s', type: 'price', intensity: 0.38, lastDelta: '+0.18%', listings: 22, live: false },
]

export const PLATFORM_PRICES: PlatformPrice[] = [
  { name: 'BUFF', code: 'BF', price: 1842.0, listings: 14, change: 6.85 },
  { name: 'YYYP', code: 'YP', price: 1856.5, listings: 22, change: 5.12 },
  { name: 'C5', code: 'C5', price: 1798.0, listings: 9, change: 7.04 },
  { name: 'STEAM', code: 'ST', price: 2104.6, listings: 41, change: 4.18 },
  { name: 'IGXE', code: 'IX', price: 1820.0, listings: 11, change: 6.22 },
]

export const COLLECTIONS: Collection[] = [
  { time: '14:30', items: 12, status: 'ok', duration: '4.2s' },
  { time: '14:00', items: 12, status: 'ok', duration: '3.8s' },
  { time: '13:30', items: 12, status: 'ok', duration: '4.0s' },
  { time: '13:00', items: 12, status: 'warn', duration: '12.1s', note: '1 platform timeout' },
  { time: '12:30', items: 12, status: 'ok', duration: '4.4s' },
  { time: '12:00', items: 12, status: 'ok', duration: '3.9s' },
]

function makeHeatmap(): HeatRow[] {
  const r = seeded(7)
  return WATCHLIST.slice(0, 8).map((item) => {
    const row: number[] = []
    for (let h = 0; h < 24; h++) {
      const base = Math.abs(item.change24) / 8
      const noise = r() * 0.7
      const peak = h >= 9 && h <= 13 ? 0.3 : 0
      const v = Math.min(1, base + noise * 0.4 + peak * (0.4 + r() * 0.6))
      row.push(v)
    }
    return { name: item.name, wear: item.wear, row }
  })
}

export const HEATMAP: HeatRow[] = makeHeatmap()

export const PORTFOLIO_30D: number[] = makeSeries({ start: 7420, drift: 0.0018, vol: 0.012, len: 30, seed: 314 })
export const PORTFOLIO_90D: number[] = makeSeries({ start: 6810, drift: 0.001, vol: 0.015, len: 90, seed: 271 })
export const PORTFOLIO_7D: number[] = makeSeries({ start: 7480, drift: 0.0025, vol: 0.01, len: 7, seed: 159 })

export const DETAIL_OHLC: OHLC[] = makeOHLC({ start: 1620, len: 60, seed: 808, vol: 0.025, drift: 0.002 })

export const TICKER = WATCHLIST.map((w) => ({
  sym: w.name.split(' | ')[0],
  px: w.price,
  ch: w.change24,
}))

export interface User {
  id: number
  key: string
  name: string
  email: string
  role: 'admin' | 'trader' | 'viewer'
  initials: string
  color: string
}

export const CURRENT_USER: User = {
  id: 1,
  key: 'lumen',
  name: 'Lumen March',
  email: 'lumen@localhost',
  role: 'admin',
  initials: 'LM',
  color: '#c75a2a',
}

/* —— Portfolio hero metrics —— */
export const HERO_METRICS = {
  value: 7635.42,
  changePct: 9.82,
  changeAbs: 682.31,
  itemsTotal: 12,
  itemsMonitoring: 11,
  alertsToday: 8,
  alertsSurge: 5,
  alertsDrop: 3,
  pollsToday: 268,
  pollsTarget: 288,
  topGainer: { name: 'Karambit | Midnight Vein', change: 6.85 },
  topLoser: { name: 'AWP | Glacier Echo', change: -2.74 },
}
