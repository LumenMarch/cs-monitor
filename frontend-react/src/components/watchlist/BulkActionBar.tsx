import type { WatchItem } from '@/data/mock'
import { formatCurrency } from '@/utils/format'

interface Props {
  items: WatchItem[]
  onClear: () => void
}

/**
 * 批量操作深色固定栏 · design.md(watchlist 批量)
 * 选中数 + 监控数 + 总价值 · 5 个动作 + 关闭
 */
export function BulkActionBar({ items, onClear }: Props) {
  const monitoring = items.filter((i) => i.monitoring).length
  const totalValue = items.reduce((a, b) => a + b.price, 0)

  return (
    <div className="mt-2.5 flex items-center gap-[14px] px-4 py-2.5 bg-[var(--ink)] text-[var(--bg)] rounded-[4px] text-[13px]">
      <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--accent)]">
        {items.length} SELECTED
      </span>
      <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {monitoring} monitoring · {formatCurrency(totalValue)} total value
      </span>
      <div className="ml-auto flex gap-1 items-center">
        <BulkBtn>↑ Enable monitor</BulkBtn>
        <BulkBtn>↓ Pause</BulkBtn>
        <BulkBtn>Set threshold…</BulkBtn>
        <BulkBtn>Tag…</BulkBtn>
        <span className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <BulkBtn tone="danger">Delete</BulkBtn>
        <BulkBtn tone="muted" onClick={onClear}>✕ Clear</BulkBtn>
      </div>
    </div>
  )
}

function BulkBtn({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: 'danger' | 'muted'
}) {
  const color = tone === 'danger' ? '#ff6b6b' : tone === 'muted' ? 'rgba(255,255,255,0.55)' : 'var(--bg)'
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 text-[12px] rounded-[3px] hover:bg-white/10 transition-colors duration-[120ms]"
      style={{ color }}
    >
      {children}
    </button>
  )
}
