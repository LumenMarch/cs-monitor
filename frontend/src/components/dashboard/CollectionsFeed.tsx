import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/endpoints'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'

/**
 * 调度器伪终端 log · design.md "System pulse" + §6 Loading-state terminal
 * 后端没暴露逐条 collection log,这里基于 /dashboard/summary 的聚合字段
 * (last_update / check_interval_minutes / today_collection_count /
 *  active_watchlist / today_alert_count / latest_price_count)
 * 合成最近 4 个 cycle 的事件流,每个 cycle 4 行:fetch / parse / diff / done。
 * 末尾追加一行待执行的 next-tick,带 accent 颜色 + 脉冲点。
 */

type Level = 'info' | 'ok' | 'warn' | 'accent'
interface Line {
  ts: string
  level: Level
  text: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function CollectionsFeed() {
  const query = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })

  const s = query.data
  const interval = s?.check_interval_minutes ?? 30
  const lastUpdate = s?.last_update ? new Date(s.last_update) : null
  const nextTime = lastUpdate
    ? new Date(lastUpdate.getTime() + interval * 60_000)
    : null
  const now = new Date()
  const overdue = nextTime ? now.getTime() > nextTime.getTime() : false

  const items = s?.active_watchlist ?? 0
  const totalAlerts = s?.today_alert_count ?? 0
  const totalCollections = s?.today_collection_count ?? 0
  const trackedPrices = s?.latest_price_count ?? 0

  // 合成最近 4 个 cycle 的事件流(每 cycle 间隔 = check_interval_minutes)
  // alert 行只在告警 pro-rata 分配到该 cycle 时显示
  const lines: Line[] = useMemo(() => {
    if (!lastUpdate || !items) return []
    const out: Line[] = []
    const CYCLES = Math.min(4, Math.max(1, totalCollections || 1))
    // 把今日 alert 总数按 cycle 均匀分摊(最后一个 cycle 兜底剩余)
    const perCycleAlert = Math.floor(totalAlerts / CYCLES)
    const tailAlert = totalAlerts - perCycleAlert * (CYCLES - 1)

    for (let i = CYCLES - 1; i >= 0; i--) {
      // 倒序:i=CYCLES-1 是最早一个 cycle, i=0 是最新一个(= lastUpdate)
      const cycleStart = new Date(lastUpdate.getTime() - i * interval * 60_000)
      const t0 = new Date(cycleStart)
      const t1 = new Date(cycleStart.getTime() + 1000)
      const t2 = new Date(cycleStart.getTime() + 2000)
      const t3 = new Date(cycleStart.getTime() + 3000)
      out.push({
        ts: fmtTime(t0),
        level: 'info',
        text: `poll → /watchlist · ${items} items`,
      })
      out.push({
        ts: fmtTime(t1),
        level: 'ok',
        text: `fetch · 200 ok · prices ${trackedPrices.toLocaleString('en-US')}`,
      })
      const alertsThis = i === 0 ? tailAlert : perCycleAlert
      out.push({
        ts: fmtTime(t2),
        level: alertsThis > 0 ? 'warn' : 'info',
        text:
          alertsThis > 0
            ? `diff · ${alertsThis} threshold hit`
            : 'diff · no threshold crossings',
      })
      out.push({
        ts: fmtTime(t3),
        level: 'ok',
        text: `done · sleep ${interval}m`,
      })
    }

    // 末尾追加一行待执行 tick
    if (nextTime) {
      out.push({
        ts: fmtTime(nextTime),
        level: 'accent',
        text: overdue
          ? '(awaiting next tick…)'
          : `(scheduled in ${Math.max(
              1,
              Math.round((nextTime.getTime() - now.getTime()) / 60_000),
            )}m)`,
      })
    }
    return out
  }, [
    lastUpdate?.getTime(),
    items,
    totalAlerts,
    totalCollections,
    trackedPrices,
    interval,
    nextTime?.getTime(),
    overdue,
    now.getTime(),
  ])

  if (query.isLoading) {
    return <div className="py-3 font-mono text-[11px] text-[var(--muted)]">Loading…</div>
  }
  if (lines.length === 0) {
    return (
      <div className="py-3 font-mono text-[11px] text-[var(--muted)]">
        scheduler idle · no collections yet today
      </div>
    )
  }

  return (
    <div>
      {/* —— Head —— */}
      <div className="flex gap-3 items-baseline mb-2.5">
        <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Scheduler · tail · live
        </div>
        <div className="font-mono text-[10.5px] text-[var(--muted)] ml-auto inline-flex items-center gap-1.5">
          <StatusDot status={overdue ? 'idle' : 'live'} pulse={!overdue} />
          {overdue ? 'awaiting tick' : 'on cadence'}
        </div>
      </div>

      {/* —— Pseudo-terminal —— */}
      <div className="bg-[var(--ink)] text-[var(--bg)] rounded-[3px] font-mono text-[11px] leading-[1.6] py-2 px-3 max-h-[260px] overflow-y-auto">
        {lines.map((ln, i) => (
          <div key={i} className="grid items-baseline gap-2.5" style={{ gridTemplateColumns: '74px 1fr' }}>
            <span className="opacity-50 tnum">{ln.ts}</span>
            <span
              className={cn(
                ln.level === 'ok' && 'opacity-80',
                ln.level === 'warn' && 'text-[var(--accent)] opacity-95',
                ln.level === 'accent' && 'text-[var(--accent)]',
                ln.level === 'info' && 'opacity-90',
              )}
            >
              {ln.text}
            </span>
          </div>
        ))}
      </div>

      {/* —— Footer summary —— */}
      <div className="flex justify-between mt-3 font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em] uppercase">
        <span>
          {totalCollections} polls · {trackedPrices.toLocaleString('en-US')} prices tracked
        </span>
        <span>every {interval}m</span>
      </div>
    </div>
  )
}
