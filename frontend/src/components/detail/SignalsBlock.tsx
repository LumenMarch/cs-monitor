interface Signal {
  name: string
  value: string
  detail: string
  positive: boolean
}

const SIGNALS: Signal[] = [
  { name: 'Trend', value: 'Bullish', detail: 'MA5 > MA20', positive: true },
  { name: 'Momentum', value: 'Strong', detail: 'RSI 68.4 / nearing overbought', positive: true },
  { name: 'Volume', value: 'Above avg', detail: '+24% vs 60d mean', positive: true },
  { name: 'Volatility', value: 'Elevated', detail: 'σ 3.42% / 2.1% baseline', positive: false },
]

/** 派生信号面板 · design.md(详情页 §4) */
export function SignalsBlock() {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] mb-2">
        Signals · auto-derived
      </div>
      {SIGNALS.map((s) => (
        <div
          key={s.name}
          className="grid items-baseline gap-2.5 py-[5px] text-[12.5px]"
          style={{ gridTemplateColumns: '70px 1fr auto' }}
        >
          <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-[var(--muted)]">
            {s.name}
          </span>
          <span className="text-[11.5px] text-[var(--muted)]">{s.detail}</span>
          <span
            className="font-mono text-[12px] tracking-[0.04em]"
            style={{ color: s.positive ? 'var(--up)' : 'var(--accent)' }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}
