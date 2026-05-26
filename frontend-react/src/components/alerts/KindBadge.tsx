interface Props {
  kind: 'surge' | 'drop' | 'qty'
}

/** 告警类型 pill · design.md(Alerts §4) */
export function KindBadge({ kind }: Props) {
  const map = {
    surge: { label: 'Surge', color: 'var(--up)', bg: 'var(--up-bg)' },
    drop: { label: 'Drop', color: 'var(--down)', bg: 'var(--down-bg)' },
    qty: { label: 'Quantity', color: 'var(--accent)', bg: 'var(--accent-soft)' },
  } as const
  const { label, color, bg } = map[kind]
  return (
    <span
      className="inline-flex font-mono text-[10px] tracking-[0.08em] uppercase rounded-[2px]"
      style={{ padding: '2px 7px', color, background: bg }}
    >
      {label}
    </span>
  )
}
