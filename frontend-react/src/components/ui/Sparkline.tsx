import { useMemo } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  data: number[]
  width?: number
  height?: number
  /** 自动按首尾趋势上色 */
  direction?: 'up' | 'down' | 'auto' | 'neutral'
  withArea?: boolean
  withEndDot?: boolean
  className?: string
}

/**
 * 内联 SVG sparkline · design.md §4 Sparklines
 * - preserveAspectRatio='none' 让线条充满容器
 * - 描线动画通过 stroke-dasharray 实现 800ms cubic
 * - 末端 1.5–3px 点
 */
export function Sparkline({
  data,
  width = 50,
  height = 22,
  direction = 'auto',
  withArea = true,
  withEndDot = true,
  className,
}: Props) {
  const { line, area, endX, endY, dir } = useMemo(() => {
    if (!data.length) {
      return { line: '', area: '', endX: 0, endY: 0, dir: 'neutral' as const }
    }
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const stepX = data.length > 1 ? width / (data.length - 1) : 0
    const points = data.map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * height
      return [x, y] as const
    })
    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    const last = points[points.length - 1]!
    const first = points[0]!
    const areaPath = `${linePath} L${last[0].toFixed(2)},${height} L${first[0].toFixed(2)},${height} Z`
    const computedDir: 'up' | 'down' | 'neutral' =
      direction === 'auto' ? (data[data.length - 1]! > data[0]! ? 'up' : data[data.length - 1]! < data[0]! ? 'down' : 'neutral') : direction
    return { line: linePath, area: areaPath, endX: last[0], endY: last[1], dir: computedDir }
  }, [data, width, height, direction])

  const stroke =
    dir === 'up'
      ? 'stroke-[var(--up)]'
      : dir === 'down'
        ? 'stroke-[var(--down)]'
        : 'stroke-[var(--ink)]'
  const fill =
    dir === 'up'
      ? 'fill-[var(--up)] opacity-[0.08]'
      : dir === 'down'
        ? 'fill-[var(--down)] opacity-[0.08]'
        : 'fill-[var(--ink)] opacity-[0.06]'
  const dotFill =
    dir === 'up' ? 'fill-[var(--up)]' : dir === 'down' ? 'fill-[var(--down)]' : 'fill-[var(--ink)]'

  return (
    <svg
      className={cn('overflow-visible block', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="sparkline"
    >
      {withArea && <path d={area} className={fill} />}
      <path
        d={line}
        className={cn('fill-none', stroke)}
        strokeWidth={1.25}
        style={{
          strokeDasharray: 220,
          strokeDashoffset: 220,
          animation: 'spark-draw 800ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards',
        }}
      />
      {withEndDot && data.length > 0 && (
        <circle cx={endX} cy={endY} r={1.8} className={dotFill} />
      )}
    </svg>
  )
}
