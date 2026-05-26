import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { updateWatchlistItem } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/settings/Input'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketHashName: string
  itemName: string
  currentThreshold: number
}

/**
 * Edit threshold dialog · 调阈值
 * 0.1% ~ 100% range,默认 5
 */
export function EditThresholdDialog({
  open,
  onOpenChange,
  marketHashName,
  itemName,
  currentThreshold,
}: Props) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(String(currentThreshold))

  useEffect(() => {
    if (open) setValue(String(currentThreshold))
  }, [open, currentThreshold])

  const mut = useMutation({
    mutationFn: (threshold: number) =>
      updateWatchlistItem(marketHashName, { threshold_percent: threshold }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      onOpenChange(false)
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseFloat(value)
    if (!Number.isFinite(n) || n < 0.1 || n > 100) return
    mut.mutate(n)
  }

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
            'fixed left-1/2 top-[20vh] z-[100] -translate-x-1/2 w-[min(440px,calc(100vw-32px))]',
            'bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[6px]',
            'shadow-[0_24px_64px_rgba(0,0,0,0.18)]',
          )}
        >
          <form onSubmit={onSubmit}>
            <header className="flex justify-between items-start px-5 py-4 border-b border-[var(--hairline)]">
              <div>
                <Dialog.Title className="font-serif text-[22px] m-0 leading-tight">
                  Edit alert <em className="italic text-[var(--accent)]">threshold</em>
                </Dialog.Title>
                <Dialog.Description className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] mt-1 truncate max-w-[36ch]">
                  {itemName}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-[4px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </Dialog.Close>
            </header>

            <div className="px-5 py-5 flex flex-col gap-3">
              <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Threshold percent (0.1 – 100)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  mono
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                  style={{ width: 140 }}
                />
                <span className="font-mono text-[14px] text-[var(--muted)]">%</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] leading-[1.5] m-0">
                价格相对 7 日均价波动超过该百分比时触发告警(对应方向取决于
                <code className="font-mono text-[11px]">.env</code> 的 surge/drop 配置)。
              </p>

              {mut.isError && (
                <div className="font-mono text-[11px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-2.5 py-1.5">
                  {apiErrorMessage(mut.error)}
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--hairline)] bg-[var(--surface)]">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={mut.isPending}>
                {mut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
