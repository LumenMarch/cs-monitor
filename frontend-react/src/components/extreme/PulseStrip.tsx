import type { PollEvent } from './types'
import { cn } from '@/utils/cn'

interface Props {
  history: PollEvent[]
  live: boolean
}

/**
 * 30 次轮询脉冲柱 · design.md(Extreme Track §4)
 * - 按 Δ% 中线上下分布(涨上、跌下、429 用 accent 跨过中线)
 * - 最后一根放大 + 发光环表示"刚到"
 * - 容器 1px 边 + surface 底
 */
export function PulseStrip({ history, live }: Props) {
  const maxAbs = Math.max(0.5, ...history.map((x) => Math.abs(x.delta)))
  return (
    <div className="flex items-center gap-[1.5px] h-[44px] px-0.5 bg-[var(--surface)] rounded-[3px] border border-[var(--hairline)]">
      {history.map((h, i) => {
        const hRatio = Math.abs(h.delta) / maxAbs
        const heightPct = Math.max(8, hRatio * 88)
        const isLast = i === history.length - 1 && live
        const color =
          h.status === '429' ? 'var(--accent)' : h.delta >= 0 ? 'var(--up)' : 'var(--down)'
        return (
          <div
            key={i}
            title={h.status === '429' ? '429 backoff' : `Δ ${h.delta.toFixed(2)}% · ${h.ms}ms`}
            className={cn('rounded-[1px] min-h-[2px]', isLast && 'scale-y-105')}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              background: color,
              opacity: isLast ? 1 : 0.65,
              alignSelf: h.delta >= 0 ? 'flex-end' : 'flex-start',
              boxShadow: isLast ? `0 0 0 1.5px var(--bg), 0 0 0 2.5px ${color}` : undefined,
              color,
            }}
          />
        )
      })}
    </div>
  )
}
