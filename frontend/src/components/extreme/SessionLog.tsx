import type { ExtremeAlertRecord } from '@/api/types'
import { StatusDot } from '@/components/ui/StatusDot'
import { splitItemName, formatDelta } from '@/utils/format'

interface Props {
  events: ExtremeAlertRecord[]
  total?: number
}

/**
 * 终端式 tail -f session log(接真后端 ExtremeAlertRecord)
 * - 头部 ink 底 + 文件路径 + tail -f 呼吸点
 * - 行 6 列:相对时间 · 状态符 · 平台+物品 · Δ% · 度量类型 · ✓
 * - 底部 footer:本批数量
 */
export function SessionLog({ events, total }: Props) {
  const nowMs = Date.now()
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] overflow-hidden">
      <div className="flex justify-between bg-[var(--ink)] text-[var(--bg)] px-[14px] py-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase">
        <span>~/cs-monitor/extreme-track/alerts.log</span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status="live" pulse /> tail -f
        </span>
      </div>
      <div className="font-mono text-[11.5px] max-h-[460px] overflow-auto">
        {events.length === 0 ? (
          <div className="px-[14px] py-6 text-[var(--muted)] text-center text-[11.5px]">
            no alerts yet
          </div>
        ) : (
          events.map((ev, i) => {
            const isLast = i === 0
            const delta =
              ev.price_change_percent ?? ev.quantity_change_percent ?? 0
            const metric: 'price' | 'qty' =
              ev.price_change_percent != null ? 'price' : 'qty'
            const upDir = delta >= 0
            const statusColor =
              metric === 'qty'
                ? 'var(--accent)'
                : upDir
                  ? 'var(--up)'
                  : 'var(--down)'
            const statusGlyph = metric === 'qty' ? '◆' : upDir ? '▲' : '▼'
            const { weapon } = splitItemName(
              ev.display_name || ev.market_hash_name,
            )
            const seconds = Math.max(
              0,
              Math.floor((nowMs - Date.parse(ev.notified_at)) / 1000),
            )
            const relTime = formatRelativeSeconds(seconds)
            return (
              <div
                key={ev.id}
                className={`grid gap-2.5 px-[14px] py-[5px] items-center border-b border-dashed border-[var(--hairline)] last:border-0 ${
                  isLast ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'
                }`}
                style={{
                  gridTemplateColumns: '60px 18px minmax(0,1fr) 78px 50px 40px',
                }}
              >
                <span className="text-[var(--muted)] text-[10.5px]">{relTime}</span>
                <span style={{ color: statusColor }}>{statusGlyph}</span>
                <span className="truncate">
                  <span className="text-[var(--muted)]">{ev.platform}</span> {weapon}
                </span>
                <span className="text-right tnum" style={{ color: statusColor }}>
                  {formatDelta(delta)}
                </span>
                <span className="text-right text-[10.5px] text-[var(--muted-2)] uppercase">
                  {metric}
                </span>
                <span
                  className="text-right text-[10px]"
                  style={{ color: isLast ? 'var(--up)' : 'var(--muted-2)' }}
                >
                  {isLast ? '● live' : '✓'}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="flex justify-between bg-[var(--surface)] border-t border-[var(--hairline)] px-[14px] py-2.5 font-mono text-[10.5px] text-[var(--muted)]">
        <span>
          {events.length} shown
          {total != null && total > events.length ? ` · ${total} total` : ''}
        </span>
        <span>auto-refresh 5s</span>
      </div>
    </div>
  )
}

function formatRelativeSeconds(s: number): string {
  if (s < 60) return `−${s}s`
  if (s < 3600) return `−${Math.floor(s / 60)}m`
  if (s < 86400) return `−${Math.floor(s / 3600)}h`
  return `−${Math.floor(s / 86400)}d`
}
