import { type ReactNode } from 'react'
import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/utils/cn'

interface Kpi {
  label: string
  value: number
  format?: (n: number) => string
  suffix?: ReactNode
  foot: ReactNode
  /** foot 颜色 */
  footTone?: 'up' | 'down' | 'neutral'
}

interface Props {
  items: Kpi[]
}

/**
 * KPI 4 列 strip · design.md §3 + §4
 * - 单卡 bordered,4 等分,1px 内分割
 * - 衬线 38px 数字 · count-up · hover 微 lift
 */
export function KpiStrip({ items }: Props) {
  return (
    <section
      className="grid border border-[var(--hairline)] rounded-[4px] bg-[var(--surface-2)] overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((kpi, i) => (
        <div
          key={i}
          className={cn(
            'flex flex-col gap-1 px-[22px] py-[18px] transition-transform duration-200 hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(20,20,15,0.04)]',
            i < items.length - 1 && 'border-r border-[var(--hairline)]',
          )}
        >
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
            {kpi.label}
          </div>
          <div className="font-serif text-[38px] leading-none tracking-[-0.01em]">
            <CountUp value={kpi.value} duration={800 + i * 80} format={kpi.format ?? ((v) => String(Math.floor(v)))} />
            {kpi.suffix}
          </div>
          <div
            className={cn(
              'font-mono text-[11px] flex items-center gap-1.5',
              kpi.footTone === 'up' && 'text-[var(--up)]',
              kpi.footTone === 'down' && 'text-[var(--down)]',
              !kpi.footTone || kpi.footTone === 'neutral' ? 'text-[var(--muted)]' : '',
            )}
          >
            {kpi.foot}
          </div>
        </div>
      ))}
    </section>
  )
}
