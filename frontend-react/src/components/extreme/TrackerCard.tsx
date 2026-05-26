import type { Track } from '@/data/mock'
import type { PollEvent } from './types'
import { ItemTile } from '@/components/ui/ItemTile'
import { StatusDot } from '@/components/ui/StatusDot'
import { PulseStrip } from './PulseStrip'
import { cn } from '@/utils/cn'

interface Props {
  t: Track & { history: PollEvent[] }
  now: number
}

/**
 * 单 tracker 卡片 · design.md(Extreme Track §4)
 * - 头部 lg tile + 衬线标题 + meta + 右上 live/paused
 * - PulseStrip 30 次轮询 + 倒计时进度条
 * - 4 列 metric(Last Δ / Listings / Avg ms / 429s)
 * - 底部操作按钮
 */
export function TrackerCard({ t, now }: Props) {
  const intervalSec = parseInt(t.interval) || 30
  const sinceLast = t.live ? now % intervalSec : 0
  const progress = t.live ? sinceLast / intervalSec : 0
  const last = t.history[t.history.length - 1]!
  const avgMs = Math.round(t.history.reduce((a, b) => a + b.ms, 0) / t.history.length)
  const backoffs = t.history.filter((h) => h.status === '429').length

  return (
    <div className="relative bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] p-[18px_20px] flex flex-col gap-3">
      {/* —— Top right status —— */}
      {t.live ? (
        <div className="absolute top-[14px] right-4 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--up)]">
          <StatusDot status="live" pulse />
          Live
        </div>
      ) : (
        <div className="absolute top-[14px] right-4 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Paused
        </div>
      )}

      {/* —— Head —— */}
      <div className="flex items-center gap-3">
        <ItemTile size="lg" label={t.item} />
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[22px] leading-[1.1] tracking-[-0.005em] truncate">{t.item}</div>
          <div className="flex justify-between font-mono text-[11px] text-[var(--muted)] mt-1">
            <span>
              {t.wear} · <span className="text-[var(--ink-2)]">{t.platform}</span> · {t.interval} cadence
              · tracking <span className="text-[var(--accent)]">{t.type}</span>
            </span>
          </div>
        </div>
      </div>

      {/* —— Pulse strip —— */}
      <div>
        <div className="flex justify-between mb-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
          <span>Last 30 polls</span>
          <span>{Math.round(t.intensity * 100)}% intensity</span>
        </div>
        <PulseStrip history={t.history} live={t.live} />
        <div className="flex justify-between mt-1 font-mono text-[9.5px] tracking-[0.1em] text-[var(--muted-2)]">
          <span>−{30 * intervalSec}s</span>
          <span>{t.live ? `next in ${intervalSec - sinceLast}s` : '—'}</span>
          <span>now</span>
        </div>
      </div>

      {/* —— Countdown to next poll —— */}
      {t.live && (
        <div className="h-[2px] bg-[var(--hairline)] rounded-full overflow-hidden relative">
          <div
            className="absolute inset-0 bg-[var(--accent)]"
            style={{ width: `${progress * 100}%`, transition: 'width 1s linear' }}
          />
        </div>
      )}

      {/* —— Metrics 4-up —— */}
      <div className="grid gap-3 font-mono text-[11.5px]" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <Metric
          label="Last Δ"
          value={`${last.delta >= 0 ? '+' : '−'}${Math.abs(last.delta).toFixed(2)}%`}
          color={last.delta >= 0 ? 'var(--up)' : 'var(--down)'}
        />
        <Metric label="Listings" value={t.listings} />
        <Metric label="Avg ms" value={`${avgMs}ms`} />
        <Metric label="429s" value={backoffs} color={backoffs > 0 ? 'var(--accent)' : 'var(--muted)'} />
      </div>

      {/* —— Actions —— */}
      <div className="flex gap-1.5 mt-1">
        <BtnGhost>Edit</BtnGhost>
        <BtnGhost>{t.live ? 'Pause' : 'Resume'}</BtnGhost>
        <BtnGhost className="ml-auto">View timeline →</BtnGhost>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  color = 'var(--ink)',
}: {
  label: string
  value: React.ReactNode
  color?: string
}) {
  return (
    <div>
      <div className="text-[var(--muted)] text-[10px] tracking-[0.14em] uppercase">{label}</div>
      <div className="mt-0.5 tnum" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function BtnGhost({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[12px] px-2.5 py-[5px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] rounded-[3px] transition-colors duration-[120ms]',
        className,
      )}
    >
      {children}
    </button>
  )
}
