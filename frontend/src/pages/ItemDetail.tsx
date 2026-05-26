import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BellRing, GitCompare, Star } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { backendToAlert, backendToPlatformPrices, backendToWatchItem } from '@/api/adapters'
import {
  fetchAlerts,
  fetchKline,
  fetchPlatformPrices,
  fetchWatchlist,
} from '@/api/endpoints'
import { DETAIL_OHLC, type Alert, type OHLC, type WatchItem } from '@/data/mock'
import { formatCurrency, formatDelta, splitItemName } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CountUp } from '@/components/ui/CountUp'
import { ItemTile } from '@/components/ui/ItemTile'
import { SectionHead } from '@/components/ui/SectionHead'
import { WearTag } from '@/components/ui/WearTag'
import { KlineChart } from '@/components/charts/KlineChart'
import { PlatformComparison } from '@/components/detail/PlatformComparison'
import { SignalsBlock } from '@/components/detail/SignalsBlock'

type Range = '7D' | '30D' | '60D' | '1Y'

/** UI range → kline 接口 count 参数(后端固定 period=2=day) */
const RANGE_COUNT: Record<Range, number> = { '7D': 7, '30D': 30, '60D': 60, '1Y': 365 }

/**
 * Item Detail · design.md §3/§4
 * 返回 + breadcrumb · hero(价 + K-line)· 平台比价 · 统计 + Signals · 告警历史
 */
