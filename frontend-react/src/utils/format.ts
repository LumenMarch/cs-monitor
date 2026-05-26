/**
 * 格式化工具 · 与 design.md §10 Data Conventions 对齐
 * - 货币 ¥(CNY) 千分位
 * - 涨跌带符号(+/−)两位小数,中文 en-dash 替代 ASCII minus
 * - 时间 24h
 */

const CURRENCY_NF = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INT_NF = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })

export function formatCurrency(n: number, withSymbol = true): string {
  const formatted = CURRENCY_NF.format(Math.abs(n))
  const sign = n < 0 ? '−' : ''
  return `${sign}${withSymbol ? '¥' : ''}${formatted}`
}

/** 整数 / 千分位 */
export function formatInt(n: number): string {
  return INT_NF.format(n)
}

/** 涨跌百分比 · 始终带符号 · 默认 2 位 · en-dash 替 ASCII minus */
export function formatDelta(pct: number, decimals = 2): string {
  const v = pct.toFixed(decimals)
  if (pct > 0) return `+${v}%`
  if (pct < 0) return `−${Math.abs(pct).toFixed(decimals)}%`
  return `${v}%`
}

/** 拆分价格为 主整数 + 小数,用于 hero 双字号渲染 */
export function splitCurrency(n: number): { int: string; frac: string } {
  const [intPart, fracPart = '00'] = n.toFixed(2).split('.')
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return { int: intFmt, frac: fracPart }
}

/** 拆名:"Karambit | Midnight Vein" -> {weapon, finish} */
export function splitItemName(name: string): { weapon: string; finish: string } {
  const [weapon, finish] = name.split(' | ')
  return { weapon: weapon ?? name, finish: finish ?? '' }
}
