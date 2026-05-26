import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/endpoints'
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
import { HERO_METRICS, WATCHLIST } from '@/data/mock'
import { splitItemName } from '@/utils/format'

/**
 * Dashboard · CS Monitor Editorial Trading Terminal · v3.1
 * 实现 design.md §0–§7 全部 dashboard 区块
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
    const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${date} · ${time}`
  }, [])

  // 真后端 summary;Movers / Heatmap / AlertFeed 暂用 mock 占位(下轮接通)
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  })

  // 涨/跌头部 - 标题文案数据(mock,演示用)
  const gainers = [...WATCHLIST].sort((a, b) => b.change24 - a.change24)
  const losers = [...WATCHLIST].sort((a, b) => a.change24 - b.change24)
  const leadGain = splitItemName(gainers[0]!.name).finish
  const leadLoss = splitItemName(losers[0]!.name).finish

  // KPI:有真数据用真数据
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
            {today} · {gainers.filter((g) => g.change24 > 0).length} ↑ {losers.filter((l) => l.change24 < 0).length} ↓ today
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            <em className="not-italic">
              <span className="italic text-[var(--accent)]">+{HERO_METRICS.changePct.toFixed(1)}%</span>
            </em>{' '}
            this month —
            <br />
            led by <em className="italic text-[var(--accent)]">{leadGain}</em>, dragged by{' '}
            <em className="italic text-[var(--accent)]">{leadLoss}</em>.
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
            label: 'Active watchlist',
            value: activeWatch,
            foot: <>{extremeTracks} extreme · monitoring</>,
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
      <section className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div>
          <SectionHead
            num="01"
            title={
              <>
                Today's movers{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  5 ↑ / 5 ↓
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
                  14 today
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
      <section className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
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
            meta="Local time · UTC+8"
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
            meta="Next · 14:00"
          />
          <Card>
            <CollectionsFeed />
          </Card>
        </div>
      </section>
    </div>
  )
}
