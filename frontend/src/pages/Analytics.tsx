import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHead } from '@/components/ui/SectionHead'
import { VolatilityCalendar } from '@/components/analytics/VolatilityCalendar'
import { CategoryBars } from '@/components/analytics/CategoryBars'
import { SpreadTable } from '@/components/analytics/SpreadTable'
import { LiquidityRanking } from '@/components/analytics/LiquidityRanking'

/**
 * Analytics · design.md §4
 * 2×2 section row:Volatility calendar / Category breakdown / Spread / Liquidity
 */
export default function Analytics() {
  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0 page-anim">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            05 · Analytics
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Market analytics
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[64ch]">
            Cross-platform spreads, calendar volatility, and category breakdowns. Built from your watchlist
            plus 39k indexed items.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button>Last 30 days</Button>
          <Button>Export CSV</Button>
        </div>
      </div>

      {/* mock-only 提示:只有 Cross-platform spread(SpreadTable)是真实数据 */}
      <div className="mb-7 px-[14px] py-[10px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[4px] font-mono text-[11px] text-[var(--muted)] leading-[1.55]">
        当前 <span className="text-[var(--ink-2)]">Cross-platform spread</span> 已接 /arbitrage 真后端;
        <span className="text-[var(--ink-2)]"> Volatility calendar</span> /
        <span className="text-[var(--ink-2)]"> Category breakdown</span> /
        <span className="text-[var(--ink-2)]"> Liquidity ranking</span> 仍为设计预览,后端尚未提供对应聚合接口。
      </div>

      {/* —— Row 1:Calendar / Categories —— */}
      <section className="grid gap-7 mb-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div>
          <SectionHead
            num="01"
            title={
              <>
                Volatility calendar{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  last 31d
                </span>
              </>
            }
            meta="cell · abs % change"
          />
          <Card>
            <VolatilityCalendar />
          </Card>
        </div>

        <div>
          <SectionHead
            num="02"
            title={
              <>
                Category breakdown{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  by value
                </span>
              </>
            }
            meta="12 items"
          />
          <Card>
            <CategoryBars />
          </Card>
        </div>
      </section>

      {/* —— Row 2:Spread / Liquidity —— */}
      <section className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div>
          <SectionHead
            num="03"
            title={
              <>
                Cross-platform spread{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  top 5
                </span>
              </>
            }
          />
          <Card>
            <SpreadTable />
          </Card>
        </div>
        <div>
          <SectionHead
            num="04"
            title={
              <>
                Liquidity ranking{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  listings · 24h
                </span>
              </>
            }
          />
          <Card>
            <LiquidityRanking />
          </Card>
        </div>
      </section>
    </div>
  )
}
