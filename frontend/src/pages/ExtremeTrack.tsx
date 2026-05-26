import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import {
  fetchExtremeAlerts,
  fetchExtremeSnapshots,
  fetchExtremeTracks,
} from '@/api/endpoints'
import type { ExtremeAlertRecord, ExtremeTrackSnapshot } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { KpiStrip } from '@/components/dashboard/KpiStrip'
import { SectionHead } from '@/components/ui/SectionHead'
import { TrackerCard } from '@/components/extreme/TrackerCard'
import { SessionLog } from '@/components/extreme/SessionLog'
import { AddTrackerDialog } from '@/components/extreme/AddTrackerDialog'
import type { TrackEvent } from '@/components/extreme/types'

/**
 * Extreme Track · 接 /extreme-track 后端
 * 数据源:
 *  - GET /extreme-track          → 追踪配置列表
 *  - GET /extreme-track/snapshots → 各 tracker 最新快照(price/quantity)
 *  - GET /extreme-track/alerts   → 告警分页(取最近 200 条用于 strip + log)
 */
export default function ExtremeTrack() {
  const [now, setNow] = useState(0)
  const [addOpen, setAddOpen] = useState(false)

  // 每秒 tick 用于卡片倒计时
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const tracksQ = useQuery({
    queryKey: ['extreme-tracks'],
    queryFn: fetchExtremeTracks,
    refetchInterval: 10_000,
  })

  const snapshotsQ = useQuery({
    queryKey: ['extreme-snapshots'],
    queryFn: fetchExtremeSnapshots,
    refetchInterval: 10_000,
  })

  const alertsQ = useQuery({
    queryKey: ['extreme-alerts', { limit: 200 }],
    queryFn: () => fetchExtremeAlerts({ page: 1, limit: 200 }),
    refetchInterval: 5_000,
  })

  const configs = tracksQ.data ?? []
  const snapshots = snapshotsQ.data ?? []
  const alerts = alertsQ.data?.items ?? []
  const alertsTotal = alertsQ.data?.total ?? 0

  // 按 name@platform 索引
  const snapshotMap = useMemo(() => {
    const m = new Map<string, ExtremeTrackSnapshot>()
    for (const s of snapshots) m.set(`${s.market_hash_name}@${s.platform}`, s)
    return m
  }, [snapshots])

  // 把告警按 tracker 分组(取最近 30 条,按时间正序便于 strip 末位最新)
  const eventsByTracker = useMemo(() => {
    const m = new Map<string, TrackEvent[]>()
    const sortedAsc = [...alerts].sort(
      (a, b) => Date.parse(a.notified_at) - Date.parse(b.notified_at),
    )
    for (const a of sortedAsc) {
      const key = `${a.market_hash_name}@${a.platform}`
      const arr = m.get(key) ?? []
      arr.push(mapToTrackEvent(a))
      m.set(key, arr)
    }
    // 限制每个 tracker 最近 30 条
    for (const [k, v] of m) {
      if (v.length > 30) m.set(k, v.slice(-30))
    }
    return m
  }, [alerts])

  // 今日告警计数
  const todayAlerts = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return alerts.filter((a) => a.notified_at.slice(0, 10) === todayStr).length
  }, [alerts])

  const activeCount = configs.filter((c) => c.enabled).length
  const lastSnapshotAt = snapshots[0]?.recorded_at

  const sessionEvents = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => Date.parse(b.notified_at) - Date.parse(a.notified_at))
        .slice(0, 18),
    [alerts],
  )

  // —— 加载态
  if (tracksQ.isLoading) {
    return (
      <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
        <div className="font-mono text-[11px] text-[var(--muted)]">Loading trackers…</div>
      </div>
    )
  }

  // —— 错误
  if (tracksQ.isError) {
    return (
      <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
        <div className="font-mono text-[11px] text-[var(--down)]">
          Failed to load trackers · {(tracksQ.error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            03 · Extreme Track
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Extreme track <em className="italic text-[var(--accent)]">·</em> seconds-level sniping
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[64ch]">
            High-frequency single-item monitoring. {activeCount} of {configs.length} trackers live.
            {' '}
            {lastSnapshotAt ? `Last poll ${new Date(lastSnapshotAt).toLocaleTimeString()}.` : 'No polls yet.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={() => snapshotsQ.refetch()} disabled={snapshotsQ.isFetching}>
            <RefreshCw size={13} className={snapshotsQ.isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={13} /> New tracker
          </Button>
        </div>
      </div>
      <AddTrackerDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* —— KPI strip —— */}
      <KpiStrip
        items={[
          {
            label: 'Active trackers',
            value: activeCount,
            suffix: <span className="text-[20px] text-[var(--muted)]">/{configs.length}</span>,
            foot:
              activeCount === configs.length && configs.length > 0 ? (
                <>▲ all healthy</>
              ) : (
                <>{configs.length - activeCount} paused</>
              ),
            footTone: activeCount === configs.length && configs.length > 0 ? 'up' : undefined,
          },
          {
            label: 'Triggered today',
            value: todayAlerts,
            foot:
              alertsTotal > todayAlerts ? <>{alertsTotal} all-time</> : <>since midnight local</>,
            footTone: todayAlerts > 0 ? 'up' : undefined,
          },
          {
            label: 'Total alerts',
            value: alertsTotal,
            foot: <>across all trackers</>,
          },
          {
            label: 'Snapshots',
            value: snapshots.length,
            foot: <>{snapshots.length === configs.length ? 'all reporting' : 'partial coverage'}</>,
          },
        ]}
      />

      <div className="h-7" />

      {/* —— Empty state —— */}
      {configs.length === 0 ? (
        <div className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] p-[22px] text-center">
          <div className="font-serif text-[24px] leading-[1.2]">
            No <em className="italic text-[var(--accent)]">trackers</em> yet
          </div>
          <p className="text-[var(--muted)] text-[13px] mt-2 max-w-[52ch] mx-auto">
            极致追踪用于秒级监控单个饰品的价格与挂单数。配置完成后会按指定间隔轮询 SteamDT,
            达到阈值即触发告警。
          </p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={13} /> Configure first tracker
            </Button>
          </div>
        </div>
      ) : (
        <section
          className="grid gap-7"
          style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}
        >
          <div>
            <SectionHead
              num="01"
              title={
                <>
                  Trackers{' '}
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                    {configs.length} configured
                  </span>
                </>
              }
              meta={`${activeCount} live`}
            />
            <div className="flex flex-col gap-3.5">
              {configs.map((c) => {
                const key = `${c.market_hash_name}@${c.platform}`
                return (
                  <TrackerCard
                    key={c.id}
                    config={c}
                    snapshot={snapshotMap.get(key)}
                    events={eventsByTracker.get(key) ?? []}
                    now={now}
                  />
                )
              })}
            </div>
          </div>

          <div>
            <SectionHead
              num="02"
              title={
                <>
                  Session log{' '}
                  <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                    tail · live
                  </span>
                </>
              }
              meta={`${sessionEvents.length} recent`}
            />
            <SessionLog events={sessionEvents} total={alertsTotal} />
          </div>
        </section>
      )}
    </div>
  )
}

function mapToTrackEvent(a: ExtremeAlertRecord): TrackEvent {
  const delta = a.price_change_percent ?? a.quantity_change_percent ?? 0
  const metric: 'price' | 'qty' = a.price_change_percent != null ? 'price' : 'qty'
  return { delta, metric, notifiedAt: a.notified_at, alertType: a.alert_type }
}
