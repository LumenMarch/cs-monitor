import { cn } from '@/utils/cn'

/**
 * 流动性排行 · 设计原型预览
 * 后端目前没有挂单数(listings)聚合接口,SteamDT 也不返回历史 listings。
 * 这里保留占位演示,数据为本地常量,顶部展示 mock-only 提示。
 */
interface Row {
  id: number
  name: string
  listings: number
}

const ROWS: Row[] = [
  { id: 1, name: 'Crimson Trace · FT', listings: 47 },
  { id: 2, name: 'Glacier Echo · MW', listings: 38 },
  { id: 3, name: 'Sirocco Drift · FT', listings: 26 },
  { id: 4, name: 'Veil of Atlas · FN', listings: 19 },
  { id: 5, name: 'Pale Lantern · MW', listings: 11 },
  { id: 6, name: 'Ember Brand · BS', listings: 6 },
]

const MAX_LISTINGS = 80

export function LiquidityRanking() {
  return (
    <div>
      <div className="mb-2 font-mono text-[9.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
        mock preview · listings aggregation pending backend support
      </div>
      {ROWS.map((w, i) => {
        const pct = (w.listings / MAX_LISTINGS) * 100
        return (
          <div
            key={w.id}
            className={cn(
              'grid items-center gap-3 py-2.5',
              i < ROWS.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
            )}
            style={{ gridTemplateColumns: 'minmax(0,1fr) 60px 40px' }}
          >
            <div className="text-[13px] truncate">{w.name}</div>
            <div className="h-1 bg-[var(--hairline)] rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0 bg-[var(--ink-2)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="font-mono text-right text-[12px] text-[var(--muted)]">
              {w.listings}
            </div>
          </div>
        )
      })}
    </div>
  )
}
