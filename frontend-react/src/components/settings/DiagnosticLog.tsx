import { Button } from '@/components/ui/Button'

interface LogLine {
  time: string
  status: 'ok' | 'warn' | 'err'
  text: string
}

const LOG: LogLine[] = [
  { time: '14:30:01.142', status: 'ok', text: 'GET /api/v1/merge?ids=12 · 184ms' },
  { time: '14:30:01.401', status: 'ok', text: '5 platforms merged · 60 quotes' },
  { time: '13:08:22.001', status: 'warn', text: '429 BUFF · backoff 4s' },
]

/**
 * SteamDT 诊断日志卡 · design.md(Settings § API)
 */
export function DiagnosticLog() {
  return (
    <div className="mt-5 flex justify-between items-center px-[18px] py-[14px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[4px]">
      <div>
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] mb-1">
          Diagnostic log
        </div>
        {LOG.map((l, i) => {
          const glyph = l.status === 'ok' ? '✓' : l.status === 'warn' ? '!' : '✕'
          const color =
            l.status === 'ok' ? 'var(--up)' : l.status === 'warn' ? 'var(--accent)' : 'var(--down)'
          return (
            <div
              key={i}
              className="font-mono text-[11.5px] text-[var(--ink-2)]"
              style={{ color: i === 2 ? 'var(--muted)' : undefined }}
            >
              {l.time} <span style={{ color }}>{glyph}</span> {l.text}
            </div>
          )
        })}
      </div>
      <Button>View full log →</Button>
    </div>
  )
}
