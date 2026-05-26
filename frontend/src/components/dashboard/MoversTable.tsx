import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/api/endpoints'
import { backendToWatchItem } from '@/api/adapters'
import { FlashOnChange } from '@/components/ui/FlashOnChange'
import { Sparkline } from '@/components/ui/Sparkline'
import type { WatchItem } from '@/data/types'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  side: 'up' | 'down'
  /** 上层共享的 watchlist;不传则各自 useQuery(同 key 自动去重) */
  items?: WatchItem[]
}

/**
 * 涨/跌榜单一栏 · 接 /watchlist 真数据
 * 5 列:rank · name · sparkline · price · change
 */
export function MoversList({ side, items }: Props) {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    enabled: !items,
  })

  const data: WatchItem[] = useMemo(() => {
    const src =
      items ?? (query.data ? query.data.map(backendToWatchItem) : [])
    const sorted = [...src].sort((a, b) =>
      side === 'up' ? b.change24 - a.change24 : a.change24 - b.change24,
    )
    return sorted.slice(0, 5)
  }, [items, query.data, side])

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
        {data.length === 0 ? (
          <div className="py-3 font-mono text-[11px] text-[var(--muted)]">
            {query.isLoading ? 'Loading…' : 'No data'}
          </div>
        ) : (
          data.map((item, i) => {
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
                  {item.series.length > 1 ? (
                    <Sparkline
                      data={item.series.slice(-14)}
                      width={48}
                      height={20}
                      withArea={false}
                    />
                  ) : (
                    <span className="text-[10px] text-[var(--muted-2)]">—</span>
                  )}
                </div>
                <span className="font-mono text-[11.5px] tnum text-right text-[var(--ink)]">
                  <FlashOnChange value={item.price}>
                    {item.price > 0 ? formatCurrency(item.price, false) : '—'}
                  </FlashOnChange>
                </span>
                <span
                  className={cn(
                    'font-mono text-[11.5px] tnum text-right',
                    isUp ? 'text-[var(--up)]' : 'text-[var(--down)]',
                  )}
                >
                  <FlashOnChange value={item.change24}>
                    {formatDelta(item.change24)}
                  </FlashOnChange>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * 涨跌并列双栏 · 中分虚线
 * 顶层 useQuery 拉一次 watchlist,两栏共享(避免重复请求)
 */
export function MoversSplit() {
  const query = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
  })
  const items: WatchItem[] = useMemo(
    () => (query.data ?? []).map(backendToWatchItem),
    [query.data],
  )
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: '1fr 1px 1fr', gap: 24 }}>
      <MoversList side="up" items={items} />
      <div className="w-px bg-[var(--hairline)] self-stretch" />
      <MoversList side="down" items={items} />
    </div>
  )
}