export default function ItemDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [range, setRange] = useState<Range>('60D')

  // —— 通过 watchlist 把 id 解析回 market_hash_name + 基础元数据 ——
  const watchlistQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 60_000,
  })
  const backendItem = watchlistQuery.data?.find((w) => String(w.id) === id)
  const marketHashName = backendItem?.market_hash_name

  // 备用 fallback item(watchlist 还没拿到 / 跳错 id)
  const fallbackItem: WatchItem = {
    id: -1,
    name: 'Loading…',
    wear: 'FT',
    category: 'Rifle',
    price: 0,
    change24: 0,
    change7d: 0,
    threshold: 5,
    monitoring: true,
    series: [],
  }
  const item: WatchItem = backendItem ? backendToWatchItem(backendItem) : fallbackItem

  // —— K-line ——
  const klineQuery = useQuery({
    queryKey: ['kline', marketHashName, range],
    queryFn: () =>
      fetchKline(marketHashName!, {
        period: 2,
        count: RANGE_COUNT[range],
        platform: 'ALL',
      }),
    enabled: !!marketHashName,
    staleTime: 60_000,
    retry: 1,
  })

  const ohlc: OHLC[] = useMemo(() => {
    const data = klineQuery.data?.data
    if (!data?.length) return DETAIL_OHLC // demo fallback
    return data.map((d) => ({
      open: d.open,
      close: d.close,
      high: d.high,
      low: d.low,
      volume: d.volume ?? 0,
    }))
  }, [klineQuery.data])

  // —— 平台比价 ——
  const platformsQuery = useQuery({
    queryKey: ['platform-prices', marketHashName],
    queryFn: () => fetchPlatformPrices(marketHashName!),
    enabled: !!marketHashName,
    staleTime: 60_000,
  })
  const platforms = useMemo(
    () => (platformsQuery.data ? backendToPlatformPrices(platformsQuery.data) : undefined),
    [platformsQuery.data],
  )

  // —— Alert history ——
  const alertsQuery = useQuery({
    queryKey: ['alerts', { mh: marketHashName }],
    queryFn: () => fetchAlerts({ limit: 6, market_hash_name: marketHashName }),
    enabled: !!marketHashName,
    staleTime: 30_000,
  })
  const history: Alert[] = useMemo(
    () => (alertsQuery.data?.items ?? []).map(backendToAlert),
    [alertsQuery.data],
  )

  // —— Hero 数字按 K 线最新收盘价 ——
  const last = ohlc[ohlc.length - 1]!
  const first = ohlc[0]!
  const change = ((last.close - first.close) / first.close) * 100
  const isUp = change >= 0
  const isUp24 = item.change24 >= 0

  const { weapon, finish } = splitItemName(item.name)
  const intPart = Math.floor(last.close)
  const fracPart = (last.close % 1) * 100

  const stats = useMemo(() => {
    const high = Math.max(...ohlc.map((d) => d.high))
    const low = Math.min(...ohlc.map((d) => d.low))
    const volSum = ohlc.reduce((a, d) => a + d.volume, 0)
    const volAvg = Math.round(volSum / ohlc.length)
    return { high, low, volSum, volAvg }
  }, [ohlc])

  const usingDemoKline = !klineQuery.data?.data?.length
  const klineError = klineQuery.error

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Back + breadcrumb —— */}
      <div className="flex items-center gap-3 mb-[18px]">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Watchlist
          <span className="mx-2 opacity-40">/</span>
          <span className="text-[var(--ink)]">{item.name}</span>
        </div>
      </div>

      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2 flex items-center gap-2">
            <WearTag wear={item.wear} />
            <span className="ml-1">{item.category} · Rare · Covert</span>
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0 mt-2">
            {weapon} <span className="text-[var(--muted)]">|</span>{' '}
            <em className="italic text-[var(--accent)]">{finish}</em>
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <Button>
            <GitCompare size={13} /> Add to compare
          </Button>
          <Button>
            <BellRing size={13} /> Configure extreme track
          </Button>
          <Button variant="primary">
            <Star size={13} /> Following · {item.change24.toFixed(0)}%
          </Button>
        </div>
      </div>

      {/* —— Hero —— */}
      <section
        className="grid gap-[32px] pb-0 mb-6"
        style={{ gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)' }}
      >
        {/* —— Hero left —— */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex gap-[22px] font-mono text-[10.5px] tracking-[0.18em] uppercase text-[var(--muted)] flex-wrap">
            <span>BUFF · best bid</span>
            <span>
              <strong className="text-[var(--ink)] font-medium">¥ CNY</strong>
            </span>
            <span>updated 11s ago</span>
          </div>

          <div
            className="font-serif font-normal flex items-baseline gap-[14px]"
            style={{ fontSize: 112, lineHeight: 0.95, letterSpacing: '-0.025em' }}
          >
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
              {isUp ? '▲' : '▼'} {formatCurrency(Math.abs(last.close - first.close))} ({formatDelta(change)})
            </span>
            <span className="font-mono text-[11px] text-[var(--muted)] tracking-[0.1em] uppercase">vs. 60d ago</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[3px] px-[9px] py-[5px] font-mono text-[12px] font-medium',
                isUp24 ? 'text-[var(--up)] bg-[var(--up-bg)]' : 'text-[var(--down)] bg-[var(--down-bg)]',
              )}
            >
              24h {formatDelta(item.change24)}
            </span>
          </div>

          <div className="mt-[18px]">
            <ItemTile size="xl" label={`${item.name} · item image`} />
          </div>
        </div>

        {/* —— Hero right —— */}
        <div className="flex flex-col gap-[14px] border-l border-[var(--hairline)] pl-[32px] min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
              K-line · {range} · daily candle
            </span>
            <div className="flex gap-1">
              {(['7D', '30D', '60D', '1Y'] as const).map((r) => (
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
          <KlineChart ohlc={ohlc} />
          {usingDemoKline && (
            <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted-2)]">
              {klineError
                ? `K-line load failed (${apiErrorMessage(klineError)}) · showing demo`
                : '— K-line · showing demo (no backend data)'}
            </div>
          )}
        </div>
      </section>

      {/* —— Platform comparison —— */}
      <section className="mt-9">
        <SectionHead
          num="05"
          title={
            <>
              Platform comparison{' '}
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                {platforms ? `${platforms.length} sources` : 'demo data'}
              </span>
            </>
          }
          meta={platformsQuery.isLoading ? 'Loading…' : 'Updated just now'}
        />
        <Card className="!p-[22px]">
          <PlatformComparison platforms={platforms} />
        </Card>
      </section>

      {/* —— Statistics + Alert history —— */}
      <section
        className="grid gap-7 mt-7"
        style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}
      >
        <div>
          <SectionHead
            num="06"
            title={
              <>
                Statistics{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">60d</span>
              </>
            }
          />
          <Card>
            <dl
              className="grid gap-x-3 gap-y-1.5 text-[13px]"
              style={{ gridTemplateColumns: '1fr auto' }}
            >
              <KvRow label="Open (60d ago)" value={formatCurrency(first.close)} />
              <KvRow label="High" value={formatCurrency(stats.high)} />
              <KvRow label="Low" value={formatCurrency(stats.low)} />
              <KvRow label="Volume (Σ)" value={stats.volSum.toLocaleString()} />
              <KvRow label="Avg daily volume" value={stats.volAvg.toLocaleString()} />
              <KvRow label="Volatility (σ)" value="3.42%" />
              <KvRow label="RSI-14" value="68.4" />
              <KvRow label="MA-5 / MA-20" value="1814 / 1742" />
              <KvRow label="Alert threshold" value={`${item.threshold}%`} />
              <KvRow label="Cooldown" value="4h" />
            </dl>
            <div className="mt-4 pt-3 border-t border-dashed border-[var(--hairline)]">
              <SignalsBlock />
            </div>
          </Card>
        </div>
        <div>
          <SectionHead
            num="07"
            title={
              <>
                Alert history{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  last 14d
                </span>
              </>
            }
          />
          <Card>
            <div className="flex flex-col">
              {history.map((a, i) => {
                const isUpDelta = a.delta >= 0
                const marker =
                  a.kind === 'surge'
                    ? 'bg-[var(--up)]'
                    : a.kind === 'drop'
                      ? 'bg-[var(--down)]'
                      : 'bg-[var(--muted)]'
                const kind =
                  a.kind === 'surge' ? 'Price surge' : a.kind === 'drop' ? 'Price drop' : 'Quantity change'
                return (
                  <div
                    key={i}
                    className={cn(
                      'grid gap-3 py-3 items-center',
                      i < history.length - 1 && 'border-b border-dashed border-[var(--hairline)]',
                    )}
                    style={{ gridTemplateColumns: '70px 6px 1fr auto' }}
                  >
                    <div className="font-mono text-[11px] text-[var(--muted)]">
                      D−{i} · {a.time}
                    </div>
                    <span className={cn('w-[6px] h-[6px] rounded-full mx-auto', marker)} />
                    <div className="min-w-0 text-[13px] text-[var(--ink)]">
                      <div className="truncate">{kind}</div>
                      <div className="text-[12px] text-[var(--muted)] mt-[2px] truncate">{a.desc}</div>
                    </div>
                    <div
                      className={cn(
                        'font-mono text-[12.5px] tnum text-right',
                        isUpDelta ? 'text-[var(--up)]' : 'text-[var(--down)]',
                      )}
                    >
                      {formatDelta(a.delta)}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">
        {label}
      </dt>
      <dd className="m-0 font-mono tnum text-right text-[var(--ink)]">{value}</dd>
    </>
  )
}
