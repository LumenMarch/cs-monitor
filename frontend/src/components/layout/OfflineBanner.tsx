import { RefreshCcw } from 'lucide-react'

/**
 * Offline banner · design.md §6 Offline state
 * 深色 sticky 顶部横幅,accent 点 + OFFLINE label + 错误信息 + Retry 按钮
 */
export function OfflineBanner() {
  return (
    <div
      className="sticky top-0 z-[51] flex items-center gap-3.5 px-[var(--pad-x)] py-2.5 bg-[var(--ink)] text-[var(--bg)] text-[12.5px] border-b border-[var(--hairline)]"
    >
      <span
        className="inline-flex w-2 h-2 rounded-full bg-[var(--accent)]"
        style={{ boxShadow: '0 0 0 3px rgba(199,90,42,0.25)' }}
      />
      <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-[var(--accent)]">
        OFFLINE
      </span>
      <span>
        Last fetch <strong className="font-medium">14 minutes ago</strong> · prices are stale, alerts paused
      </span>
      <span className="font-mono text-[10.5px] ml-3.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        2 collections queued · 1 alert held
      </span>
      <button
        className="ml-auto inline-flex items-center gap-2 px-3 py-[5px] text-[12px] rounded-[3px] border transition-colors"
        style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--bg)' }}
      >
        <RefreshCcw size={12} /> Retry connection
      </button>
    </div>
  )
}
