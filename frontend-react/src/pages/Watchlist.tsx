import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Columns3, MoreVertical, Plus } from 'lucide-react'
import { WATCHLIST, type WatchItem } from '@/data/mock'
import { formatCurrency, formatDelta } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { FilterChips, type Chip } from '@/components/ui/FilterChips'
import { ItemTile } from '@/components/ui/ItemTile'
import { RangeSparkline } from '@/components/ui/RangeSparkline'
import { Toggle } from '@/components/ui/Toggle'
import { WearTag } from '@/components/ui/WearTag'
import { BulkActionBar } from '@/components/watchlist/BulkActionBar'
import {
  ColumnsPopover,
  type ColumnMap,
} from '@/components/watchlist/ColumnsPopover'
import { SortableTH, type SortState } from '@/components/watchlist/SortableTH'
import { WatchCard } from '@/components/watchlist/WatchCard'

type View = 'table' | 'cards'
type FilterKey = 'all' | 'monitoring' | 'disabled' | 'rifle' | 'sniper' | 'pistol' | 'knife'
type SortKey = 'name' | 'price' | 'change24' | 'change7d' | 'threshold'

/**
 * Watchlist · design.md §2 + §4 + §6
 * 表格/卡片双视图、列排序、列可见性、批量操作、30 日 range sparkline、chip 筛选
 */
