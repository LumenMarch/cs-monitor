import { useQuery } from '@tanstack/react-query'
import { fetchArbitrage } from '@/api/endpoints'
import { apiErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import { splitItemName } from '@/utils/format'

/**
 * 跨平台价差 · 接 GET /arbitrage
 * 后端按 spread_percent 倒序返回所有有 ≥2 平台报价的物品
 */
export function SpreadTable() {
  const query = useQuery({
    queryKey: ['arbitrage'],
    queryFn: fetchArbitrage,
    staleTime: 60_000,
  })

  if (query.isLoading) {
    return <div className="py-3 font-mono text-[11px] text-[var(--muted)]">Loading…</div>
  }
  if (query.isError) {
    return (
      <div className="py-3 font-mono text-[11px] text-[var(--down)]">
        {apiErrorMessage(query.error)}
      </div>
    )
  }

  const rows = (query.data ?? []).slice(0, 5)

  if (rows.length === 0) {
    return (
      <div className="py-6 text-center font-mono text-[11px] text-[var(--muted)]">
        no cross-platform price data yet
      </div>
    )
  }

  return (
    <table className="w-full border-collapse text-[13px] -mt-2.5">
      <thead>
        <tr>
          <TH>Item</TH>
          <TH>Buy at</TH>
          <TH numeric>Min</TH>
          <TH>Sell at</TH>
          <TH numeric>Max</TH>
          <TH numeric>Spread</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const display = splitItemName(r.market_hash_name)
          return (
            <tr key={r.market_hash_name}>
              <TD className="truncate" title={r.market_hash_name}>
                {display.finish || display.weapon}
              </TD>
              <TD>
                <span className="font-mono text-[11px] text-[var(--up)] tracking-[0.08em]">
                  {r.min_platform}
                </span>
              </TD>
              <TD numeric className="text-[var(--up)]">
                {formatCurrency(r.min_price)}
              </TD>
              <TD>
                <span className="font-mono text-[11px] text-[var(--down)] tracking-[0.08em]">
                  {r.max_platform}
                </span>
              </TD>
              <TD numeric className="text-[var(--down)]">
                {formatCurrency(r.max_price)}
              </TD>
              <TD numeric className="text-[var(--accent)]">
                +{r.spread_percent.toFixed(2)}%
              </TD>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function TH({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <th
      className={`font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] ${
        numeric ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function TD({
  children,
  numeric,
  className,
  title,
}: {
  children: React.ReactNode
  numeric?: boolean
  className?: string
  title?: string
}) {
  return (
    <td
      title={title}
      className={`px-3 border-b border-[var(--hairline)] align-middle ${numeric ? 'text-right font-mono tnum' : ''} ${className ?? ''}`}
      style={{ height: 'var(--row-h)' }}
    >
      {children}
    </td>
  )
}
