import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Search, X } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { createWatchlistItem, fetchWatchlist, searchItems } from '@/api/endpoints'
import type { SearchItem } from '@/api/types'
import { ItemTile } from '@/components/ui/ItemTile'
import { WearTag } from '@/components/ui/WearTag'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WEAR_RE = /\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/
const WEAR_SHORT: Record<string, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/**
 * AddItemDialog · 全屏弹层 · 搜索 + 加入监控
 * 走 GET /prices/search,debounce 300ms,POST /watchlist 添加
 */
export function AddItemDialog({ open, onOpenChange }: Props) {
  const [q, setQ] = useState('')
  const debouncedQ = useDebounced(q, 300)
  const queryClient = useQueryClient()

  // 重置查询关键词:每次重新打开清空
  useEffect(() => {
    if (open) setQ('')
  }, [open])

  // 已在 watchlist 中的项,展示 ✓
  const watchlistQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    enabled: open,
    staleTime: 60_000,
  })
  const inWatchlist = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((w) => w.market_hash_name)),
    [watchlistQuery.data],
  )

  // 搜索
  const searchQuery = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => searchItems(debouncedQ, 30),
    enabled: open && debouncedQ.length >= 1,
    staleTime: 10_000,
  })

  const addMut = useMutation({
    mutationFn: (item: SearchItem) =>
      createWatchlistItem({
        market_hash_name: item.market_hash_name,
        display_name: item.name,
        threshold_percent: 5,
        enabled: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[90] bg-black/30 transition-opacity duration-[180ms]',
            'data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-[12vh] z-[100] -translate-x-1/2 w-[min(640px,calc(100vw-32px))]',
            'bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[6px] overflow-hidden flex flex-col',
            'shadow-[0_24px_64px_rgba(0,0,0,0.18)]',
          )}
        >
          {/* —— Header + Search —— */}
          <div className="px-5 py-4 border-b border-[var(--hairline)]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Dialog.Title className="font-serif text-[24px] m-0 leading-tight">
                  Add item to <em className="italic text-[var(--accent)]">watchlist</em>
                </Dialog.Title>
                <Dialog.Description className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)] mt-1">
                  Local FTS5 search · 39,000+ items indexed
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  className="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--hairline-2)] rounded-[5px] px-3 py-2 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
              <Search size={14} className="text-[var(--muted)]" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                placeholder="AK-47, AWP, Karambit…"
                className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] font-mono"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                  aria-label="Clear"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* —— Result list —— */}
          <div className="max-h-[60vh] overflow-y-auto">
            {debouncedQ.length < 1 && (
              <EmptyHint label="Type a keyword to search · 至少输入 1 个字符" />
            )}
            {searchQuery.isError && (
              <div className="px-5 py-4 font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)]">
                {apiErrorMessage(searchQuery.error)}
              </div>
            )}
            {debouncedQ.length >= 1 && searchQuery.isLoading && (
              <EmptyHint label="Searching…" />
            )}
            {debouncedQ.length >= 1 &&
              !searchQuery.isLoading &&
              (searchQuery.data?.length ?? 0) === 0 && (
                <EmptyHint label={`No results for "${debouncedQ}"`} />
              )}
            {(searchQuery.data ?? []).map((it) => (
              <ResultRow
                key={it.market_hash_name}
                item={it}
                added={inWatchlist.has(it.market_hash_name)}
                onAdd={() => addMut.mutate(it)}
                adding={addMut.isPending && addMut.variables?.market_hash_name === it.market_hash_name}
              />
            ))}
          </div>

          {/* —— Foot —— */}
          <div className="flex justify-between items-center px-5 py-2.5 border-t border-[var(--hairline)] bg-[var(--surface)] font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em]">
            <span>{(searchQuery.data?.length ?? 0)} results</span>
            <span>Esc to close · ↑↓ to navigate(后续)</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ResultRow({
  item,
  added,
  onAdd,
  adding,
}: {
  item: SearchItem
  added: boolean
  onAdd: () => void
  adding: boolean
}) {
  const match = item.market_hash_name.match(WEAR_RE)
  const wear = match ? WEAR_SHORT[match[1]!] : null
  const clean = item.name ?? item.market_hash_name.replace(WEAR_RE, '')
  return (
    <div
      className={cn(
        'grid items-center gap-3 px-5 py-2.5 border-b border-dashed border-[var(--hairline)] last:border-0',
        added && 'bg-[var(--surface)]',
      )}
      style={{ gridTemplateColumns: '38px minmax(0,1fr) auto' }}
    >
      <ItemTile />
      <div className="min-w-0">
        <div className="text-[13px] truncate flex items-center gap-1.5">
          {clean}
          {wear && <WearTag wear={wear} />}
        </div>
        <div className="font-mono text-[10.5px] text-[var(--muted)] truncate">
          {item.market_hash_name}
        </div>
      </div>
      {added ? (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.1em] text-[var(--up)]">
          <Check size={12} /> ADDED
        </span>
      ) : (
        <button
          type="button"
          disabled={adding}
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border border-[var(--hairline-2)] text-[12px] font-mono text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          {adding ? '…' : 'Add'}
        </button>
      )}
    </div>
  )
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="px-5 py-10 text-center font-mono text-[11px] tracking-[0.1em] text-[var(--muted-2)]">
      {label}
    </div>
  )
}
