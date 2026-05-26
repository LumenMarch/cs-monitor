import { WATCHLIST } from '@/data/mock'
import { cn } from '@/utils/cn'

/** 流动性排行 · design.md(Analytics) */
export function LiquidityRanking() {
  const rows = WATCHLIST.slice(0, 6).map((w, i) => {
    const listings = 8 + ((i * 13) % 60)
    return { ...w, listings }
  })
  const maxListings = 80

  return (
    <div>
      {rows.map((w, i) => {
        const pct = (w.listings / maxListings) * 100
        return (
          <div
            key={w.id}
            className={cn(
              'grid items-center gap-3 py-2.5',
              i < rows.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
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
            <div className="font-mono text-right text-[12px] text-[var(--muted)]">{w.listings}</div>
          </div>
        )
      })}
    </div>
  )
}
