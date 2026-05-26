import { useMemo } from 'react'

interface Props {
  series: number[]
  width?: number
  height?: number
}

/**
 * 30 日 range sparkline · design.md(watchlist 表格列)
 * - 高位/低位水平虚线 + 灰圆点
 * - 末端大圆点表示当前值,按首尾趋势上色
 */
export function RangeSparkline({ series, width = 100, height = 26 }: Props) {
  const computed = useMemo(() => {
    if (!series.length) return null
    const min = Math.min(...series)
    const max = Math.max(...series)
    const range = max - min || 1
    const stepX = series.length > 1 ? width / (series.length - 1) : 0
    const pts = series.map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * (height - 6) - 3
      return [x, y] as const
    })
    const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
    const dir = series[series.length - 1]! >= series[0]! ? 'up' : 'down'
    const hiIdx = series.indexOf(max)
    const loIdx = series.indexOf(min)
    return { pts, path, dir, hiIdx, loIdx }
  }, [series, width, height])

  if (!computed) return null

  const { pts, path, dir, hiIdx, loIdx } = computed
  const last = pts[pts.length - 1]!
  const stroke = dir === 'up' ? 'var(--up)' : 'var(--down)'

  return (
    <svg width={width} height={height} className="block overflow-visible">
      <line
        x1={0}
        x2={width}
        y1={pts[hiIdx]![1]}
        y2={pts[hiIdx]![1]}
        stroke="var(--hairline)"
        strokeDasharray="2 3"
        strokeWidth={0.5}
      />
      <line
        x1={0}
        x2={width}
        y1={pts[loIdx]![1]}
        y2={pts[loIdx]![1]}
        stroke="var(--hairline)"
        strokeDasharray="2 3"
        strokeWidth={0.5}
      />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.25} />
      <circle cx={pts[hiIdx]![0]} cy={pts[hiIdx]![1]} r={1.5} fill="var(--muted)" />
      <circle cx={pts[loIdx]![0]} cy={pts[loIdx]![1]} r={1.5} fill="var(--muted)" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke} />
    </svg>
  )
}
