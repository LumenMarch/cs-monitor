import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary, fetchWatchlist } from '@/api/endpoints'
import { backendToWatchItem } from '@/api/adapters'
import { HeroBlock } from '@/components/dashboard/HeroBlock'
import { KpiStrip } from '@/components/dashboard/KpiStrip'
import { MoversSplit } from '@/components/dashboard/MoversTable'
import { AlertFeed } from '@/components/dashboard/AlertFeed'
import { VolatilityHeatmap } from '@/components/dashboard/VolatilityHeatmap'
import { CollectionsFeed } from '@/components/dashboard/CollectionsFeed'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'
import { LoadingDashboard } from '@/components/dashboard/LoadingDashboard'
import { Card } from '@/components/ui/Card'
import { SectionHead } from '@/components/ui/SectionHead'
import { useTweaks } from '@/stores/tweaks'
import { formatDelta, splitItemName } from '@/utils/format'

/**
 * Dashboard · CS Monitor Editorial Trading Terminal
 * 所有区块均接 /api 后端,Tweaks 仍可强制切到 Empty/Loading 演示态
 */
export default function Dashboard() {
  const appState = useTweaks((s) => s.appState)
  if (appState === 'empty') return <EmptyDashboard />
  if (appState === 'loading') return <LoadingDashboard />

  return <DashboardContent />
}

