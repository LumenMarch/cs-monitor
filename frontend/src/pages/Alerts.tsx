import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { backendToAlert, mapAlertKind } from '@/api/adapters'
import { fetchAlertStats, fetchAlerts, fetchWatchlist } from '@/api/endpoints'
import { type Alert } from '@/data/types'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FilterChips, type Chip } from '@/components/ui/FilterChips'
import { ItemTile } from '@/components/ui/ItemTile'
import { WearTag } from '@/components/ui/WearTag'
import { AlertSpark } from '@/components/alerts/AlertSpark'
import { AlertVolumeChart, type TrendDay } from '@/components/alerts/AlertVolumeChart'
import { KindBadge } from '@/components/alerts/KindBadge'

type Kind = 'all' | 'surge' | 'drop' | 'qty'

/**
 * 由后端 by_day 统计构造 14 日 trend(缺失日补 0)
 * 日期格式来自后端字符串(yyyy-mm-dd),按"今天距 D 天"反推索引。
 */
function buildTrendDays(byDay: { date: string; alert_type: string; count: number }[]): TrendDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: TrendDay[] = []
  for (let d = 13; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const key = `${yyyy}-${mm}-${dd}`
    let s = 0
    let dr = 0
    let q = 0
    for (const row of byDay) {
      if (row.date !== key) continue
      const kind = mapAlertKind(row.alert_type)
      if (kind === 'surge') s += row.count
      else if (kind === 'drop') dr += row.count
      else q += row.count
    }
    days.push({ d, s, dr, q })
  }
  return days
}

/**
 * 告警日志 · design.md §4
 * 14 日量 + KPI/Top items + chip 筛选 + 主表
 */
