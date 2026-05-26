import { useEffect, useRef } from 'react'
import { Checkbox } from '@/components/ui/Checkbox'

export type ColumnKey = 'price' | 'change24' | 'change7d' | 'spark' | 'threshold' | 'listings' | 'monitor'
export type ColumnMap = Record<ColumnKey, boolean>

const LABELS: Record<ColumnKey, string> = {
  price: 'Price',
  change24: '24h change',
  change7d: '7d change',
  spark: '7d trend',
  threshold: 'Threshold',
  listings: 'Listings',
  monitor: 'Monitor toggle',
}

interface Props {
  cols: ColumnMap
  setCols: (next: ColumnMap) => void
  onClose: () => void
}

/**
 * 列可见性弹层 · 触发按钮右下方
 * 点外侧或 Escape 关闭
 */
export function ColumnsPopover({ cols, setCols, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const id = setTimeout(() => document.addEventListener('click', onClick), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(id)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+4px)] min-w-[180px] bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] p-1.5 z-[100]"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] px-[10px] py-1.5">
        Visible columns
      </div>
      {(Object.keys(LABELS) as ColumnKey[]).map((k) => (
        <label
          key={k}
          className="flex items-center gap-[10px] px-[10px] py-1.5 text-[13px] cursor-pointer hover:bg-[var(--surface)] rounded-[3px]"
        >
          <Checkbox checked={cols[k]} onChange={() => setCols({ ...cols, [k]: !cols[k] })} />
          {LABELS[k]}
        </label>
      ))}
    </div>
  )
}