function DashboardContent() {
  const today = useMemo(() => {
    const d = new Date()
    const date = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${date} · ${time}`
  }, [])

  const summaryQ = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })
  const summary = summaryQ.data

  const watchlistQ = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 60_000,
  })

  // 用真 watchlist 算 leader / dragger + 今日涨跌平衡 + 7d portfolio % + watchlist σ%
  const { leadGain, leadLoss, upCount, downCount, sevenDayPct, sevenDayHasData, volatility } =
    useMemo(() => {
      const raw = watchlistQ.data ?? []
      const items = raw.map(backendToWatchItem)
      const sortedByChange = [...items].sort((a, b) => b.change24 - a.change24)
      const gain = sortedByChange[0]
      const loss = sortedByChange[sortedByChange.length - 1]

      // 7d portfolio %:把各 item sparkline 投影到等长后逐点相加,头尾比对
      const sparks = raw.map((it) => it.sparkline ?? []).filter((s) => s.length > 0)
      let pct = 0
      let hasSeries = false
      if (sparks.length > 0) {
        const minLen = Math.min(...sparks.map((s) => s.length))
        if (minLen >= 2) {
          const series: number[] = []
          for (let i = 0; i < minLen; i++) {
            let sum = 0
            for (const s of sparks) sum += s[s.length - minLen + i] ?? 0
            series.push(sum)
          }
          const end = series[series.length - 1]!
          const start = series[Math.max(0, series.length - 7)]!
          if (start > 0) {
            pct = ((end - start) / start) * 100
            hasSeries = true
          }
        }
      }

      // Watchlist σ%:每个 item 计算 stddev / mean,再取平均 → 整组 7d 波动近似
      const sigmas: number[] = []
      for (const s of sparks) {
        if (s.length < 2) continue
        const mean = s.reduce((a, b) => a + b, 0) / s.length
        if (mean <= 0) continue
        const variance = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length
        sigmas.push((Math.sqrt(variance) / mean) * 100)
      }
      const vol =
        sigmas.length > 0 ? sigmas.reduce((a, b) => a + b, 0) / sigmas.length : 0

      return {
        leadGain: gain ? splitItemName(gain.name).finish || gain.name : null,
        leadLoss: loss ? splitItemName(loss.name).finish || loss.name : null,
        upCount: items.filter((i) => i.change24 > 0).length,
        downCount: items.filter((i) => i.change24 < 0).length,
        sevenDayPct: pct,
        sevenDayHasData: hasSeries,
        volatility: vol,
      }
    }, [watchlistQ.data])

  // KPI:真后端数据
  const todayAlerts = summary?.today_alert_count ?? 0
  const yesterdayAlerts = summary?.yesterday_alert_count ?? 0
  const alertDelta = todayAlerts - yesterdayAlerts
  const collections = summary?.today_collection_count ?? 0
  const apiQuotaPct = summary?.api_quota_percent ?? 0
  const activeWatch = summary?.active_watchlist ?? 0
  const extremeTracks = summary?.extreme_track_count ?? 0

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            {today} · {upCount} ↑ {downCount} ↓ today
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            {sevenDayHasData ? (
              <>
                <em className="italic text-[var(--accent)]">
                  {formatDelta(sevenDayPct, 1)}
                </em>{' '}
                this 7d —
                <br />
                {leadGain && (
                  <>
                    led by <em className="italic text-[var(--accent)]">{leadGain}</em>
                  </>
                )}
                {leadGain && leadLoss && ', '}
                {leadLoss && (
                  <>
                    dragged by <em className="italic text-[var(--accent)]">{leadLoss}</em>
                  </>
                )}
                .
              </>
            ) : leadGain || leadLoss ? (
              <>
                Watching{' '}
                <em className="italic text-[var(--accent)]">{activeWatch}</em> items —
                <br />
                {leadGain && (
                  <>
                    led by <em className="italic text-[var(--accent)]">{leadGain}</em>
                  </>
                )}
                {leadGain && leadLoss && ', '}
                {leadLoss && (
                  <>
                    dragged by <em className="italic text-[var(--accent)]">{leadLoss}</em>
                  </>
                )}
                .
              </>
            ) : (
              <>
                No <em className="italic text-[var(--accent)]">watchlist</em> yet —
                <br />
                add items to start tracking.
              </>
            )}
          </h1>
        </div>
      </div>

      {/* —— Hero —— */}
      <HeroBlock />

      {/* —— KPI strip(真后端数据) —— */}
      <KpiStrip
        items={[
          {
            label: "Today's Alerts",
            value: todayAlerts,
            foot:
              alertDelta === 0 ? (
                <>= vs. yesterday</>
              ) : alertDelta > 0 ? (
                <>▲ {alertDelta} vs. yesterday</>
              ) : (
                <>▼ {Math.abs(alertDelta)} vs. yesterday</>
              ),
            footTone: alertDelta > 0 ? 'up' : alertDelta < 0 ? 'down' : 'neutral',
          },
          {
            label: 'Collections today',
            value: collections,
            foot: <>every {summary?.check_interval_minutes ?? 30} min</>,
          },
          {
            label: 'Watchlist Volatility',
            value: volatility,
            format: (v) => v.toFixed(1),
            suffix: <span className="text-[20px] text-[var(--muted)] ml-0.5">σ%</span>,
            foot: (
              <>
                across {activeWatch} items · {extremeTracks} extreme
              </>
            ),
          },
          {
            label: 'API Quota',
            value: apiQuotaPct,
            format: (v) => v.toFixed(0),
            suffix: <span className="text-[20px] text-[var(--muted)]">%</span>,
            foot: <>SteamDT daily</>,
          },
        ]}
      />

      <div className="h-9" />

      {/* —— Movers + Alerts —— */}
      <section
        className="grid gap-7"
        style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}
      >
        <div>
          <SectionHead
            num="01"
            title={
              <>
                Today's movers{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  {upCount} ↑ / {downCount} ↓
                </span>
              </>
            }
            meta={<a className="hover:text-[var(--accent)] cursor-pointer">View all watchlist →</a>}
          />
          <Card>
            <MoversSplit />
          </Card>
        </div>

        <div>
          <SectionHead
            num="02"
            title={
              <>
                Alert feed{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  {todayAlerts} today
                </span>
              </>
            }
            meta={<a className="hover:text-[var(--accent)] cursor-pointer">All alerts →</a>}
          />
          <Card>
            <AlertFeed limit={6} />
          </Card>
        </div>
      </section>

      <div className="h-9" />

      {/* —— Heatmap + Collections —— */}
      <section
        className="grid gap-7"
        style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}
      >
        <div>
          <SectionHead
            num="03"
            title={
              <>
                24h volatility heatmap{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  absolute % change
                </span>
              </>
            }
            meta="Hourly K-line"
          />
          <Card>
            <VolatilityHeatmap />
          </Card>
        </div>
        <div>
          <SectionHead
            num="04"
            title={
              <>
                System pulse{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  scheduler
                </span>
              </>
            }
            meta={
              summary?.last_update
                ? new Date(summary.last_update).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : '—'
            }
          />
          <Card>
            <CollectionsFeed />
          </Card>
        </div>
      </section>
    </div>
  )
}
