import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { deleteWatchlistItem } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketHashName: string
  itemName: string
}

/** 删除监控项二次确认 · 不可恢复 */
export function DeleteConfirmDialog({ open, onOpenChange, marketHashName, itemName }: Props) {
  const queryClient = useQueryClient()
  const mut = useMutation({
    mutationFn: () => deleteWatchlistItem(marketHashName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      onOpenChange(false)
    },
  })

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
            'fixed left-1/2 top-[24vh] z-[100] -translate-x-1/2 w-[min(420px,calc(100vw-32px))]',
            'bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[6px]',
            'shadow-[0_24px_64px_rgba(0,0,0,0.18)]',
          )}
        >
          <header className="flex justify-between items-start px-5 py-4 border-b border-[var(--hairline)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex w-8 h-8 rounded-full bg-[var(--down-bg)] text-[var(--down)] items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} />
              </span>
              <div>
                <Dialog.Title className="font-serif text-[22px] m-0 leading-tight">
                  Remove from <em className="italic text-[var(--accent)]">watchlist</em>?
                </Dialog.Title>
                <Dialog.Description className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] mt-1 truncate max-w-[28ch]">
                  {itemName}
                </Dialog.Description>
              </div>
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

          <div className="px-5 py-4">
            <p className="text-[13px] text-[var(--muted)] leading-[1.5] m-0">
              该饰品会从你的监控清单移除,已记录的告警和价格历史<strong className="text-[var(--ink)] font-medium">保留</strong>。
              再次添加可以恢复监控。
            </p>
            {mut.isError && (
              <div className="font-mono text-[11px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-2.5 py-1.5 mt-3">
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
            <Button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="!border-[var(--down)] !text-[var(--down)] hover:!bg-[var(--down-bg)] hover:!text-[var(--down)]"
            >
              {mut.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
