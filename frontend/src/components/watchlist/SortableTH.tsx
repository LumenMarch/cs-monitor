import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface SortState<K extends string = string> {
  key: K
  dir: 'asc' | 'desc'
}

interface Props<K extends string> {
  label: ReactNode
  k: K
  sort: SortState<K>
  onClick: (k: K) => void
  align?: 'left' | 'right'
}

/** 可排序表头 · 激活 ▲/▼,未激活 ⇅ */
export function SortableTH<K extends string>({ label, k, sort, onClick, align }: Props<K>) {
  const active = sort.key === k
  return (
    <th
      className={cn(
        'cursor-pointer select-none',
        align === 'right' && 'text-right',
      )}
      style={{ color: active ? 'var(--ink)' : undefined }}
      onClick={() => onClick(k)}
    >
      <span className={cn('inline-flex items-center gap-1.5', align === 'right' && 'justify-end w-full')}>
        {label}
        <span
          className="text-[9px]"
          style={{ color: active ? 'var(--accent)' : 'var(--muted-2)' }}
        >
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}
