import type { WatchItem, Wear, Category } from '@/data/mock'
import type { WatchlistItemWithPrice } from './types'

const WEAR_FULL_TO_CODE: Record<string, Wear> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
}

const WEAR_RE = /\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/

/** 根据武器前缀粗略归类 */
function inferCategory(name: string): Category {
  const head = name.split(' | ')[0]!.trim()
  if (/^(AK-47|M4A4|M4A1-S|AUG|FAMAS|Galil|SG 553)/i.test(head)) return 'Rifle'
  if (/^(AWP|SSG|SCAR|G3SG1)/i.test(head)) return 'Sniper'
  if (/Knife|Karambit|Bayonet|Daggers|Talon|Stiletto|Bowie|Falchion|Gut|Shadow|Ursus|Huntsman|Navaja|Paracord|Survival|Skeleton|Nomad|Classic/i.test(
    head,
  ))
    return 'Knife'
  return 'Pistol'
}

/**
 * 后端 WatchlistItemWithPrice → 前端 WatchItem(供既有 UI 使用)
 * - 从 market_hash_name 后缀提磨损
 * - 武器前缀推断类目
 * - change_24h 同时映射给 change7d(后端暂无 7d 字段,UI 默认隐藏 7d 列亦可)
 * - sparkline → series
 */
export function backendToWatchItem(it: WatchlistItemWithPrice): WatchItem {
  const match = it.market_hash_name.match(WEAR_RE)
  const wear: Wear = match ? WEAR_FULL_TO_CODE[match[1]!] ?? 'FT' : 'FT'
  const cleanName = (it.display_name ?? it.market_hash_name.replace(WEAR_RE, '')).trim()
  const change = it.change_24h ?? 0
  return {
    id: it.id,
    name: cleanName,
    wear,
    category: inferCategory(cleanName),
    price: it.latest_price ?? 0,
    change24: change,
    change7d: change,
    threshold: it.threshold_percent,
    monitoring: it.enabled === 1,
    series: it.sparkline ?? [],
  }
}
