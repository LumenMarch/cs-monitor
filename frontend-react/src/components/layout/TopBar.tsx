import { Bell, Search } from 'lucide-react'
import { TICKER } from '@/data/mock'

interface Props {
  crumb: string
}

/**
 * 顶栏 · design.md §3 + §4
 * - sticky, border-bottom 1px hairline
 * - breadcrumb(Workspace / <crumb>)+ search + 通知 bell
 * - 下方贴 ticker(LIVE label + 滚动条)
 */
export function TopBar({ crumb }: Props) {
  return (
    <header className="sticky top-0 z-[50] border-b border-[var(--hairline)] bg-[var(--bg)]">
      <div className="flex items-center gap-[18px] px-[var(--pad-x)] py-[14px]">
        <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">
          Workspace
          <span className="mx-2 opacity-40">/</span>
          <span className="text-[var(--ink)]">{crumb}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 min-w-[320px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[4px] px-[10px] py-[7px] text-[var(--muted)] text-[13px]">
          <Search size={14} />
          <input
            type="search"
            placeholder="Search 39,000+ items · AK-47, AWP, knife..."
            className="flex-1 border-none bg-transparent outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
            aria-label="Search items"
          />
          <kbd className="font-mono text-[10px] px-[5px] py-[2px] border border-[var(--hairline-2)] rounded-[3px] text-[var(--muted)]">
            ⌘K
          </kbd>
        </div>

        <button
          className="w-[32px] h-[32px] inline-flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] transition-[background,color] duration-[120ms]"
          title="Alerts"
          aria-label="Alerts"
        >
          <Bell size={16} />
        </button>
      </div>

      {/* Ticker */}
      <div
        className="flex items-center border-t border-[var(--hairline)] bg-[var(--paper)] overflow-hidden font-mono text-[12px]"
        style={{ height: 'var(--ticker-h)' }}
        aria-label="Live price ticker"
      >
        <div className="flex-shrink-0 h-full px-[14px] flex items-center bg-[var(--ink)] text-[var(--bg)] tracking-[0.18em] text-[10px] font-semibold">
          LIVE · {TICKER.length} items
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap relative">
          <div
            className="inline-flex gap-[28px] pl-[18px] will-change-transform"
            style={{ animation: 'ticker-scroll 90s linear infinite' }}
          >
            {[...TICKER, ...TICKER].map((t, i) => (
              <div key={i} className="inline-flex items-center gap-2">
                <span className="text-[var(--ink-2)]">{t.sym}</span>
                <span className="text-[var(--ink)]">¥{t.px.toFixed(2)}</span>
                <span className={t.ch >= 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}>
                  {t.ch >= 0 ? '▲' : '▼'} {Math.abs(t.ch).toFixed(2)}%
                </span>
                <span className="text-[var(--muted-2)]">·</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
