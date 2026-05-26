import { WATCHLIST } from '@/data/mock'
import { formatCurrency } from '@/utils/format'

/** 跨平台价差 · design.md(Analytics) */
export function SpreadTable() {
  const rows = WATCHLIST.slice(0, 5).map((w) => ({
    ...w,
    min: w.price * 0.95,
    max: w.price * 1.06,
    spread: Math.abs(w.change7d) + 3.5,
  }))

  return (
    <table className="w-full border-collapse text-[13px] -mt-2.5">
      <thead>
        <tr>
          <TH>Item</TH>
          <TH numeric>Min</TH>
          <TH numeric>Max</TH>
          <TH numeric>Spread</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id}>
            <TD className="truncate">{w.name}</TD>
            <TD numeric>{formatCurrency(w.min)}</TD>
            <TD numeric>{formatCurrency(w.max)}</TD>
            <TD numeric className="text-[var(--accent)]">+{w.spread.toFixed(2)}%</TD>
          </tr>
        ))}
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
}: {
  children: React.ReactNode
  numeric?: boolean
  className?: string
}) {
  return (
    <td
      className={`px-3 border-b border-[var(--hairline)] align-middle ${numeric ? 'text-right font-mono tnum' : ''} ${className ?? ''}`}
      style={{ height: 'var(--row-h)' }}
    >
      {children}
    </td>
  )
}
