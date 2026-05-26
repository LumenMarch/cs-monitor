import { Fragment, useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchKline, fetchWatchlist } from '@/api/endpoints'
import { backendToWatchItem } from '@/api/adapters'
import { splitItemName } from '@/utils/format'

const ROWS = 8

interface HeatmapRow {
  id: number
  name: string
  marketHashName: string
  /** 长度 24,每格 abs(% change),缺数据填 NaN */
  cells: number[]
}

/**
 * 24h 波动热力图(接 K-line period=1, count=24)
 * - 行:用户 watchlist 的 top 8(按 |change_24h| 排序)
 * - 列:24 小时,每格 = abs((close-open)/open*100)
 * - 当前小时 inset 描边 + label accent
 * - 数据缺失填 hairline-2 占位,不参与色阶
 */
export function VolatilityHeatmap() {
  const nowHour = useMemo(() => new Date().getHours(), [])

  const wlQ = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
  })

  // 选 |change_24h| top N
  const topItems = useMemo(() => {
    const raw = wlQ.data ?? []
    const mapped = raw.map((it) => ({ raw: it, ui: backendToWatchItem(it) }))
    return [...mapped]
      .sort((a, b) => Math.abs(b.ui.change24) - Math.abs(a.ui.change24))
      .slice(0, ROWS)
  }, [wlQ.data])

  // 并发拉 N 条 K-line(period=1 小时,count=24)
  const klineResults = useQueries({
    queries: topItems.map((it) => ({
      queryKey: ['kline', it.raw.market_hash_name, { period: 1, count: 24 }],
      queryFn: () =>
        fetchKline(it.raw.market_hash_name, { period: 1, count: 24 }),
      staleTime: 5 * 60_000,
    })),
  })

  const rows: HeatmapRow[] = useMemo(() => {
    return topItems.map((it, i) => {
      const kl = klineResults[i]?.data
      const cells = Array.from({ length: 24 }).map(() => NaN)
      if (kl?.data?.length) {
        // 把 OHLC 按 hour-of-day 投影到 0-23 列
        // 后端按 timestamp 升序;取最近 24 条最近的
        const sorted = [...kl.data].sort((a, b) => a.timestamp - b.timestamp)
        const tail = sorted.slice(-24)
        // 列 0 → 24h ago 那一小时;列 23 → 现在
        for (let col = 0; col < 24; col++) {
          const idx = tail.length - 24 + col
          const o = tail[idx]
          if (!o || o.open === 0) continue
          const pct = Math.abs(((o.close - o.open) / o.open) * 100)
          cells[col] = pct
        }
      }
      return {
        id: it.raw.id,
        name: it.ui.name,
        marketHashName: it.raw.market_hash_name,
        cells,
      }
    })
  }, [topItems, klineResults])

  // 全局 max(忽略 NaN)用于色阶归一化
  const globalMax = useMemo(() => {
    let m = 0
    for (const r of rows) for (const c of r.cells) if (!Number.isNaN(c) && c > m) m = c
    return m
  }, [rows])

  function cellStyle(v: number): React.CSSProperties {
    if (Number.isNaN(v)) {
      return { background: 'var(--hairline-2)' }
    }
    const intensity = globalMax > 0 ? Math.min(1, v / globalMax) : 0
    const opacity = Math.max(0.05, intensity)
    return {
      background: `color-mix(in oklab, var(--accent), transparent ${(1 - opacity) * 100}%)`,
    }
  }

  const someLoading = wlQ.isLoading || klineResults.some((q) => q.isLoading)

  if (wlQ.isLoading) {
    return <div className="py-3 font-mono text-[11px] text-[var(--muted)]">Loading…</div>
  }

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center">
        <div className="font-mono text-[11px] text-[var(--muted)]">No watchlist items</div>
      </div>
    )
  }

  return (
    <div>
      <div
        className="grid gap-[2px] font-mono text-[9.5px]"
        style={{ gridTemplateColumns: '78px repeat(24, 1fr)' }}
      >
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            className="text-center text-[9px] h-[14px]"
            style={{
              color: h === nowHour ? 'var(--accent)' : 'var(--muted-2)',
              fontWeight: h === nowHour ? 600 : 400,
            }}
          >
            {h % 4 === 0 || h === nowHour ? String(h).padStart(2, '0') : ''}
          </div>
        ))}
        {rows.map((r) => (
          <Fragment key={r.id}>
            <div
              className="flex items-center justify-end pr-1.5 text-[10px] text-[var(--muted)] truncate"
              title={r.name}
            >
              {splitItemName(r.name).finish || r.name}
            </div>
            {r.cells.map((v, h) => (
              <div
                key={h}
                className="h-[18px] rounded-[1px]"
                style={{
                  ...cellStyle(v),
                  boxShadow: h === nowHour ? 'inset 0 0 0 1px var(--accent)' : undefined,
                }}
                title={
                  Number.isNaN(v)
                    ? `${r.name} · ${h}:00 · no data`
                    : `${r.name} · ${h}:00 · ${v.toFixed(2)}%`
                }
              />
            ))}
          </Fragment>
        ))}
      </div>

      {/* Period labels */}
      <div
        className="flex mt-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase text-[var(--muted-2)]"
        style={{ paddingLeft: 78 }}
      >
        <span className="flex-[9]">— overnight —</span>
        <span className="flex-[5] text-[var(--muted)]">— morning peak —</span>
        <span className="flex-[4]">— mid —</span>
        <span className="flex-[6] text-[var(--muted)]">— evening peak —</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 font-mono text-[10px] text-[var(--muted)] tracking-[0.1em]">
        <span>0%</span>
        <div className="flex gap-px">
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((v, i) => (
            <span
              key={i}
              className="w-[18px] h-[10px]"
              style={{
                background: `color-mix(in oklab, var(--accent), transparent ${(1 - v) * 100}%)`,
              }}
            />
          ))}
        </div>
        <span>{globalMax > 0 ? `${globalMax.toFixed(1)}%` : '—'}</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="inline-block w-[6px] h-[6px] bg-[var(--accent)]" />
          now · {String(nowHour).padStart(2, '0')}:00
          {someLoading && (
            <span className="ml-2 text-[var(--muted-2)]">loading klines…</span>
          )}
        </span>
      </div>
    </div>
  )
}
