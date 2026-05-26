import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteWatchlistItem, updateWatchlistItem } from '@/api/endpoints'
import type { WatchItem } from '@/data/types'
import type { WatchlistItemWithPrice } from '@/api/types'
import { formatCurrency } from '@/utils/format'

interface Props {
  items: WatchItem[]
  /** 原始后端数据,用于拿 market_hash_name 提交 */
  backendItems: WatchlistItemWithPrice[]
  onClear: () => void
}

/**
 * 批量操作深色固定栏 · design.md(watchlist 批量)
 * 选中数 + 监控数 + 总价值 · 5 个动作 + 关闭
 * 真实接 PUT/DELETE,按选中项串行调用
 */
export function BulkActionBar({ items, backendItems, onClear }: Props) {
  const queryClient = useQueryClient()
  const monitoring = items.filter((i) => i.monitoring).length
  const totalValue = items.reduce((a, b) => a + b.price, 0)

  // 选中项对应的 market_hash_name 集
  const selectedNames = items
    .map((it) => backendItems.find((b) => b.id === it.id)?.market_hash_name)
    .filter((n): n is string => !!n)

  const enableMut = useMutation({
    mutationFn: () =>
      Promise.all(selectedNames.map((name) => updateWatchlistItem(name, { enabled: true }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const pauseMut = useMutation({
    mutationFn: () =>
      Promise.all(selectedNames.map((name) => updateWatchlistItem(name, { enabled: false }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => Promise.all(selectedNames.map((name) => deleteWatchlistItem(name))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      onClear()
    },
  })

  const busy = enableMut.isPending || pauseMut.isPending || deleteMut.isPending

  function confirmDelete() {
    if (selectedNames.length === 0) return
    const ok = window.confirm(
      `Remove ${selectedNames.length} item(s) from watchlist?\n该操作不可撤销(但历史告警保留)。`,
    )
    if (ok) deleteMut.mutate()
  }

  return (
    <div className="mt-2.5 flex items-center gap-[14px] px-4 py-2.5 bg-[var(--ink)] text-[var(--bg)] rounded-[4px] text-[13px]">
      <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--accent)]">
        {items.length} SELECTED
      </span>
      <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {monitoring} monitoring · {formatCurrency(totalValue)} total value
        {busy && ' · processing…'}
      </span>
      <div className="ml-auto flex gap-1 items-center">
        <BulkBtn onClick={() => enableMut.mutate()} disabled={busy}>
          ↑ Enable monitor
        </BulkBtn>
        <BulkBtn onClick={() => pauseMut.mutate()} disabled={busy}>
          ↓ Pause
        </BulkBtn>
        <span className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <BulkBtn tone="danger" onClick={confirmDelete} disabled={busy}>
          Delete
        </BulkBtn>
        <BulkBtn tone="muted" onClick={onClear} disabled={busy}>
          ✕ Clear
        </BulkBtn>
      </div>
    </div>
  )
}

function BulkBtn({
  children,
  onClick,
  tone,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: 'danger' | 'muted'
  disabled?: boolean
}) {
  const color = tone === 'danger' ? '#ff6b6b' : tone === 'muted' ? 'rgba(255,255,255,0.55)' : 'var(--bg)'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1.5 text-[12px] rounded-[3px] hover:bg-white/10 transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color }}
    >
      {children}
    </button>
  )
}
