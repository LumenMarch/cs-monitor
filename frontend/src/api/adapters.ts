import type { Alert, PlatformPrice, WatchItem, Wear, Category } from '@/data/mock'
import type {
  AlertRecord,
  PlatformPriceItem,
  WatchlistItemWithPrice,
} from './types'

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
/**
 * 后端 alert_type 字符串 → UI kind
 * 实际值:price_surge / price_drop / price_change / quantity_change / both
 */
export function mapAlertKind(alertType: string, changePercent?: number | null): 'surge' | 'drop' | 'qty' {
  if (alertType === 'quantity_change') return 'qty'
  if (alertType === 'price_surge') return 'surge'
  if (alertType === 'price_drop') return 'drop'
  // price_change / both — 按 change_percent 正负决定
  if ((changePercent ?? 0) >= 0) return 'surge'
  return 'drop'
}

/** 后端 AlertRecord → 前端 Alert · 缺失字段降级 */
export function backendToAlert(it: AlertRecord): Alert {
  const wearMatch = it.market_hash_name.match(WEAR_RE)
  const wear: Wear = wearMatch ? WEAR_FULL_TO_CODE[wearMatch[1]!] ?? 'FT' : 'FT'
  const cleanName = (it.display_name ?? it.market_hash_name.replace(WEAR_RE, '')).trim()
  const ts = new Date(it.notified_at)
  const hh = String(ts.getHours()).padStart(2, '0')
  const mm = String(ts.getMinutes()).padStart(2, '0')
  return {
    id: it.id,
    time: `${hh}:${mm}`,
    kind: mapAlertKind(it.alert_type, it.change_percent),
    name: cleanName,
    wear,
    desc: descFromType(it.alert_type, it.change_percent),
    delta: it.change_percent ?? 0,
    price: it.current_price ?? 0,
    platform: '',
  }
}

function descFromType(type: string, change?: number | null): string {
  const pct = change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''
  switch (type) {
    case 'price_surge':
      return `Price surge ${pct} vs baseline`
    case 'price_drop':
      return `Price drop ${pct} vs baseline`
    case 'quantity_change':
      return 'Quantity changed · extreme tracker'
    case 'price_change':
      return `Price change ${pct} · extreme tracker`
    case 'both':
      return `Price + quantity ${pct} · extreme tracker`
    default:
      return type
  }
}

/** 后端 PlatformPriceItem[] → 前端 PlatformPrice[] · 缺失字段补默认 */
export function backendToPlatformPrices(items: PlatformPriceItem[]): PlatformPrice[] {
  return items.map((it) => {
    const name = it.platform
    // 前两位作 code,大写
    const code = name.substring(0, 2).toUpperCase()
    return {
      name,
      code,
      price: it.price,
      listings: 0, // 后端暂无
      change: 0, // 后端暂无 24h 涨跌
    }
  })
}

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
