import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ALERTS_TODAY, WATCHLIST, type Alert } from '@/data/mock'
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

const TREND_DAYS: TrendDay[] = [
  { d: 13, s: 2, dr: 1, q: 0 },
  { d: 12, s: 3, dr: 1, q: 1 },
  { d: 11, s: 2, dr: 2, q: 0 },
  { d: 10, s: 5, dr: 2, q: 1 },
  { d: 9, s: 3, dr: 2, q: 1 },
  { d: 8, s: 7, dr: 3, q: 1 },
  { d: 7, s: 5, dr: 3, q: 1 },
  { d: 6, s: 9, dr: 4, q: 1 },
  { d: 5, s: 8, dr: 3, q: 1 },
  { d: 4, s: 5, dr: 2, q: 1 },
  { d: 3, s: 4, dr: 1, q: 1 },
  { d: 2, s: 6, dr: 2, q: 1 },
  { d: 1, s: 7, dr: 3, q: 1 },
  { d: 0, s: 8, dr: 4, q: 2 },
]

/**
 * 告警日志 · design.md §4
 * 14 日量 + KPI/Top items + chip 筛选 + 主表
 */
export default function Alerts() {
  const navigate = useNavigate()
  const [type, setType] = useState<Kind>('all')

  const filtered: Alert[] = useMemo(
    () => (type === 'all' ? ALERTS_TODAY : ALERTS_TODAY.filter((a) => a.kind === type)),
    [type],
  )

  const chips = useMemo<Chip<Kind>[]>(
    () => [
      { value: 'all', label: `All · ${ALERTS_TODAY.length}` },
      { value: 'surge', label: 'Surges' },
      { value: 'drop', label: 'Drops' },
      { value: 'qty', label: 'Quantity' },
    ],
    [],
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
            {ALERTS_TODAY.length} alerts today · cooldown 4h per direction · normal monitor + extreme tracker
            combined
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button>Export CSV</Button>
          <Button>Date range · Last 7d</Button>
        </div>
      </div>

      {/* —— Two cards row —— */}
      <section className="grid gap-7 mb-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <Card>
          <AlertVolumeChart days={TREND_DAYS} />
        </Card>

        <Card>
          {/* KPI 3-up */}
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <KpiTile label="Surges" value={8} color="up" foot="+3 vs 7d avg" />
            <KpiTile label="Drops" value={4} color="down" foot="−1 vs 7d avg" />
            <KpiTile label="Quantity" value={2} color="accent" foot="tracker only" />
          </div>

          {/* Top alerting items */}
          <div className="mt-[18px] pt-3.5 border-t border-[var(--hairline)]">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2">
              Top alerting items · 7d
            </div>
            {WATCHLIST.slice(0, 4).map((w, i) => {
              const count = 7 - i * 2
              return (
                <div
                  key={w.id}
                  className="grid items-center gap-2.5 py-1.5 text-[12.5px]"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 28px' }}
                >
                  <span className="truncate">{w.name}</span>
                  <div className="h-1 bg-[var(--hairline)] rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-0 bg-[var(--accent)]"
                      style={{ width: `${(count / 7) * 100}%` }}
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
              const item = WATCHLIST.find((w) => w.name === a.name)
              return (
                <tr
                  key={a.id}
                  onClick={() => item && navigate(`/item/${item.id}`)}
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
