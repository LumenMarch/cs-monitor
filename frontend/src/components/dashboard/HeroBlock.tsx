import { useMemo, useState } from 'react'
import { CountUp } from '@/components/ui/CountUp'
import { StatusDot } from '@/components/ui/StatusDot'
import { BigLineChart } from '@/components/charts/BigLineChart'
import { PORTFOLIO_7D, PORTFOLIO_30D, PORTFOLIO_90D } from '@/data/mock'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

type Range = '7D' | '30D' | '90D'

const SERIES: Record<Range, number[]> = {
  '7D': PORTFOLIO_7D,
  '30D': PORTFOLIO_30D,
  '90D': PORTFOLIO_90D,
}

/**
 * Dashboard Hero · design.md §3 + §4
 * - 左:meta · 112px 衬线 hero number · ¥ + 小数错位 · pill 主/次
 * - 右:range 切换(7D/30D/90D)+ area-line chart
 */
export function HeroBlock() {
  const [range, setRange] = useState<Range>('30D')
  const series = SERIES[range]
  const portfolio = series[series.length - 1]!
  const start = series[0]!

  const { deltaAbs, deltaPct, isUp } = useMemo(() => {
    const abs = portfolio - start
    return { deltaAbs: abs, deltaPct: (abs / start) * 100, isUp: abs >= 0 }
  }, [portfolio, start])

  const week = series[Math.max(0, series.length - 7)] ?? start
  const deltaWeekPct = ((portfolio - week) / week) * 100
  const isUpWeek = deltaWeekPct >= 0

  const intPart = Math.floor(portfolio)
  const fracPart = (portfolio % 1) * 100

  return (
    <section
      className="grid gap-[32px] pb-[30px] border-b border-[var(--hairline)] mb-[32px]"
      style={{ gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)' }}
    >
      {/* —— Left —— */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex gap-[22px] font-mono text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)]">
          <span>
            Portfolio value · <strong className="text-[var(--ink)] font-medium">¥ CNY</strong>
          </span>
          <span>12 active items</span>
          <span>3 trackers live</span>
        </div>

        <div className="font-serif font-normal flex items-baseline gap-[14px]" style={{ fontSize: 112, lineHeight: 0.95, letterSpacing: '-0.025em' }}>
          <span className="text-[var(--muted)] self-start" style={{ fontSize: 38, marginTop: 18 }}>
            ¥
          </span>
          <span className="tnum">
            <CountUp value={intPart} duration={1100} format={(v) => Math.floor(v).toLocaleString('en-US')} />
          </span>
          <span className="text-[var(--muted)] tnum" style={{ fontSize: 56 }}>
            .<CountUp value={fracPart} duration={1100} format={(v) => String(Math.floor(v)).padStart(2, '0')} />
          </span>
        </div>

        <div className="flex gap-[18px] items-center mt-1 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[3px] px-[9px] py-[5px] font-mono text-[12px] font-medium',
              isUp ? 'text-[var(--up)] bg-[var(--up-bg)]' : 'text-[var(--down)] bg-[var(--down-bg)]',
            )}
          >
            {isUp ? '▲' : '▼'} {formatCurrency(Math.abs(deltaAbs))} ({formatDelta(deltaPct)})
          </span>
          <span className="font-mono text-[11px] text-[var(--muted)] tracking-[0.1em] uppercase">
            vs. {range === '90D' ? '90d' : range === '30D' ? '30d' : '7d'} ago
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[3px] px-[9px] py-[5px] font-mono text-[12px] font-medium opacity-85',
              isUpWeek ? 'text-[var(--up)] bg-[var(--up-bg)]' : 'text-[var(--down)] bg-[var(--down-bg)]',
            )}
          >
            7d {formatDelta(deltaWeekPct)}
          </span>
          <span className="ml-auto font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--up)] inline-flex items-center gap-1.5">
            <StatusDot status="live" /> Updating every 30 min
          </span>
        </div>
      </div>

      {/* —— Right —— */}
      <div className="flex flex-col gap-[14px] border-l border-[var(--hairline)] pl-[32px] min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
            Portfolio · {range}
          </span>
          <div className="flex gap-1">
            {(['7D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  'font-mono text-[10.5px] tracking-[0.1em] px-2 py-1 rounded-[3px] transition-[background,color] duration-[120ms]',
                  range === r ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--ink)]',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <BigLineChart data={series} height={180} />
        </div>
      </div>
    </section>
  )
}
