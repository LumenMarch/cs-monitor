import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import {
  createExtremeTrack,
  fetchExtremeTracks,
  searchItems,
} from '@/api/endpoints'
import type { SearchItem } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/settings/Input'
import { SegmentedControl } from '@/components/settings/SegmentedControl'
import { ItemTile } from '@/components/ui/ItemTile'
import { WearTag } from '@/components/ui/WearTag'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PLATFORMS = ['BUFF', 'YYYP', 'C5GAME', 'IGXE', 'STEAM'] as const
type Platform = (typeof PLATFORMS)[number]

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
 * 新增极致追踪配置 · POST /extreme-track
 * 流程:Step 1 搜索饰品 → Step 2 配置平台/间隔/阈值
 */
export function AddTrackerDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [picked, setPicked] = useState<SearchItem | null>(null)
  const [q, setQ] = useState('')
  const debouncedQ = useDebounced(q, 300)

  // 表单字段
  const [platform, setPlatform] = useState<Platform>('BUFF')
  const [intervalSec, setIntervalSec] = useState('60')
  const [trackPrice, setTrackPrice] = useState(true)
  const [priceThreshold, setPriceThreshold] = useState('5')
  const [trackQty, setTrackQty] = useState(true)
  const [qtyThreshold, setQtyThreshold] = useState('20')
  const [cooldown, setCooldown] = useState('300')

  // 重置
  useEffect(() => {
    if (open) {
      setStep('pick')
      setPicked(null)
      setQ('')
      setPlatform('BUFF')
      setIntervalSec('60')
      setTrackPrice(true)
      setPriceThreshold('5')
      setTrackQty(true)
      setQtyThreshold('20')
      setCooldown('300')
    }
  }, [open])

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => searchItems(debouncedQ, 30),
    enabled: open && step === 'pick' && debouncedQ.length >= 1,
    staleTime: 10_000,
  })

  // 当前已配置的 tracker · name@platform 唯一
  const tracksQuery = useQuery({
    queryKey: ['extreme-tracks'],
    queryFn: fetchExtremeTracks,
    enabled: open,
  })
  const existingKeys = useMemo(
    () => new Set((tracksQuery.data ?? []).map((t) => `${t.market_hash_name}@${t.platform}`)),
    [tracksQuery.data],
  )

  const conflict = picked && existingKeys.has(`${picked.market_hash_name}@${platform}`)

  const createMut = useMutation({
    mutationFn: () => {
      if (!picked) throw new Error('no item picked')
      const interval = parseInt(intervalSec, 10)
      const priceThr = parseFloat(priceThreshold)
      const qtyThr = parseFloat(qtyThreshold)
      const cd = parseInt(cooldown, 10)
      return createExtremeTrack({
        market_hash_name: picked.market_hash_name,
        platform,
        interval_seconds: Number.isFinite(interval) && interval >= 5 ? interval : 60,
        enabled: true,
        price_track_enabled: trackPrice,
        price_change_mode: 'percent',
        price_threshold_percent:
          Number.isFinite(priceThr) && priceThr >= 0 ? priceThr : 0,
        quantity_track_enabled: trackQty,
        quantity_change_mode: 'percent',
        quantity_threshold_percent:
          Number.isFinite(qtyThr) && qtyThr >= 0 ? qtyThr : 0,
        alert_cooldown_seconds: Number.isFinite(cd) && cd >= 0 ? cd : 0,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extreme-tracks'] })
      queryClient.invalidateQueries({ queryKey: ['extreme-snapshots'] })
      onOpenChange(false)
    },
  })

  const intervalValid = (() => {
    const n = parseInt(intervalSec, 10)
    return Number.isFinite(n) && n >= 5 && n <= 3600
  })()
  const canSubmit =
    !!picked && !conflict && intervalValid && (trackPrice || trackQty) && !createMut.isPending

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[90] bg-black/30 transition-opacity duration-[180ms]',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-[10vh] z-[100] -translate-x-1/2 w-[min(640px,calc(100vw-32px))]',
            'bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[6px] overflow-hidden flex flex-col',
            'shadow-[0_24px_64px_rgba(0,0,0,0.18)]',
          )}
        >
          {/* —— Header —— */}
          <div className="px-5 py-4 border-b border-[var(--hairline)]">
            <div className="flex justify-between items-start">
              <div>
                <Dialog.Title className="font-serif text-[24px] m-0 leading-tight">
                  New <em className="italic text-[var(--accent)]">tracker</em>
                </Dialog.Title>
                <Dialog.Description className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)] mt-1">
                  Step {step === 'pick' ? '1 / 2 · pick item' : '2 / 2 · configure'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* —— Step body —— */}
          {step === 'pick' ? (
            <PickStep
              q={q}
              setQ={setQ}
              debouncedQ={debouncedQ}
              searchQuery={searchQuery}
              existingKeys={existingKeys}
              currentPlatform={platform}
              onPick={(it) => {
                setPicked(it)
                setStep('configure')
              }}
            />
          ) : (
            <ConfigureStep
              picked={picked!}
              platform={platform}
              setPlatform={setPlatform}
              intervalSec={intervalSec}
              setIntervalSec={setIntervalSec}
              trackPrice={trackPrice}
              setTrackPrice={setTrackPrice}
              priceThreshold={priceThreshold}
              setPriceThreshold={setPriceThreshold}
              trackQty={trackQty}
              setTrackQty={setTrackQty}
              qtyThreshold={qtyThreshold}
              setQtyThreshold={setQtyThreshold}
              cooldown={cooldown}
              setCooldown={setCooldown}
              conflict={!!conflict}
              error={createMut.isError ? apiErrorMessage(createMut.error) : null}
            />
          )}

          {/* —— Footer —— */}
          <footer className="flex justify-between items-center px-5 py-3 border-t border-[var(--hairline)] bg-[var(--surface)]">
            {step === 'pick' ? (
              <>
                <span className="font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em]">
                  {(searchQuery.data?.length ?? 0)} results
                </span>
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Dialog.Close>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="font-mono text-[11px] text-[var(--muted)] hover:text-[var(--ink)] tracking-[0.1em] uppercase"
                >
                  ← Back to search
                </button>
                <div className="flex gap-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canSubmit}
                    onClick={() => createMut.mutate()}
                  >
                    {createMut.isPending ? 'Adding…' : 'Add tracker'}
                  </Button>
                </div>
              </>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PickStep({
  q,
  setQ,
  debouncedQ,
  searchQuery,
  existingKeys,
  currentPlatform,
  onPick,
}: {
  q: string
  setQ: (v: string) => void
  debouncedQ: string
  searchQuery: ReturnType<typeof useQuery<SearchItem[], unknown>>
  existingKeys: Set<string>
  currentPlatform: Platform
  onPick: (it: SearchItem) => void
}) {
  return (
    <>
      <div className="px-5 py-4 border-b border-[var(--hairline)]">
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
              type="button"
              onClick={() => setQ('')}
              className="text-[var(--muted)] hover:text-[var(--ink)]"
              aria-label="Clear"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[55vh] overflow-y-auto">
        {debouncedQ.length < 1 && (
          <EmptyHint label="Type a keyword to search · 至少 1 个字符" />
        )}
        {searchQuery.isError && (
          <div className="px-5 py-4 font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)]">
            {apiErrorMessage(searchQuery.error)}
          </div>
        )}
        {debouncedQ.length >= 1 && searchQuery.isLoading && <EmptyHint label="Searching…" />}
        {debouncedQ.length >= 1 &&
          !searchQuery.isLoading &&
          (searchQuery.data?.length ?? 0) === 0 && (
            <EmptyHint label={`No results for "${debouncedQ}"`} />
          )}
        {(searchQuery.data ?? []).map((it) => {
          const alreadyForPlatform = existingKeys.has(
            `${it.market_hash_name}@${currentPlatform}`,
          )
          return (
            <ResultRow
              key={it.market_hash_name}
              item={it}
              warn={alreadyForPlatform ? `已在 ${currentPlatform}` : null}
              onPick={() => onPick(it)}
            />
          )
        })}
      </div>
    </>
  )
}

function ConfigureStep(props: {
  picked: SearchItem
  platform: Platform
  setPlatform: (v: Platform) => void
  intervalSec: string
  setIntervalSec: (v: string) => void
  trackPrice: boolean
  setTrackPrice: (v: boolean) => void
  priceThreshold: string
  setPriceThreshold: (v: string) => void
  trackQty: boolean
  setTrackQty: (v: boolean) => void
  qtyThreshold: string
  setQtyThreshold: (v: string) => void
  cooldown: string
  setCooldown: (v: string) => void
  conflict: boolean
  error: string | null
}) {
  const {
    picked,
    platform,
    setPlatform,
    intervalSec,
    setIntervalSec,
    trackPrice,
    setTrackPrice,
    priceThreshold,
    setPriceThreshold,
    trackQty,
    setTrackQty,
    qtyThreshold,
    setQtyThreshold,
    cooldown,
    setCooldown,
    conflict,
    error,
  } = props

  const match = picked.market_hash_name.match(WEAR_RE)
  const wear = match ? WEAR_SHORT[match[1]!] : null
  const clean = picked.name ?? picked.market_hash_name.replace(WEAR_RE, '')

  return (
    <div className="px-5 py-4 max-h-[55vh] overflow-y-auto flex flex-col gap-4">
      {/* picked item card */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[var(--surface)] border border-[var(--hairline)] rounded-[4px]">
        <ItemTile size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] truncate flex items-center gap-1.5">
            {clean}
            {wear && <WearTag wear={wear} />}
          </div>
          <div className="font-mono text-[10.5px] text-[var(--muted)] truncate">
            {picked.market_hash_name}
          </div>
        </div>
      </div>

      {/* Platform */}
      <Field label="Platform">
        <SegmentedControl<Platform>
          value={platform}
          options={PLATFORMS.map((p) => ({ value: p, label: p }))}
          onChange={(v) => setPlatform(v)}
        />
      </Field>

      {conflict && (
        <div className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/30 rounded-[3px] px-2.5 py-1.5">
          已存在 {picked.market_hash_name}@{platform} 的追踪配置,换平台或回去取消。
        </div>
      )}

      {/* Interval */}
      <Field label="Poll interval (5 – 3600 s)" hint="后台调度按此间隔轮询 SteamDT。建议 ≥ 30 s 以免被 429。">
        <div className="flex items-center gap-2">
          <Input
            mono
            type="number"
            min={5}
            max={3600}
            step={5}
            value={intervalSec}
            onChange={(e) => setIntervalSec(e.target.value)}
            style={{ width: 120 }}
          />
          <span className="font-mono text-[12px] text-[var(--muted)]">seconds</span>
        </div>
      </Field>

      {/* Price track */}
      <Field
        label={
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trackPrice}
              onChange={(e) => setTrackPrice(e.target.checked)}
              className="accent-[var(--accent)] cursor-pointer"
            />
            Track price changes
          </label>
        }
        hint="价格相对上次快照变化 ≥ 阈值时触发告警(percent 模式)。"
      >
        <div className="flex items-center gap-2">
          <Input
            mono
            type="number"
            min={0}
            step={0.1}
            disabled={!trackPrice}
            value={priceThreshold}
            onChange={(e) => setPriceThreshold(e.target.value)}
            style={{ width: 120, opacity: trackPrice ? 1 : 0.5 }}
          />
          <span className="font-mono text-[12px] text-[var(--muted)]">%</span>
        </div>
      </Field>

      {/* Quantity track */}
      <Field
        label={
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trackQty}
              onChange={(e) => setTrackQty(e.target.checked)}
              className="accent-[var(--accent)] cursor-pointer"
            />
            Track listings(quantity)
          </label>
        }
        hint="挂单数相对上次快照变化 ≥ 阈值时触发告警。"
      >
        <div className="flex items-center gap-2">
          <Input
            mono
            type="number"
            min={0}
            step={0.5}
            disabled={!trackQty}
            value={qtyThreshold}
            onChange={(e) => setQtyThreshold(e.target.value)}
            style={{ width: 120, opacity: trackQty ? 1 : 0.5 }}
          />
          <span className="font-mono text-[12px] text-[var(--muted)]">%</span>
        </div>
      </Field>

      {/* Cooldown */}
      <Field
        label="Alert cooldown"
        hint="同物品 + 同方向触发后的静默期。0 表示不冷却。"
      >
        <div className="flex items-center gap-2">
          <Input
            mono
            type="number"
            min={0}
            step={30}
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            style={{ width: 120 }}
          />
          <span className="font-mono text-[12px] text-[var(--muted)]">seconds</span>
        </div>
      </Field>

      {!trackPrice && !trackQty && (
        <div className="font-mono text-[11px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-2.5 py-1.5">
          至少需要启用一种追踪(price 或 quantity)。
        </div>
      )}

      {error && (
        <div className="font-mono text-[11px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-2.5 py-1.5">
          {error}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 240px) 1fr' }}>
      <div className="min-w-0">
        <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
          {label}
        </div>
        {hint && (
          <p className="text-[11.5px] text-[var(--muted-2)] m-0 mt-1 leading-[1.45] max-w-[28ch]">
            {hint}
          </p>
        )}
      </div>
      <div className="min-w-0 flex items-center">{children}</div>
    </div>
  )
}

function ResultRow({
  item,
  warn,
  onPick,
}: {
  item: SearchItem
  warn: string | null
  onPick: () => void
}) {
  const match = item.market_hash_name.match(WEAR_RE)
  const wear = match ? WEAR_SHORT[match[1]!] : null
  const clean = item.name ?? item.market_hash_name.replace(WEAR_RE, '')
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'w-full grid items-center gap-3 px-5 py-2.5 border-b border-dashed border-[var(--hairline)] last:border-0 text-left cursor-pointer',
        'hover:bg-[var(--surface)]',
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
      {warn ? (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.1em] text-[var(--accent)]">
          <Check size={12} /> {warn}
        </span>
      ) : (
        <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-[var(--muted)]">
          Configure →
        </span>
      )}
    </button>
  )
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="px-5 py-10 text-center font-mono text-[11px] tracking-[0.1em] text-[var(--muted-2)]">
      {label}
    </div>
  )
}