export default function Alerts() {
  const navigate = useNavigate()
  const [type, setType] = useState<Kind>('all')

  const alertsQuery = useQuery({
    queryKey: ['alerts', type],
    queryFn: () => fetchAlerts({ page: 1, limit: 50, alert_type: undefined }),
    staleTime: 30_000,
  })

  const statsQuery = useQuery({
    queryKey: ['alerts-stats'],
    queryFn: () => fetchAlertStats(),
    staleTime: 60_000,
  })

  const watchlistQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 60_000,
  })

  const allAlerts: Alert[] = useMemo(
    () => (alertsQuery.data?.items ?? []).map(backendToAlert),
    [alertsQuery.data],
  )

  const filtered: Alert[] = useMemo(
    () => (type === 'all' ? allAlerts : allAlerts.filter((a) => a.kind === type)),
    [allAlerts, type],
  )

  // KPI counts from by_type
  const kpiCounts = useMemo(() => {
    const counts = { surge: 0, drop: 0, qty: 0 }
    const byType = statsQuery.data?.by_type ?? []
    for (const row of byType) {
      const k = mapAlertKind(row.alert_type)
      counts[k] += row.count
    }
    return counts
  }, [statsQuery.data])

  const trendDays = useMemo(
    () => buildTrendDays(statsQuery.data?.by_day ?? []),
    [statsQuery.data],
  )

  // Top alerting items · 7 天内告警次数排名(取自当前 alerts 列表)
  const topItems = useMemo(() => {
    const counter = new Map<string, number>()
    for (const a of allAlerts) {
      counter.set(a.name, (counter.get(a.name) ?? 0) + 1)
    }
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }))
  }, [allAlerts])

  const totalToday = statsQuery.data?.total ?? alertsQuery.data?.total ?? 0

  const chips = useMemo<Chip<Kind>[]>(
    () => [
      { value: 'all', label: `All · ${allAlerts.length}` },
      { value: 'surge', label: 'Surges' },
      { value: 'drop', label: 'Drops' },
      { value: 'qty', label: 'Quantity' },
    ],
    [allAlerts.length],
  )

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            04 · Alerts
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Alert journal
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[56ch]">
            {totalToday} alerts in window · cooldown 4h per direction · normal monitor + extreme tracker
            combined
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button>Export CSV</Button>
          <Button>Date range · Last 14d</Button>
        </div>
      </div>

      {/* —— 错误条 —— */}
      {(alertsQuery.isError || statsQuery.isError) && (
        <div className="mb-4 font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-3 py-2">
          加载失败:{apiErrorMessage(alertsQuery.error ?? statsQuery.error)}
        </div>
      )}

      {/* —— Two cards row —— */}
      <section className="grid gap-7 mb-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <Card>
          <AlertVolumeChart days={trendDays} />
        </Card>

        <Card>
          {/* KPI 3-up */}
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <KpiTile label="Surges" value={kpiCounts.surge} color="up" foot="price up · normal monitor" />
            <KpiTile label="Drops" value={kpiCounts.drop} color="down" foot="price down · normal monitor" />
            <KpiTile label="Quantity" value={kpiCounts.qty} color="accent" foot="extreme tracker only" />
          </div>

          {/* Top alerting items */}
          <div className="mt-[18px] pt-3.5 border-t border-[var(--hairline)]">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2">
              Top alerting items
            </div>
            {topItems.length === 0 && (
              <div className="font-mono text-[11px] text-[var(--muted-2)] py-2">
                no alerts in current window
              </div>
            )}
            {topItems.map(({ name, count }) => {
              const max = topItems[0]?.count || 1
              return (
                <div
                  key={name}
                  className="grid items-center gap-2.5 py-1.5 text-[12.5px]"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 28px' }}
                >
                  <span className="truncate">{name}</span>
                  <div className="h-1 bg-[var(--hairline)] rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-0 bg-[var(--accent)]"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono tnum text-[var(--muted)] text-right text-[11px]">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      {/* —— Chips —— */}
      <FilterChips chips={chips} value={type} onChange={setType} />

      {/* —— Journal table —— */}
      <div className="mt-0 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <TH width={70}>Time</TH>
              <TH width={90}>Type</TH>
              <TH>Item</TH>
              <TH>Reason</TH>
              <TH width={76}>± 1h price</TH>
              <TH width={90}>Platform</TH>
              <TH width={100} numeric>
                Price
              </TH>
              <TH width={90} numeric>
                Change
              </TH>
              <TH width={30} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const direction = a.delta
              const points: number[] = []
              for (let i = 0; i < 12; i++) {
                const t = i / 11
                let p = 0
                if (i < 5) p = Math.sin(i * 1.7) * 0.15 * Math.abs(direction)
                else if (i <= 6) p = direction * t * 1.05
                else p = direction * (1 + Math.sin((i - 6) * 1.2) * 0.06)
                points.push(p)
              }
              const wlItem = watchlistQuery.data?.find(
                (w) => w.market_hash_name.includes(a.name) || (w.display_name ?? '') === a.name,
              )
              return (
                <tr
                  key={a.id}
                  onClick={() => wlItem && navigate(`/item/${wlItem.id}`)}
                  className="cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface)]"
                >
                  <TD className="font-mono text-[var(--muted)]">{a.time}</TD>
                  <TD>
                    <KindBadge kind={a.kind} />
                  </TD>
                  <TD>
                    <div className="flex items-center gap-3">
                      <ItemTile />
                      <span>
                        {a.name}
                        <WearTag wear={a.wear} className="ml-1.5" />
                      </span>
                    </div>
                  </TD>
                  <TD className="text-[var(--muted)]">{a.desc}</TD>
                  <TD>
                    <AlertSpark data={points} highlightIdx={6} />
                  </TD>
                  <TD className="font-mono text-[var(--muted)]">{a.platform}</TD>
                  <TD numeric>{formatCurrency(a.price)}</TD>
                  <TD
                    numeric
                    className={a.delta >= 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}
                  >
                    {formatDelta(a.delta)}
                  </TD>
                  <TD>
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-[3px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Open detail"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  color,
  foot,
}: {
  label: string
  value: number
  color: 'up' | 'down' | 'accent'
  foot: string
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">{label}</div>
      <div
        className="font-serif leading-none mt-1"
        style={{ fontSize: 38, color: `var(--${color})` }}
      >
        {value}
      </div>
      <div className="font-mono text-[11px] text-[var(--muted)] mt-1">{foot}</div>
    </div>
  )
}

function TH({
  children,
  width,
  numeric,
}: {
  children?: React.ReactNode
  width?: number
  numeric?: boolean
}) {
  return (
    <th
      className={cn(
        'font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] text-left',
        numeric && 'text-right',
      )}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  )
}

function TD({
  children,
  numeric,
  className,
}: {
  children?: React.ReactNode
  numeric?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'px-3 border-b border-[var(--hairline)] align-middle',
        numeric && 'text-right font-mono tnum',
        className,
      )}
      style={{ height: 'var(--row-h)' }}
    >
      {children}
    </td>
  )
}
