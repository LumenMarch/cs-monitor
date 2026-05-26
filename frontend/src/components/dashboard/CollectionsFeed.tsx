import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/endpoints'
import { StatusDot } from '@/components/ui/StatusDot'

/**
 * 调度器系统脉冲 · 接 /dashboard/summary
 * 后端无逐次采集 log,前端只展示聚合状态:
 *   - 上次更新时间
 *   - 今日采集次数 + 间隔
 *   - 估算下次采集
 *   - 最新价格记录数(全市场)
 */
export function CollectionsFeed() {
  const query = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })

  if (query.isLoading) {
    return <div className="py-3 font-mono text-[11px] text-[var(--muted)]">Loading…</div>
  }

  const s = query.data
  const interval = s?.check_interval_minutes ?? 30
  const lastUpdate = s?.last_update ? new Date(s.last_update) : null
  const nextTime = lastUpdate
    ? new Date(lastUpdate.getTime() + interval * 60_000)
    : null

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : '—'

  const now = new Date()
  const overdue = nextTime ? now.getTime() > nextTime.getTime() : false

  return (
    <div className="flex flex-col">
      <div className="flex gap-3 items-baseline mb-2">
        <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Scheduler
        </div>
        <div className="font-mono text-[10.5px] text-[var(--muted)] ml-auto inline-flex items-center gap-1.5">
          <StatusDot status={overdue ? 'idle' : 'live'} pulse={!overdue} />
          {overdue ? 'awaiting next tick' : 'on cadence'}
        </div>
      </div>

      <PulseRow label="Last collection" value={fmt(lastUpdate)} />
      <PulseRow label="Next (est.)" value={fmt(nextTime)} accent={overdue} />
      <PulseRow label="Polls today" value={(s?.today_collection_count ?? 0).toString()} />
      <PulseRow label="Cadence" value={`every ${interval} min`} />
      <PulseRow
        label="Tracked prices"
        value={(s?.latest_price_count ?? 0).toLocaleString('en-US')}
      />
    </div>
  )
}

function PulseRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className="grid items-center gap-3 py-[10px] font-mono text-[12px] border-b border-dashed border-[var(--hairline)] last:border-0"
      style={{ gridTemplateColumns: '1fr auto' }}
    >
      <span className="text-[var(--muted)]">{label}</span>
      <span
        className="tnum"
        style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
      >
        {value}
      </span>
    </div>
  )
}
