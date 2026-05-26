import type { WatchlistItemWithPrice } from './types'

const WEAR_FULL_TO_CODE: Record<string, 'FN' | 'MW' | 'FT' | 'WW' | 'BS'> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
}

const WEAR_RE = /\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/

export interface NormalizedWatchItem {
  id: number
  marketHashName: string
  /** 去掉 wear 后缀的显示名,例如 "AK-47 | Redline" */
  displayName: string
  wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS' | null
  price: number | null
  change24: number | null
  threshold: number
  monitoring: boolean
  series: number[]
  platform: string | null
  priceUpdatedAt: string | null
  iconUrl: string | null
}

/**
 * 后端 WatchlistItemWithPrice → 前端展示模型
 * - 从 market_hash_name 后缀解析磨损 wear
 * - sparkline 直接用作 series
 * - enabled(0/1) → monitoring(boolean)
 */
export function normalizeWatchItem(it: WatchlistItemWithPrice): NormalizedWatchItem {
  const match = it.market_hash_name.match(WEAR_RE)
  const wear = match ? WEAR_FULL_TO_CODE[match[1]!] ?? null : null
  const cleanName = it.display_name ?? it.market_hash_name.replace(WEAR_RE, '')

  return {
    id: it.id,
    marketHashName: it.market_hash_name,
    displayName: cleanName,
    wear,
    price: it.latest_price ?? null,
    change24: it.change_24h ?? null,
    threshold: it.threshold_percent,
    monitoring: it.enabled === 1,
    series: it.sparkline ?? [],
    platform: it.platform ?? null,
    priceUpdatedAt: it.price_updated_at ?? null,
    iconUrl: it.icon_url ?? null,
  }
}
