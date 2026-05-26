import { useState } from 'react'
import { cn } from '@/utils/cn'

export interface TrendDay {
  /** 距今天数,0 = today */
  d: number
  /** surges */
  s: number
  /** drops */
  dr: number
  /** quantity */
  q: number
}

interface Props {
  days: TrendDay[]
}

function dayLabel(d: number) {
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

/**
 * 14 日告警量堆叠柱状图 · design.md
 * 三段堆叠 surge(up) / drop(down) / quantity(accent)
 * hover 时其它降至 40% 透明,底部摘要联动
 */
export function AlertVolumeChart({ days }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const trendMax = Math.max(1, ...days.map((d) => d.s + d.dr + d.q))
  const focusDay = hover != null ? days[hover]! : days[days.length - 1]!
  const focusTotal = focusDay.s + focusDay.dr + focusDay.q

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-serif text-[22px] m-0">14-day alert volume</h3>
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
          Hover · day-level breakdown
        </span>
      </div>

      {/* —— Bars —— */}
      <div className="flex items-end gap-[5px] h-[110px] mt-4 relative">
        {days.map((d, i) => {
          const total = d.s + d.dr + d.q
          const isHover = hover === i
          const isToday = i === days.length - 1
          const totalH = (total / trendMax) * 100
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                'flex-1 h-full cursor-pointer relative transition-opacity duration-[120ms]',
                hover != null && !isHover ? 'opacity-40' : 'opacity-100',
              )}
              style={{ display: 'flex', flexDirection: 'column-reverse' }}
              title={`${dayLabel(d.d)} · ${total} alerts`}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column-reverse', height: `${totalH}%`, gap: 1 }}
              >
                <div className="rounded-t-[1px] bg-[var(--up)]" style={{ flex: Math.max(d.s, 0.0001) }} />
                <div className="bg-[var(--down)]" style={{ flex: Math.max(d.dr, 0.0001) }} />
                {d.q > 0 && <div className="bg-[var(--accent)]" style={{ flex: d.q }} />}
              </div>
              {isToday && (
                <div className="absolute -top-4 inset-x-0 text-center font-mono text-[9px] tracking-[0.1em] text-[var(--accent)]">
                  ↓ TODAY
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* —— Axis row —— */}
      <div className="flex mt-2 pt-1.5 border-t border-[var(--hairline)] font-mono text-[10px] tracking-[0.1em] text-[var(--muted)]">
        <span>14d ago</span>
        <span className="ml-auto">today</span>
      </div>

      {/* —— Focus summary —— */}
      <div
        className="mt-3.5 pt-3.5 border-t border-dashed border-[var(--hairline)] grid gap-4 items-baseline"
        style={{ gridTemplateColumns: 'auto 1fr auto auto auto' }}
      >
        <div
          className={cn(
            'font-mono text-[10.5px] tracking-[0.18em] uppercase',
            hover != null ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
          )}
        >
          {hover != null ? `D−${focusDay.d} · ${dayLabel(focusDay.d)}` : 'Hovering · 14d range'}
        </div>
        <div className="font-serif text-[26px] leading-none ml-auto">
          {focusTotal}
          <span className="font-mono text-[var(--muted)] text-[11px] tracking-[0.1em] ml-1.5">
            total
          </span>
        </div>
        <SwatchCount color="up" value={focusDay.s} label="↑" />
        <SwatchCount color="down" value={focusDay.dr} label="↓" />
        <SwatchCount color="accent" value={focusDay.q} label="qty" />
      </div>
    </div>
  )
}

function SwatchCount({
  color,
  value,
  label,
}: {
  color: 'up' | 'down' | 'accent'
  value: number
  label: string
}) {
  const c = `var(--${color})`
  return (
    <div className="font-mono tnum text-[12.5px] inline-flex items-center" style={{ color: c }}>
      <span className="inline-block w-2 h-2 mr-1.5" style={{ background: c }} />
      {value} {label}
    </div>
  )
}
