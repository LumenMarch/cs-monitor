import { COLLECTIONS } from '@/data/mock'
import { cn } from '@/utils/cn'

/** 调度器采集 log · design.md §4 */
export function CollectionsFeed() {
  return (
    <div>
      <div className="flex gap-3 items-baseline mb-2">
        <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Recent collections
        </div>
        <div className="font-mono text-[10.5px] text-[var(--muted)] ml-auto">
          HH:MM · n items · status · ms
        </div>
      </div>
      <div>
        {COLLECTIONS.map((c, i) => (
          <div
            key={i}
            className={cn(
              'grid items-center gap-3 py-[10px] font-mono text-[12px]',
              i < COLLECTIONS.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
            )}
            style={{ gridTemplateColumns: '60px 1fr auto' }}
          >
            <div className="text-[var(--muted)]">{c.time}</div>
            <div className="flex items-center gap-2">
              <span
                className="w-[6px] h-[6px] rounded-full"
                style={{
                  background:
                    c.status === 'ok' ? 'var(--up)' : c.status === 'warn' ? 'var(--accent)' : 'var(--down)',
                }}
              />
              <span>
                {c.items} items · {c.duration}
              </span>
              {c.note && <span className="text-[var(--muted)] text-[11px]">· {c.note}</span>}
            </div>
            <div
              className={cn(
                'text-[11px] uppercase tracking-[0.1em]',
                c.status === 'ok'
                  ? 'text-[var(--up)]'
                  : c.status === 'warn'
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--down)]',
              )}
            >
              {c.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
