import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWatchlist } from '@/api/endpoints'
import { CountUp } from '@/components/ui/CountUp'
import { StatusDot } from '@/components/ui/StatusDot'
import { BigLineChart } from '@/components/charts/BigLineChart'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * Dashboard Hero · 接 /watchlist 真数据
 * - 组合估值 = sum(item.latest_price)
 * - 7d 趋势 = 各 item sparkline 逐点相加(全部 sparkline 长度对齐到最短)
 * - 后端目前没有 30d/90d portfolio history,故 range 固定为 7D(展示中已只显示 7D 标签)
 */
export function HeroBlock() {
  const query = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 60_000,
  })

  const items = query.data ?? []
  const activeCount = items.filter((it) => it.enabled === 1).length

  const series = useMemo(() => {
    if (items.length === 0) return [] as number[]
    const sparks = items.map((it) => it.sparkline ?? []).filter((s) => s.length > 0)
    if (sparks.length === 0) return []
    const minLen = Math.min(...sparks.map((s) => s.length))
    const out: number[] = []
    for (let i = 0; i < minLen; i++) {
      let sum = 0
      for (const s of sparks) sum += s[s.length - minLen + i] ?? 0
      out.push(sum)
    }
    return out
  }, [items])

  const portfolio = useMemo(
    () => items.reduce((acc, it) => acc + (it.latest_price ?? 0), 0),
    [items],
  )

  const { deltaAbs, deltaPct, isUp, sevenDayPct, sevenDayUp } = useMemo(() => {
    if (series.length < 2) {
      return {
        deltaAbs: 0,
        deltaPct: 0,
        isUp: true,
        sevenDayPct: 0,
        sevenDayUp: true,
      }
    }
    const start = series[0]!
    const end = series[series.length - 1]!
    const week =
      series[Math.max(0, series.length - 7)] ?? start
    const abs = end - start
    const pct = start > 0 ? (abs / start) * 100 : 0
    const weekPct = week > 0 ? ((end - week) / week) * 100 : 0
    return {
      deltaAbs: abs,
      deltaPct: pct,
      isUp: abs >= 0,
      sevenDayPct: weekPct,
      sevenDayUp: weekPct >= 0,
    }
  }, [series])

  const intPart = Math.floor(portfolio)
  const fracPart = (portfolio % 1) * 100
  const hasData = portfolio > 0 && series.length > 1

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
          <span>{activeCount} active items</span>
        </div>

        <div
          className="font-serif font-normal flex items-baseline gap-[14px]"
          style={{ fontSize: 112, lineHeight: 0.95, letterSpacing: '-0.025em' }}
        >
          <span className="text-[var(--muted)] self-start" style={{ fontSize: 38, marginTop: 18 }}>
            ¥
          </span>
          <span className="tnum">
            <CountUp
              value={intPart}
              duration={1100}
              format={(v) => Math.floor(v).toLocaleString('en-US')}
            />
          </span>
          <span className="text-[var(--muted)] tnum" style={{ fontSize: 56 }}>
            .
            <CountUp
              value={fracPart}
              duration={1100}
              format={(v) => String(Math.floor(v)).padStart(2, '0')}
            />
          </span>
        </div>

        <div className="flex gap-[18px] items-center mt-1 flex-wrap">
          {hasData ? (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[3px] px-[9px] py-[5px] font-mono text-[12px] font-medium',
                  isUp
                    ? 'text-[var(--up)] bg-[var(--up-bg)]'
                    : 'text-[var(--down)] bg-[var(--down-bg)]',
                )}
              >
                {isUp ? '▲' : '▼'} {formatCurrency(Math.abs(deltaAbs))} ({formatDelta(deltaPct)})
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)] tracking-[0.1em] uppercase">
                vs. 7d ago
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[3px] px-[9px] py-[5px] font-mono text-[12px] font-medium opacity-85',
                  sevenDayUp
                    ? 'text-[var(--up)] bg-[var(--up-bg)]'
                    : 'text-[var(--down)] bg-[var(--down-bg)]',
                )}
              >
                7d {formatDelta(sevenDayPct)}
              </span>
            </>
          ) : (
            <span className="font-mono text-[11px] text-[var(--muted)] tracking-[0.1em] uppercase">
              Awaiting price history…
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--up)] inline-flex items-center gap-1.5">
            <StatusDot status="live" /> Updating periodically
          </span>
        </div>
      </div>

      {/* —— Right —— */}
      <div className="flex flex-col gap-[14px] border-l border-[var(--hairline)] pl-[32px] min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
            Portfolio · 7d
          </span>
          <span
            className="font-mono text-[10.5px] tracking-[0.1em] px-2 py-1 rounded-[3px] bg-[var(--ink)] text-[var(--bg)]"
            title="后端目前只支持 7 日 portfolio sparkline"
          >
            7D
          </span>
        </div>
        <div className="relative">
          {series.length > 1 ? (
            <BigLineChart data={series} height={180} />
          ) : (
            <div
              className="grid place-items-center font-mono text-[11px] text-[var(--muted)] border border-dashed border-[var(--hairline)] rounded-[3px]"
              style={{ height: 180 }}
            >
              not enough data yet
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
