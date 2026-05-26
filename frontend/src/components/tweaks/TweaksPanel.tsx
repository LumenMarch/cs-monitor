import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { useTweaks, type Accent, type Theme, type RiseFall, type Density, type AppState } from '@/stores/tweaks'
import { cn } from '@/utils/cn'

const ACCENT_SWATCHES: { value: Accent; color: string }[] = [
  { value: 'sienna', color: '#c75a2a' },
  { value: 'lime', color: '#6f8d2e' },
  { value: 'cobalt', color: '#2c54b4' },
  { value: 'plum', color: '#7a3a72' },
]

/**
 * Tweaks 浮动抽屉 · design.md §1
 * 右下角圆形 trigger · 抽屉从右滑入 · Esc / 点 backdrop 关闭
 */
export function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const { theme, accent, riseFall, density, appState, set } = useTweaks()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        aria-label="Open design tweaks"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] w-[44px] h-[44px] rounded-full bg-[var(--ink)] text-[var(--bg)] inline-flex items-center justify-center transition-transform duration-[150ms] hover:scale-[1.05] active:translate-y-[0.5px]"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
      >
        <SettingsIcon size={18} />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-[70] bg-black/20 transition-opacity duration-[180ms]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <aside
        aria-label="Design tweaks"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[80] w-[320px] bg-[var(--paper)] border-l border-[var(--hairline)] transition-transform duration-[220ms] flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ boxShadow: '-12px 0 32px rgba(0,0,0,0.08)' }}
      >
        <header className="flex items-center justify-between px-5 py-[18px] border-b border-[var(--hairline)]">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
              Design tweaks
            </div>
            <h2 className="font-serif text-[22px] m-0 leading-tight">Make it yours.</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] transition-colors"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-5 flex flex-col gap-[22px]">
          {/* —— Theme —— */}
          <Section label="Theme">
            <Radio<Theme>
              label="Mode"
              value={theme}
              onChange={(v) => set('theme', v)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
            <div>
              <FieldLabel>Accent</FieldLabel>
              <div className="flex gap-2">
                {ACCENT_SWATCHES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={accent === s.value}
                    aria-label={s.value}
                    onClick={() => set('accent', s.value)}
                    className={cn(
                      'w-[22px] h-[22px] rounded-[4px] cursor-pointer transition-transform duration-[120ms]',
                      accent === s.value ? 'border-2 border-[var(--ink)] scale-110' : 'border-2 border-transparent',
                    )}
                    style={{ background: s.color }}
                  />
                ))}
              </div>
            </div>
          </Section>

          {/* —— Market convention —— */}
          <Section label="Market convention">
            <Radio<RiseFall>
              label="Rise / fall"
              value={riseFall}
              onChange={(v) => set('riseFall', v)}
              options={[
                { value: 'cn', label: '红涨' },
                { value: 'intl', label: 'Green↑' },
              ]}
            />
            <Radio<Density>
              label="Density"
              value={density}
              onChange={(v) => set('density', v)}
              options={[
                { value: 'comfortable', label: 'Roomy' },
                { value: 'compact', label: 'Dense' },
              ]}
            />
          </Section>

          {/* —— App state —— */}
          <Section label="App state — design preview">
            <Select<AppState>
              label="State"
              value={appState}
              onChange={(v) => set('appState', v)}
              options={[
                { value: 'normal', label: 'Normal (live data)' },
                { value: 'empty', label: 'Empty — first run' },
                { value: 'loading', label: 'Loading — collecting' },
                { value: 'offline', label: 'Offline — degraded' },
              ]}
            />
            <p className="text-[12px] text-[var(--muted)] mt-1 leading-[1.5]">
              切换四种状态以预览 onboarding / 刷新 / 断网时的设计。Settings 与 Watchlist 不受影响。
            </p>
          </Section>
        </div>

        <footer className="px-5 py-3 border-t border-[var(--hairline)] font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em]">
          Persisted to localStorage · cs-monitor-tweaks
        </footer>
      </aside>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[14px]">
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent)] border-b border-dashed border-[var(--hairline)] pb-2">
        {label}
      </div>
      {children}
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] mb-2">
      {children}
    </div>
  )
}

function Radio<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="inline-flex border border-[var(--hairline-2)] rounded-[4px] overflow-hidden">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-3 py-[6px] font-mono text-[11px] tracking-[0.06em] border-l first:border-l-0 border-[var(--hairline-2)] transition-[background,color] duration-[120ms]',
              value === o.value ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-2)] text-[var(--muted)]',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[var(--surface)] border border-[var(--hairline-2)] rounded-[5px] px-3 py-2 text-[13px] font-sans focus:outline-none focus:border-[var(--accent)]"
        style={{ boxShadow: 'none' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