export default function Watchlist() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<View>('table')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'change24', dir: 'desc' })
  const [colsOpen, setColsOpen] = useState(false)
  const [cols, setCols] = useState<ColumnMap>({
    price: true,
    change24: true,
    change7d: true,
    spark: true,
    threshold: true,
    listings: false,
    monitor: true,
  })
  // 受控的 monitoring 状态(避免改原始数据)
  const [monitorOverrides, setMonitorOverrides] = useState<Record<number, boolean>>({})

  const items: WatchItem[] = useMemo(
    () =>
      WATCHLIST.map((w) => ({
        ...w,
        monitoring: monitorOverrides[w.id] ?? w.monitoring,
      })),
    [monitorOverrides],
  )

  const baseFiltered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'monitoring') return items.filter((w) => w.monitoring)
    if (filter === 'disabled') return items.filter((w) => !w.monitoring)
    return items.filter((w) => w.category.toLowerCase() === filter)
  }, [filter, items])

  const filtered = useMemo(() => {
    const arr = [...baseFiltered]
    const dir = sort.dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir
      return ((av as number) - (bv as number)) * dir
    })
    return arr
  }, [baseFiltered, sort])

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    )
  }

  function toggleSel(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allChecked = filtered.length > 0 && filtered.every((w) => selected.has(w.id))
  const someChecked = filtered.some((w) => selected.has(w.id)) && !allChecked

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) filtered.forEach((w) => next.delete(w.id))
      else filtered.forEach((w) => next.add(w.id))
      return next
    })
  }

  function toggleMonitor(id: number, next: boolean) {
    setMonitorOverrides((prev) => ({ ...prev, [id]: next }))
  }

  // chip 配置
  const chips = useMemo<Chip<FilterKey>[]>(
    () => [
      { value: 'all', label: `All · ${items.length}` },
      { value: 'monitoring', label: 'Monitoring' },
      { value: 'disabled', label: 'Disabled' },
      '|',
      { value: 'rifle', label: 'Rifle' },
      { value: 'sniper', label: 'Sniper' },
      { value: 'pistol', label: 'Pistol' },
      { value: 'knife', label: 'Knife' },
    ],
    [items.length],
  )

  const visibleColCount =
    1 + // checkbox
    1 + // item
    (cols.price ? 1 : 0) +
    (cols.change24 ? 1 : 0) +
    (cols.change7d ? 1 : 0) +
    (cols.spark ? 1 : 0) +
    (cols.threshold ? 1 : 0) +
    (cols.listings ? 1 : 0) +
    (cols.monitor ? 1 : 0) +
    1 // ⋮

  const selectedItems = items.filter((w) => selected.has(w.id))

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            02 · Watchlist
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Watchlist
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[56ch]">
            {items.length} items under monitor · {items.filter((w) => w.monitoring).length} active ·
            global threshold 5% · 30-min cadence
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="inline-flex border border-[var(--hairline-2)] rounded-[4px] overflow-hidden">
            {(['table', 'cards'] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'px-[10px] py-[7px] font-mono text-[10.5px] tracking-[0.1em] transition-[background,color] duration-[120ms] border-l first:border-l-0 border-[var(--hairline-2)] uppercase',
                  view === v
                    ? 'bg-[var(--ink)] text-[var(--bg)]'
                    : 'bg-[var(--surface-2)] text-[var(--muted)]',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <Button onClick={() => setColsOpen((o) => !o)}>
              <Columns3 size={13} />
              Columns
            </Button>
            {colsOpen && (
              <ColumnsPopover cols={cols} setCols={setCols} onClose={() => setColsOpen(false)} />
            )}
          </div>
          <Button>Import</Button>
          <Button variant="primary">
            <Plus size={13} />
            Add item
          </Button>
        </div>
      </div>

      {/* —— Filter chips —— */}
      <FilterChips chips={chips} value={filter} onChange={setFilter} />

      {/* —— Bulk —— */}
      {selected.size > 0 && (
        <BulkActionBar items={selectedItems} onClear={() => setSelected(new Set())} />
      )}

      {/* —— Table or Cards —— */}
      {view === 'table' ? (
        <div className="mt-0 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-left">
                <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] w-7">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)]">
                  <SortableTH label="Item" k="name" sort={sort} onClick={toggleSort} />
                </th>
                {cols.price && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] text-right">
                    <SortableTH label="Price" k="price" sort={sort} onClick={toggleSort} align="right" />
                  </th>
                )}
                {cols.change24 && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] text-right">
                    <SortableTH label="24h" k="change24" sort={sort} onClick={toggleSort} align="right" />
                  </th>
                )}
                {cols.change7d && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] text-right">
                    <SortableTH label="7d" k="change7d" sort={sort} onClick={toggleSort} align="right" />
                  </th>
                )}
                {cols.spark && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] w-[110px]">
                    7d trend
                  </th>
                )}
                {cols.threshold && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)]">
                    <SortableTH label="Threshold" k="threshold" sort={sort} onClick={toggleSort} />
                  </th>
                )}
                {cols.listings && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] text-right">
                    Listings
                  </th>
                )}
                {cols.monitor && (
                  <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)]">
                    Monitor
                  </th>
                )}
                <th className="font-mono font-medium text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] px-3 py-3 border-b border-[var(--hairline)] bg-[var(--bg)] w-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => {
                const isUp24 = w.change24 >= 0
                const isUp7 = w.change7d >= 0
                return (
                  <tr
                    key={w.id}
                    onClick={() => navigate(`/item/${w.id}`)}
                    className="cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface)]"
                  >
                    <td
                      className="px-3 border-b border-[var(--hairline)] align-middle"
                      style={{ height: 'var(--row-h)' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSel(w.id)
                      }}
                    >
                      <Checkbox checked={selected.has(w.id)} readOnly />
                    </td>
                    <td
                      className="px-3 border-b border-[var(--hairline)] align-middle"
                      style={{ height: 'var(--row-h)' }}
                    >
                      <div className="flex items-center gap-3">
                        <ItemTile />
                        <div className="min-w-0">
                          <div className="truncate">{w.name}</div>
                          <div className="flex gap-1.5 items-center mt-[2px]">
                            <WearTag wear={w.wear} />
                            <span className="font-mono text-[11px] text-[var(--muted)]">{w.category}</span>
                            {!w.monitoring && (
                              <span className="font-mono text-[11px] text-[var(--muted-2)]">· paused</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {cols.price && (
                      <td
                        className="px-3 border-b border-[var(--hairline)] align-middle text-right font-mono tnum"
                        style={{ height: 'var(--row-h)' }}
                      >
                        {formatCurrency(w.price)}
                      </td>
                    )}
                    {cols.change24 && (
                      <td
                        className={cn(
                          'px-3 border-b border-[var(--hairline)] align-middle text-right font-mono tnum',
                          isUp24 ? 'text-[var(--up)]' : 'text-[var(--down)]',
                        )}
                        style={{ height: 'var(--row-h)' }}
                      >
                        {formatDelta(w.change24)}
                      </td>
                    )}
                    {cols.change7d && (
                      <td
                        className={cn(
                          'px-3 border-b border-[var(--hairline)] align-middle text-right font-mono tnum',
                          isUp7 ? 'text-[var(--up)]' : 'text-[var(--down)]',
                        )}
                        style={{ height: 'var(--row-h)' }}
                      >
                        {formatDelta(w.change7d, 1)}
                      </td>
                    )}
                    {cols.spark && (
                      <td
                        className="px-3 border-b border-[var(--hairline)] align-middle"
                        style={{ height: 'var(--row-h)' }}
                      >
                        <RangeSparkline series={w.series.slice(-30)} />
                      </td>
                    )}
                    {cols.threshold && (
                      <td
                        className="px-3 border-b border-[var(--hairline)] align-middle font-mono text-[11px] text-[var(--muted)]"
                        style={{ height: 'var(--row-h)' }}
                      >
                        {w.threshold}%
                      </td>
                    )}
                    {cols.listings && (
                      <td
                        className="px-3 border-b border-[var(--hairline)] align-middle text-right font-mono tnum text-[var(--muted)]"
                        style={{ height: 'var(--row-h)' }}
                      >
                        {8 + (w.id * 7) % 40}
                      </td>
                    )}
                    {cols.monitor && (
                      <td
                        className="px-3 border-b border-[var(--hairline)] align-middle"
                        style={{ height: 'var(--row-h)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Toggle
                          checked={w.monitoring}
                          onChange={(v) => toggleMonitor(w.id, v)}
                          ariaLabel="Toggle monitoring"
                        />
                      </td>
                    )}
                    <td
                      className="px-3 border-b border-[var(--hairline)] align-middle"
                      style={{ height: 'var(--row-h)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-7 h-7 inline-flex items-center justify-center rounded-[3px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                        aria-label="Row actions"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={visibleColCount}
                  className="h-9 px-3 font-mono text-[11px] tracking-[0.1em] text-[var(--muted)]"
                >
                  {filtered.length} of {items.length} items · sorted by{' '}
                  <span className="text-[var(--ink)]">{sort.key}</span>{' '}
                  {sort.dir === 'asc' ? '↑' : '↓'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="grid gap-[18px] mt-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {filtered.map((w) => (
            <WatchCard key={w.id} item={w} />
          ))}
        </div>
      )}
    </div>
  )
}
