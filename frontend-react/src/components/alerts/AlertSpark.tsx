interface Props {
  data: number[]
  highlightIdx?: number
  width?: number
  height?: number
}

/**
 * ±1h 告警瞬间 mini 价格曲线 · design.md(告警表格列)
 * - 虚线零基线
 * - 告警瞬间用 dash 竖线 + 圆点标记
 * - 末尾值正负决定线色
 */
export function AlertSpark({ data, highlightIdx, width = 64, height = 24 }: Props) {
  if (!data.length) return null
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 0)
  const range = max - min || 1
  const stepX = data.length > 1 ? width / (data.length - 1) : 0
  const pts = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 6) - 3
    return [x, y] as const
  })
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const last = data[data.length - 1]!
  const dir = last >= 0 ? 'up' : 'down'
  const stroke = `var(--${dir})`
  const zeroY = height - ((0 - min) / range) * (height - 6) - 3

  return (
    <svg width={width} height={height} className="block overflow-visible">
      <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="var(--hairline-2)" strokeWidth={0.5} strokeDasharray="2 2" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.25} />
      {highlightIdx != null && pts[highlightIdx] && (
        <g>
          <line
            x1={pts[highlightIdx]![0]}
            x2={pts[highlightIdx]![0]}
            y1={0}
            y2={height}
            stroke={stroke}
            strokeWidth={0.5}
            strokeDasharray="1.5 2"
            opacity={0.5}
          />
          <circle cx={pts[highlightIdx]![0]} cy={pts[highlightIdx]![1]} r={2.5} fill={stroke} />
        </g>
      )}
    </svg>
  )
}
