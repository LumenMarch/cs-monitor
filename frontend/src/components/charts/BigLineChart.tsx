import { useEffect, useRef, useState } from 'react'

interface Props {
  data: number[]
  height?: number
  paddingY?: number
  currency?: string
}

interface Hover {
  i: number
  v: number
  x: number
  y: number
}

/**
 * 大型 area-line chart · design.md §4
 * - 5 条水平 grid(虚线)+ 当前趋势上色 area + 1.5px line
 * - 悬停十字光标 + 右侧 tooltip(D-N · ¥xxx)
 * - 右侧 y 轴标签靠 var(--bg) 描底
 */
export function BigLineChart({ data, height = 180, paddingY = 16, currency = '¥' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(600)
  const [hover, setHover] = useState<Hover | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setW(el.clientWidth || 600)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const innerH = height - paddingY * 2
  const stepX = w / (data.length - 1 || 1)
  const points = data.map((v, i) => [i * stepX, paddingY + innerH - ((v - min) / range) * innerH] as const)
  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
  const area = `${d} L ${w} ${height} L 0 ${height} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: paddingY + innerH - t * innerH,
    v: min + range * t,
  }))
  const dir = data[data.length - 1]! >= data[0]! ? 'up' : 'down'

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const i = Math.max(0, Math.min(data.length - 1, Math.round(x / stepX)))
    setHover({ i, v: data[i]!, x: points[i]![0], y: points[i]![1] })
  }

  const last = points[points.length - 1]!

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        width={w}
        height={height}
        className="block overflow-visible cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={0}
            x2={w}
            y1={t.y}
            y2={t.y}
            stroke="var(--hairline)"
            strokeWidth={0.5}
            strokeDasharray={i === 0 || i === 4 ? '' : '2 3'}
          />
        ))}
        <path d={area} fill={`var(--${dir})`} opacity={0.06} />
        <path d={d} fill="none" stroke={`var(--${dir})`} strokeWidth={1.5} />
        {hover ? (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={paddingY}
              y2={height - paddingY + 2}
              stroke="var(--ink-2)"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            <circle cx={hover.x} cy={hover.y} r={4} fill="var(--bg)" stroke={`var(--${dir})`} strokeWidth={1.5} />
          </g>
        ) : (
          <>
            <circle cx={last[0]} cy={last[1]} r={3} fill={`var(--${dir})`} />
            <circle cx={last[0]} cy={last[1]} r={6} fill={`var(--${dir})`} opacity={0.18} />
          </>
        )}
      </svg>
      {/* y-axis labels */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col justify-between font-mono text-[10px] text-[var(--muted)] pointer-events-none"
        style={{ paddingTop: paddingY - 6, paddingBottom: paddingY - 6 }}
      >
        {[ticks[4], ticks[2], ticks[0]].map((t, i) => (
          <span key={i} className="bg-[var(--bg)] px-1">
            {t!.v.toFixed(0)}
          </span>
        ))}
      </div>
      {hover && (
        <div
          className="absolute top-1 bg-[var(--ink)] text-[var(--bg)] font-mono text-[11px] px-[9px] py-[5px] rounded-[3px] tracking-[0.04em] pointer-events-none whitespace-nowrap tnum"
          style={{ left: Math.min(Math.max(hover.x - 50, 6), w - 110) }}
        >
          D−{data.length - 1 - hover.i} · {currency}
          {hover.v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  )
}
