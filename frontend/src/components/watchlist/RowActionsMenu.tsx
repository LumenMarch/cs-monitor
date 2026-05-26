import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit3, ExternalLink, MoreVertical, Pause, Play, Trash2 } from 'lucide-react'
import { updateWatchlistItem } from '@/api/endpoints'
import { cn } from '@/utils/cn'
import { EditThresholdDialog } from './EditThresholdDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface Props {
  marketHashName: string
  itemName: string
  threshold: number
  monitoring: boolean
  /** 跳详情(路由 id) */
  onOpenDetail?: () => void
}

/**
 * 行尾 ⋮ 操作菜单 · Radix DropdownMenu
 * 操作:Open detail / Edit threshold / Pause/Resume / Delete
 */
export function RowActionsMenu({
  marketHashName,
  itemName,
  threshold,
  monitoring,
  onOpenDetail,
}: Props) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)

  const toggleMut = useMutation({
    mutationFn: () => updateWatchlistItem(marketHashName, { enabled: !monitoring }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 inline-flex items-center justify-center rounded-[3px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)] data-[state=open]:bg-[var(--surface)] data-[state=open]:text-[var(--ink)]"
            aria-label="Row actions"
          >
            <MoreVertical size={14} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'min-w-[180px] z-[90] bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[5px] py-1',
              'shadow-[0_8px_24px_rgba(0,0,0,0.10)]',
            )}
          >
            {onOpenDetail && (
              <MenuRow icon={<ExternalLink size={13} />} onSelect={onOpenDetail}>
                Open detail
              </MenuRow>
            )}
            <MenuRow icon={<Edit3 size={13} />} onSelect={() => setEditOpen(true)}>
              Edit threshold ({threshold}%)
            </MenuRow>
            <MenuRow
              icon={monitoring ? <Pause size={13} /> : <Play size={13} />}
              onSelect={() => toggleMut.mutate()}
            >
              {monitoring ? 'Pause monitoring' : 'Resume monitoring'}
            </MenuRow>
            <DropdownMenu.Separator className="h-px bg-[var(--hairline)] my-1" />
            <MenuRow
              icon={<Trash2 size={13} />}
              danger
              onSelect={() => setDelOpen(true)}
            >
              Delete…
            </MenuRow>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <EditThresholdDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        marketHashName={marketHashName}
        itemName={itemName}
        currentThreshold={threshold}
      />
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        marketHashName={marketHashName}
        itemName={itemName}
      />
    </>
  )
}

function MenuRow({
  children,
  icon,
  danger,
  onSelect,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  danger?: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        e.preventDefault()
        onSelect()
      }}
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer outline-none',
        'data-[highlighted]:bg-[var(--surface)]',
        danger
          ? 'text-[var(--down)] data-[highlighted]:text-[var(--down)]'
          : 'text-[var(--ink-2)] data-[highlighted]:text-[var(--ink)]',
      )}
    >
      <span className={danger ? 'text-[var(--down)]' : 'text-[var(--muted)]'}>{icon}</span>
      {children}
    </DropdownMenu.Item>
  )
}
