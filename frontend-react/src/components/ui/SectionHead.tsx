import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  num?: string
  title: ReactNode
  meta?: ReactNode
  className?: string
}

/**
 * 章节头 · design.md §3 + §4
 * - 衬线 22px 标题 + mono 编号(可选) + 右侧 meta
 */
export function SectionHead({ num, title, meta, className }: Props) {
  return (
    <div className={cn('flex items-baseline justify-between gap-[18px] mb-[14px]', className)}>
      <h2 className="font-serif text-[22px] font-normal m-0 flex items-baseline gap-[10px] tracking-[-0.005em]">
        {num && (
          <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)]">{num}</span>
        )}
        {title}
      </h2>
      {meta && (
        <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-[var(--muted)]">
          {meta}
        </span>
      )}
    </div>
  )
}
