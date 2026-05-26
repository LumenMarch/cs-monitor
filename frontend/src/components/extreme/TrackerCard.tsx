import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExtremeTrackConfig, ExtremeTrackSnapshot } from '@/api/types'
import { deleteExtremeTrack, toggleExtremeTrack } from '@/api/endpoints'
import type { TrackEvent } from './types'
import { ItemTile } from '@/components/ui/ItemTile'
import { StatusDot } from '@/components/ui/StatusDot'
import { PulseStrip } from './PulseStrip'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDelta, formatInt } from '@/utils/format'

interface Props {
  config: ExtremeTrackConfig
  snapshot?: ExtremeTrackSnapshot
  events: TrackEvent[]
  now: number
}

/**
 * 单 tracker 卡片(接真后端)
 * - config: ExtremeTrackConfig
 * - snapshot: 最新一条 extreme_track_snapshots
 * - events: 该 tracker 近期告警(投影自 ExtremeAlertRecord)
 * - 操作:Pause/Resume(/toggle) · Delete
 */
export function TrackerCard({ config, snapshot, events, now }: Props) {
  const queryClient = useQueryClient()
  const live = !!config.enabled
  const intervalSec = config.interval_seconds || 60
  const itemName = config.display_name || config.market_hash_name

  // 倒计时:基于 snapshot 的 recorded_at + interval,客户端用 now(每秒 +1)推进
  const recordedTs = snapshot?.recorded_at ? Date.parse(snapshot.recorded_at) : 0
  const nowMs = Date.now() + now * 0 // now 用于触发重渲染,Date.now 取真实时间
  const sinceLast = recordedTs ? Math.max(0, Math.floor((nowMs - recordedTs) / 1000)) : 0
  const inCycle = live && intervalSec > 0 ? sinceLast % intervalSec : 0
  const remaining = live && intervalSec > 0 ? intervalSec - inCycle : 0
  const progress = live && intervalSec > 0 ? inCycle / intervalSec : 0

  const last = events[events.length - 1]
  const alertsLabel = events.length

  // 追踪类型:price / quantity / both
  const trackType =
    config.price_track_enabled && config.quantity_track_enabled
      ? 'price + quantity'
      : config.price_track_enabled
        ? 'price'
        : config.quantity_track_enabled
          ? 'quantity'
          : 'none'

  // 阈值:展示主追踪维度的阈值
  const thresholdText = config.price_track_enabled
    ? `${config.price_threshold_percent.toFixed(1)}%`
    : config.quantity_track_enabled
      ? `${config.quantity_threshold_percent.toFixed(1)}%`
      : '—'

  const toggleMut = useMutation({
    mutationFn: () => toggleExtremeTrack(config.market_hash_name, config.platform),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['extreme-tracks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteExtremeTrack(config.market_hash_name, config.platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extreme-tracks'] })
      queryClient.invalidateQueries({ queryKey: ['extreme-snapshots'] })
    },
  })

  function confirmDelete() {
    if (window.confirm(`Remove tracker for "${itemName}@${config.platform}"?`)) {
      deleteMut.mutate()
    }
  }

  return (
    <div className="relative bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] p-[18px_20px] flex flex-col gap-3">
      {/* 右上 live/paused */}
      {live ? (
        <div className="absolute top-[14px] right-4 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--up)]">
          <StatusDot status="live" pulse />
          Live
        </div>
      ) : (
        <div className="absolute top-[14px] right-4 font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Paused
        </div>
      )}

      {/* Head */}
      <div className="flex items-center gap-3">
        <ItemTile size="lg" label={itemName} />
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[22px] leading-[1.1] tracking-[-0.005em] truncate">
            {itemName}
          </div>
          <div className="flex justify-between font-mono text-[11px] text-[var(--muted)] mt-1">
            <span>
              <span className="text-[var(--ink-2)]">{config.platform}</span> · {intervalSec}s cadence
              · tracking <span className="text-[var(--accent)]">{trackType}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pulse strip */}
      <div>
        <div className="flex justify-between mb-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
          <span>Recent alerts</span>
          <span>{events.length} events</span>
        </div>
        <PulseStrip events={events} live={live} />
        <div className="flex justify-between mt-1 font-mono text-[9.5px] tracking-[0.1em] text-[var(--muted-2)]">
          <span>{events.length ? new Date(events[0]!.notifiedAt).toLocaleString() : 'no events yet'}</span>
          <span>{live ? (recordedTs ? `next in ${remaining}s` : '—') : '—'}</span>
          <span>now</span>
        </div>
      </div>

      {/* Countdown bar */}
      {live && recordedTs > 0 && (
        <div className="h-[2px] bg-[var(--hairline)] rounded-full overflow-hidden relative">
          <div
            className="absolute inset-0 bg-[var(--accent)]"
            style={{ width: `${progress * 100}%`, transition: 'width 1s linear' }}
          />
        </div>
      )}

      {/* Metrics 4-up */}
      <div
        className="grid gap-3 font-mono text-[11.5px]"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      >
        <Metric
          label="Last Δ"
          value={last ? formatDelta(last.delta) : '—'}
          color={last ? (last.delta >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--muted)'}
        />
        <Metric
          label="Listings"
          value={snapshot?.quantity != null ? formatInt(snapshot.quantity) : '—'}
        />
        <Metric
          label="Last price"
          value={snapshot?.price != null ? formatCurrency(snapshot.price) : '—'}
        />
        <Metric
          label="Threshold"
          value={thresholdText}
          color={alertsLabel > 0 ? 'var(--accent)' : 'var(--muted)'}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-1">
        <BtnGhost onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}>
          {live ? 'Pause' : 'Resume'}
        </BtnGhost>
        <BtnGhost onClick={confirmDelete} disabled={deleteMut.isPending} tone="danger">
          Delete
        </BtnGhost>
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
      <div className="mt-0.5 tnum truncate" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function BtnGhost({
  children,
  className,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  tone?: 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-[12px] px-2.5 py-[5px] rounded-[3px] transition-colors duration-[120ms]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'danger'
          ? 'text-[var(--down)] hover:bg-[var(--down-bg)]'
          : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
        className,
      )}
    >
      {children}
    </button>
  )
}
