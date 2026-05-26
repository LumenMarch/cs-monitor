import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchAlerts, fetchWatchlist } from '@/api/endpoints'
import { backendToAlert } from '@/api/adapters'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  limit?: number
}

/**
 * Alert feed · 接 /alerts(limit=N,最近时间倒序)
 * 行布局:时间 + 颜色点 + 文案 + Δ%/价格
 * 点击跳详情(用 watchlist 把 market_hash_name 映射回 id)
 */
export function AlertFeed({ limit = 6 }: Props) {
  const navigate = useNavigate()

  const alertsQ = useQuery({
    queryKey: ['alerts', { page: 1, limit }],
    queryFn: () => fetchAlerts({ page: 1, limit }),
    staleTime: 30_000,
  })

  // 用 watchlist 把 market_hash_name 映射成路由 id
  const wlQ = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
  })
  const nameToId = new Map(
    (wlQ.data ?? []).map((w) => [w.market_hash_name, w.id] as const),
  )

  if (alertsQ.isLoading) {
    return <div className="py-3 font-mono text-[11px] text-[var(--muted)]">Loading…</div>
  }
  if (alertsQ.isError) {
    return (
      <div className="py-3 font-mono text-[11px] text-[var(--down)]">
        Failed to load alerts
      </div>
    )
  }

  const items = (alertsQ.data?.items ?? []).slice(0, limit).map((raw) => ({
    raw,
    ui: backendToAlert(raw),
  }))

  if (items.length === 0) {
    return (
      <div className="py-3 font-mono text-[11px] text-[var(--muted)]">
        No alerts in the last window
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {items.map(({ raw, ui }, i) => {
        const isUp = ui.delta >= 0
        const marker =
          ui.kind === 'surge'
            ? 'bg-[var(--up)]'
            : ui.kind === 'drop'
              ? 'bg-[var(--down)]'
              : 'bg-[var(--accent)]'
        const id = nameToId.get(raw.market_hash_name)
        const navTo = () => id && navigate(`/item/${id}`)
        return (
          <button
            key={raw.id}
            onClick={navTo}
            disabled={!id}
            className={cn(
              'grid gap-3 py-3 items-center text-left cursor-pointer disabled:cursor-default',
              i < items.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
              id && 'hover:bg-[var(--surface)]',
            )}
            style={{ gridTemplateColumns: '56px 6px 1fr auto' }}
          >
            <div className="font-mono text-[11px] text-[var(--muted)]">{ui.time}</div>
            <span className={cn('w-[6px] h-[6px] rounded-full mx-auto', marker)} />
            <div className="min-w-0 text-[13px] text-[var(--ink)]">
              <div className="truncate">
                {ui.name}{' '}
                <span className="font-mono text-[10px] text-[var(--muted-2)] tracking-[0.08em]">
                  {ui.wear}
                </span>
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-[2px] truncate">
                {ui.desc}
              </div>
            </div>
            <div
              className={cn(
                'font-mono text-[12.5px] tnum text-right',
                isUp ? 'text-[var(--up)]' : 'text-[var(--down)]',
              )}
            >
              {formatDelta(ui.delta)}
              <div className="text-[10px] text-[var(--muted)] mt-[2px]">
                {ui.price > 0 ? `¥${formatCurrency(ui.price, false)}` : '—'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
