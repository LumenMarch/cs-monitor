import { ALERTS_TODAY } from '@/data/mock'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  limit?: number
}

/** Alert feed · 时间 + marker + 主体 + delta · design.md §4 */
export function AlertFeed({ limit = 6 }: Props) {
  const items = ALERTS_TODAY.slice(0, limit)
  return (
    <div className="flex flex-col">
      {items.map((a, i) => {
        const isUp = a.delta >= 0
        const marker =
          a.kind === 'surge' ? 'bg-[var(--up)]' : a.kind === 'drop' ? 'bg-[var(--down)]' : 'bg-[var(--muted)]'
        return (
          <div
            key={a.id}
            className={cn(
              'grid gap-3 py-3 items-center',
              i < items.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
            )}
            style={{ gridTemplateColumns: '56px 6px 1fr auto' }}
          >
            <div className="font-mono text-[11px] text-[var(--muted)]">{a.time}</div>
            <span className={cn('w-[6px] h-[6px] rounded-full mx-auto', marker)} />
            <div className="min-w-0 text-[13px] text-[var(--ink)]">
              <div className="truncate">
                {a.name}{' '}
                <span className="font-mono text-[10px] text-[var(--muted-2)] tracking-[0.08em]">
                  {a.wear} · {a.platform}
                </span>
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-[2px] truncate">{a.desc}</div>
            </div>
            <div className={cn('font-mono text-[12.5px] tnum text-right', isUp ? 'text-[var(--up)]' : 'text-[var(--down)]')}>
              {formatDelta(a.delta)}
              <div className="text-[10px] text-[var(--muted)] mt-[2px]">¥{formatCurrency(a.price, false)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
