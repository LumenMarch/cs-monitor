import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import {
  clearDatabase,
  downloadDatabase,
  fetchSystemInfo,
} from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/stores/auth'
import { cn } from '@/utils/cn'
import { SettingRow } from './SettingRow'

/**
 * Data tab · 接 /api/settings/system + /api/settings/db/*
 * - Database / Watchlist / Extreme trackers 计数走 system
 * - Export = GET /settings/db/export(走 axios 拿 blob 触发下载)
 * - Clear = POST /settings/db/clear?confirm=true · admin only · Radix 二次确认
 */
export function DataTab() {
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [clearOpen, setClearOpen] = useState(false)

  const query = useQuery({
    queryKey: ['system-info'],
    queryFn: fetchSystemInfo,
  })

  const exportMut = useMutation({
    mutationFn: downloadDatabase,
  })

  const clearMut = useMutation({
    mutationFn: clearDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-info'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['extreme-tracks'] })
      queryClient.invalidateQueries({ queryKey: ['extreme-snapshots'] })
      queryClient.invalidateQueries({ queryKey: ['extreme-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alerts-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setClearOpen(false)
    },
  })

  if (query.isLoading) {
    return <div className="font-mono text-[11px] text-[var(--muted)] py-6">Loading…</div>
  }

  if (query.isError || !query.data) {
    return (
      <div className="font-mono text-[11px] text-[var(--down)] py-6">
        Failed to load · {apiErrorMessage(query.error)}
      </div>
    )
  }

  const info = query.data

  return (
    <>
      <div>
        <SettingRow
          title="Database"
          description={
            <>
              SQLite WAL · <code className="font-mono text-[11px]">{info.db_path}</code>
            </>
          }
          control={<div className="font-mono text-[13px] tnum">{info.db_size_human}</div>}
        />
        <SettingRow
          title="Watchlist items"
          description="当前用户的监控清单条目数。"
          control={<div className="font-mono text-[13px] tnum">{info.watchlist_count}</div>}
        />
        <SettingRow
          title="Extreme trackers"
          description="当前用户的极致追踪配置数。"
          control={<div className="font-mono text-[13px] tnum">{info.extreme_track_count}</div>}
        />
        <SettingRow
          title="Export"
          description={
            isAdmin
              ? '导出完整 SQLite 文件(全用户数据)。管理员限定。'
              : '仅管理员可导出数据库。'
          }
          control={
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => exportMut.mutate()}
                disabled={!isAdmin || exportMut.isPending}
              >
                {exportMut.isPending ? 'Preparing…' : 'Download .db'}
              </Button>
              {exportMut.isError && (
                <span className="font-mono text-[10.5px] text-[var(--down)]">
                  {apiErrorMessage(exportMut.error)}
                </span>
              )}
            </div>
          }
        />
        <SettingRow
          title={<span className="text-[var(--down)]">Clear monitor data</span>}
          description={
            isAdmin
              ? '清空 price_records / alert_logs / extreme_track_snapshots / extreme_track_alerts / archived_prices。监控清单与追踪配置保留。不可恢复。'
              : '仅管理员可执行该操作。'
          }
          control={
            <Button
              disabled={!isAdmin}
              onClick={() => setClearOpen(true)}
              className="!border-[var(--down)] !text-[var(--down)] hover:!bg-[var(--down-bg)]"
            >
              Erase…
            </Button>
          }
        />
      </div>

      {/* Clear confirm */}
      <Dialog.Root open={clearOpen} onOpenChange={setClearOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-[90] bg-black/30 transition-opacity duration-[180ms]',
            )}
          />
          <Dialog.Content
            className={cn(
              'fixed left-1/2 top-[24vh] z-[100] -translate-x-1/2 w-[min(460px,calc(100vw-32px))]',
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
                    Clear <em className="italic text-[var(--accent)]">all</em> price &amp; alert history?
                  </Dialog.Title>
                  <Dialog.Description className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)] mt-1">
                    affects every user · irreversible
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
                以下表将被清空:<br />
                <code className="font-mono text-[11px] text-[var(--ink-2)]">
                  price_records · alert_logs · extreme_track_snapshots ·
                  extreme_track_alerts · archived_prices
                </code>
                <br />
                监控清单 / 追踪配置 / 用户保留。继续?
              </p>
              {clearMut.isError && (
                <div className="font-mono text-[11px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-2.5 py-1.5 mt-3">
                  {apiErrorMessage(clearMut.error)}
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
                onClick={() => clearMut.mutate()}
                disabled={clearMut.isPending}
                className="!border-[var(--down)] !text-[var(--down)] hover:!bg-[var(--down-bg)] hover:!text-[var(--down)]"
              >
                {clearMut.isPending ? 'Clearing…' : 'Erase'}
              </Button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
