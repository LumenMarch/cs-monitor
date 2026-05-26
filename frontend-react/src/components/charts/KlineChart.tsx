import { useEffect, useMemo, useRef, useState } from 'react'
import type { OHLC } from '@/data/mock'

interface Props {
  ohlc: OHLC[]
  height?: number
}

/**
 * K-line 蜡烛图 · design.md §4
 * - 蜡烛(up/down 上色)+ 上下影线
 * - MA-5(accent 1.25px 实线) · MA-20(ink-2 1px 虚线)
 * - 下方 22% 区域为成交量柱(透明 0.65)
 * - 十字光标 + 右侧黑色 pill 价格 + 左上 OHLC tooltip
 * - ResizeObserver 自适应宽度
 */
export function KlineChart({ ohlc, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(800)
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setW(el.clientWidth || 800)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (!ohlc.length) return null
    const priceArea = { top: 16, bottom: height * 0.78 - 6 }
    const volArea = { top: height * 0.78 + 14, bottom: height - 22 }
    const padR = 48
    const innerW = w - padR
    const high = Math.max(...ohlc.map((d) => d.high))
    const low = Math.min(...ohlc.map((d) => d.low))
    const range = high - low || 1
    const volMax = Math.max(...ohlc.map((d) => d.volume))
    const slotW = innerW / ohlc.length
    const candleW = Math.max(2, slotW * 0.6)

    const yPrice = (v: number) => priceArea.top + (priceArea.bottom - priceArea.top) * (1 - (v - low) / range)
    const yVol = (v: number) => volArea.bottom - (volArea.bottom - volArea.top) * (v / volMax)

    const closes = ohlc.map((d) => d.close)
    const ma = (n: number) =>
      closes.map((_, i) => {
        if (i < n - 1) return null
        let s = 0
        for (let k = i - n + 1; k <= i; k++) s += closes[k]!
        return s / n
      })
    const ma5 = ma(5)
    const ma20 = ma(20)

    const pathFor = (arr: (number | null)[]) => {
      let started = false
      let d = ''
      arr.forEach((v, i) => {
        if (v == null) return
        const x = i * slotW + slotW / 2
        const y = yPrice(v)
        d += `${started ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `
        started = true
      })
      return d.trim()
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: priceArea.top + (priceArea.bottom - priceArea.top) * (1 - t),
      v: low + range * t,
    }))

    const totalDays = ohlc.length
    const xLabels: { x: number; label: string }[] = []
    for (let i = 0; i < 5; i++) {
      const idx = Math.round((i / 4) * (totalDays - 1))
      xLabels.push({ x: idx * slotW + slotW / 2, label: `${Math.max(1, totalDays - idx)}d` })
    }

    return { priceArea, volArea, innerW, slotW, candleW, yPrice, yVol, pathFor, ma5, ma20, yTicks, xLabels }
  }, [ohlc, w, height])

  if (!layout) return null

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !layout) return
    const x = e.clientX - rect.left
    if (x < 0 || x > layout.innerW) {
      setHover(null)
      return
    }
    const i = Math.max(0, Math.min(ohlc.length - 1, Math.floor(x / layout.slotW)))
    setHover({ i, x: i * layout.slotW + layout.slotW / 2 })
  }

  const hoverD = hover ? ohlc[hover.i]! : null
  const hoverUp = hoverD ? hoverD.close >= hoverD.open : null
  const { priceArea, volArea, innerW, slotW, candleW, yPrice, yVol, pathFor, ma5, ma20, yTicks, xLabels } = layout

  return (
    <div ref={containerRef} className="relative">
      <svg
        ref={svgRef}
        className="block w-full"
        width={w}
        height={height}
        style={{ cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Horizontal grid */}
        {yTicks.map((t, i) => (
          <line key={`g-${i}`} x1={0} x2={innerW} y1={t.y} y2={t.y} stroke="var(--hairline)" strokeWidth={0.5} />
        ))}
        <line
          x1={0}
          x2={innerW}
          y1={volArea.top - 4}
          y2={volArea.top - 4}
          stroke="var(--hairline-2)"
          strokeWidth={0.5}
        />

        {/* Candles + volume */}
        {ohlc.map((d, i) => {
          const up = d.close >= d.open
          const x = i * slotW + (slotW - candleW) / 2
          const cx = i * slotW + slotW / 2
          const yO = yPrice(d.open)
          const yC = yPrice(d.close)
          const yH = yPrice(d.high)
          const yL = yPrice(d.low)
          const top = Math.min(yO, yC)
          const h = Math.max(0.5, Math.abs(yC - yO))
          const color = up ? 'var(--up)' : 'var(--down)'
          const dim = hover && hover.i !== i ? 0.55 : 1
          return (
            <g key={i} opacity={dim}>
              <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth={1} />
              <rect x={x} y={top} width={candleW} height={h} fill={color} />
              <rect
                x={cx - candleW / 2}
                y={yVol(d.volume)}
                width={candleW}
                height={volArea.bottom - yVol(d.volume)}
                fill={color}
                opacity={0.65}
              />
            </g>
          )
        })}

        {/* MA */}
        <path d={pathFor(ma5)} fill="none" stroke="var(--accent)" strokeWidth={1.25} />
        <path d={pathFor(ma20)} fill="none" stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="3 3" />

        {/* Crosshair */}
        {hover && hoverD && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={priceArea.top}
              y2={volArea.bottom}
              stroke="var(--ink-2)"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            <line
              x1={0}
              x2={innerW}
              y1={yPrice(hoverD.close)}
              y2={yPrice(hoverD.close)}
              stroke="var(--ink-2)"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            <rect x={innerW - 2} y={yPrice(hoverD.close) - 8} width={48} height={16} fill="var(--ink)" />
            <text
              x={innerW + 22}
              y={yPrice(hoverD.close) + 3}
              fill="var(--bg)"
              fontFamily="var(--font-mono)"
              fontSize={10}
              textAnchor="middle"
            >
              {hoverD.close.toFixed(0)}
            </text>
          </g>
        )}

        {/* Y axis labels */}
        {yTicks.map((t, i) => (
          <text
            key={`yl-${i}`}
            x={w - 4}
            y={t.y + 3}
            textAnchor="end"
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            fontSize={10}
          >
            {t.v.toFixed(0)}
          </text>
        ))}
        {/* X axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={`xl-${i}`}
            x={l.x}
            y={height - 6}
            textAnchor="middle"
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            fontSize={10}
          >
            -{l.label}
          </text>
        ))}
        <text
          x={w - 4}
          y={volArea.top + 10}
          textAnchor="end"
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
          fontSize={10}
          opacity={0.7}
        >
          VOL
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute left-2.5 top-2.5 flex gap-3.5 font-mono text-[10.5px] text-[var(--muted)] tracking-[0.08em] pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-[1.5px] bg-[var(--accent)]" />
          MA5
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 border-t border-dashed border-[var(--ink-2)]" />
          MA20
        </span>
      </div>

      {/* OHLC tooltip */}
      {hover && hoverD && (
        <div
          className="absolute top-2.5 grid bg-[var(--ink)] text-[var(--bg)] font-mono text-[10.5px] tracking-[0.04em] px-3 py-2 rounded-[3px] tnum pointer-events-none whitespace-nowrap"
          style={{
            left: Math.min(Math.max(hover.x + 10, 6), w - 220),
            gridTemplateColumns: 'auto auto',
            columnGap: 12,
            rowGap: 3,
          }}
        >
          <span style={{ opacity: 0.6 }}>DAY</span>
          <span>D−{ohlc.length - 1 - hover.i}</span>
          <span style={{ opacity: 0.6 }}>O</span>
          <span>{hoverD.open.toFixed(2)}</span>
          <span style={{ opacity: 0.6 }}>H</span>
          <span>{hoverD.high.toFixed(2)}</span>
          <span style={{ opacity: 0.6 }}>L</span>
          <span>{hoverD.low.toFixed(2)}</span>
          <span style={{ opacity: 0.6 }}>C</span>
          <span style={{ color: hoverUp ? '#f8b4ad' : '#a3e9c8' }}>{hoverD.close.toFixed(2)}</span>
          <span style={{ opacity: 0.6 }}>VOL</span>
          <span>{hoverD.volume.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
