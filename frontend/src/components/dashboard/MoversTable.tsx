import { useNavigate } from 'react-router-dom'
import { Sparkline } from '@/components/ui/Sparkline'
import { WATCHLIST, type WatchItem } from '@/data/mock'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  side: 'up' | 'down'
}

/**
 * 涨/跌榜单一栏 · design.md §3 cols 配方
 * 5 列:rank(20) · name(1fr) · sparkline(50) · price(70) · change(56)
 */
export function MoversList({ side }: Props) {
  const navigate = useNavigate()
  const data: WatchItem[] = [...WATCHLIST]
    .sort((a, b) => (side === 'up' ? b.change24 - a.change24 : a.change24 - b.change24))
    .slice(0, 5)

  return (
    <div>
      <div
        className={cn(
          'font-mono text-[10.5px] tracking-[0.18em] uppercase mb-1.5',
          side === 'up' ? 'text-[var(--up)]' : 'text-[var(--down)]',
        )}
      >
        {side === 'up' ? 'Gainers' : 'Losers'}
      </div>
      <div className="flex flex-col">
        {data.map((item, i) => {
          const isUp = item.change24 >= 0
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="grid items-center gap-2 py-[9px] border-b border-dashed border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)] text-left cursor-pointer w-full"
              style={{ gridTemplateColumns: '20px minmax(0,1fr) 50px 70px 56px' }}
            >
              <span className="font-mono text-[11px] text-[var(--muted-2)] text-right">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[12.5px] text-[var(--ink)] truncate">
                {item.name}
                <span className="font-mono text-[10px] text-[var(--muted-2)] tracking-[0.08em] uppercase ml-1.5">
                  {item.wear}
                </span>
              </span>
              <div className="flex items-center justify-center">
                <Sparkline data={item.series.slice(-14)} width={48} height={20} withArea={false} />
              </div>
              <span className="font-mono text-[11.5px] tnum text-right text-[var(--ink)]">
                {formatCurrency(item.price, false)}
              </span>
              <span
                className={cn(
                  'font-mono text-[11.5px] tnum text-right',
                  isUp ? 'text-[var(--up)]' : 'text-[var(--down)]',
                )}
              >
                {formatDelta(item.change24)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 涨跌并列双栏 · 中分虚线
 */
export function MoversSplit() {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: '1fr 1px 1fr', gap: 24 }}>
      <MoversList side="up" />
      <div className="w-px bg-[var(--hairline)] self-stretch" />
      <MoversList side="down" />
    </div>
  )
}
