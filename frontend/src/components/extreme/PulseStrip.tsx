import type { TrackEvent } from './types'
import { cn } from '@/utils/cn'

interface Props {
  events: TrackEvent[]
  live: boolean
  /** 期望显示的柱子总数 · 不足在右侧补 dim 占位 */
  slots?: number
}

/**
 * 近 N 次告警脉冲柱 · 实数据版
 * - 真实数据稀疏,所以不足槽位用占位条补齐
 * - 按 Δ% 中线上下分布(涨上、跌下);quantity 类用 accent
 * - 最后一根放大 + 发光环
 */
export function PulseStrip({ events, live, slots = 30 }: Props) {
  const padded = events.slice(-slots)
  const maxAbs = Math.max(0.5, ...padded.map((e) => Math.abs(e.delta)))
  const filler = slots - padded.length

  return (
    <div className="flex items-center gap-[1.5px] h-[44px] px-0.5 bg-[var(--surface)] rounded-[3px] border border-[var(--hairline)]">
      {Array.from({ length: filler }).map((_, i) => (
        <div
          key={`f-${i}`}
          className="rounded-[1px] min-h-[2px] opacity-30 self-center"
          style={{ flex: 1, height: '8%', background: 'var(--hairline-2)' }}
        />
      ))}
      {padded.map((e, i) => {
        const hRatio = Math.abs(e.delta) / maxAbs
        const heightPct = Math.max(8, hRatio * 88)
        const isLast = i === padded.length - 1 && live
        const color =
          e.metric === 'qty'
            ? 'var(--accent)'
            : e.delta >= 0
              ? 'var(--up)'
              : 'var(--down)'
        return (
          <div
            key={`e-${e.notifiedAt}-${i}`}
            title={`${e.metric === 'qty' ? 'Quantity' : 'Price'} Δ ${e.delta.toFixed(2)}% · ${new Date(e.notifiedAt).toLocaleTimeString()}`}
            className={cn('rounded-[1px] min-h-[2px]', isLast && 'scale-y-105')}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              background: color,
              opacity: isLast ? 1 : 0.65,
              alignSelf: e.delta >= 0 ? 'flex-end' : 'flex-start',
              boxShadow: isLast ? `0 0 0 1.5px var(--bg), 0 0 0 2.5px ${color}` : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
