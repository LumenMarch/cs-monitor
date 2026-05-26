import { formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  value: number
  decimals?: number
  withArrow?: boolean
  className?: string
}

/**
 * 涨跌 pill · design.md §4 Pills
 * - >0 用 --up 配色 + --up-bg 底
 * - <0 用 --down 配色 + --down-bg 底
 * - 默认前置 ▲/▼ 箭头(色觉无障碍)
 */
export function DeltaPill({ value, decimals = 2, withArrow = true, className }: Props) {
  const isUp = value > 0
  const isDown = value < 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[3px] px-2 py-[3px] font-mono text-[11.5px] font-medium',
        isUp && 'text-[var(--up)] bg-[var(--up-bg)]',
        isDown && 'text-[var(--down)] bg-[var(--down-bg)]',
        !isUp && !isDown && 'text-[var(--muted)]',
        className,
      )}
    >
      {withArrow && (
        <span aria-hidden className="text-[9px] leading-none">
          {isUp ? '▲' : isDown ? '▼' : '—'}
        </span>
      )}
      <span className="tabular-nums">{formatDelta(value, decimals)}</span>
    </span>
  )
}
