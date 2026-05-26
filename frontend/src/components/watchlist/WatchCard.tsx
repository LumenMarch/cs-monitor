import { useNavigate } from 'react-router-dom'
import type { WatchItem } from '@/data/mock'
import { ItemTile } from '@/components/ui/ItemTile'
import { Sparkline } from '@/components/ui/Sparkline'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  item: WatchItem
}

/**
 * 卡片视图 · design.md §4 (watch-cards)
 * meta header(分类·磨损 / live/paused)+ lg tile + 名 + 价/24h + 30 日 sparkline + 阈值/7d
 */
export function WatchCard({ item }: Props) {
  const navigate = useNavigate()
  const isUp = item.change24 >= 0
  const isUp7 = item.change7d >= 0

  return (
    <article
      onClick={() => navigate(`/item/${item.id}`)}
      className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] overflow-hidden cursor-pointer flex flex-col transition-[border] duration-[120ms] hover:border-[var(--ink-2)]"
    >
      <div className="flex justify-between items-center px-[14px] py-3 font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em] uppercase border-b border-[var(--hairline)]">
        <span>
          {item.category} · {item.wear}
        </span>
        <span>{item.monitoring ? '● live' : '○ paused'}</span>
      </div>
      <ItemTile size="lg" label={item.name} className="w-full !h-[78px]" />
      <div className="px-4 py-[14px] pb-[18px] flex flex-col gap-2.5">
        <h3 className="font-serif font-normal text-[22px] m-0 leading-[1.15] tracking-[-0.005em]">
          {item.name}
        </h3>
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-[20px] tnum text-[var(--ink)]">
            {formatCurrency(item.price)}
          </span>
          <span
            className={cn('font-mono text-[12px]', isUp ? 'text-[var(--up)]' : 'text-[var(--down)]')}
          >
            {formatDelta(item.change24)} <span className="text-[var(--muted)]">24h</span>
          </span>
        </div>
        <Sparkline data={item.series.slice(-30)} width={300} height={36} />
        <div className="flex justify-between font-mono text-[11px] text-[var(--muted)]">
          <span>thresh · {item.threshold}%</span>
          <span className={isUp7 ? 'text-[var(--up)]' : 'text-[var(--down)]'}>
            {formatDelta(item.change7d, 1)} 7d
          </span>
        </div>
      </div>
    </article>
  )
}
