import type { SessionEvent } from './types'
import { StatusDot } from '@/components/ui/StatusDot'
import { splitItemName } from '@/utils/format'

interface Props {
  events: SessionEvent[]
}

/**
 * 终端式 tail -f session log · design.md(Extreme Track §4)
 * - 头:ink 底 + 文件路径 + 实时呼吸点
 * - 行 6 列:−Ns · 状态符 · 平台+物品 · Δ% · ms · live/✓
 * - 底部 footer:throttle 提示 + quiet hours
 */
export function SessionLog({ events }: Props) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] overflow-hidden">
      <div className="flex justify-between bg-[var(--ink)] text-[var(--bg)] px-[14px] py-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase">
        <span>~/lumen/cs-monitor/track.log</span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status="live" pulse /> tail -f
        </span>
      </div>
      <div className="font-mono text-[11.5px] max-h-[460px] overflow-hidden">
        {events.map((ev, i) => {
          const isLast = i === events.length - 1
          const upDir = ev.delta >= 0
          const statusColor =
            ev.status === '429'
              ? 'var(--accent)'
              : upDir
                ? 'var(--up)'
                : 'var(--down)'
          const statusGlyph = ev.status === '429' ? '⚠' : upDir ? '▲' : '▼'
          const valueText =
            ev.status === '429' ? 'BACKOFF' : `${upDir ? '+' : '−'}${Math.abs(ev.delta).toFixed(2)}%`
          const { weapon } = splitItemName(ev.tracker)
          return (
            <div
              key={i}
              className={`grid gap-2.5 px-[14px] py-[5px] items-center border-b border-dashed border-[var(--hairline)] last:border-0 ${
                isLast ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'
              }`}
              style={{ gridTemplateColumns: '56px 18px minmax(0,1fr) 70px 56px 40px' }}
            >
              <span className="text-[var(--muted)] text-[10.5px]">−{ev.time}s</span>
              <span style={{ color: statusColor }}>{statusGlyph}</span>
              <span className="truncate">
                <span className="text-[var(--muted)]">{ev.platform}</span> {weapon}
              </span>
              <span className="text-right tnum" style={{ color: statusColor }}>
                {valueText}
              </span>
              <span className="text-right text-[10.5px] text-[var(--muted-2)]">{ev.ms}ms</span>
              <span
                className="text-right text-[10px]"
                style={{ color: isLast ? 'var(--up)' : 'var(--muted-2)' }}
              >
                {isLast ? '● live' : '✓'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between bg-[var(--surface)] border-t border-[var(--hairline)] px-[14px] py-2.5 font-mono text-[10.5px] text-[var(--muted)]">
        <span>Tail throttled · {events.length} / 4213 polls today</span>
        <span>quiet 23:30 — 07:00</span>
      </div>
    </div>
  )
}
