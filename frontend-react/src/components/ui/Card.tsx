import { type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface Props extends HTMLAttributes<HTMLDivElement> {
  tight?: boolean
}

/** 卡片 · design.md §4 */
export function Card({ tight = false, className, ...props }: Props) {
  return (
    <div
      className={cn(
        'bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px]',
        tight ? 'px-4 py-[14px]' : 'px-5 py-[18px]',
        className,
      )}
      {...props}
    />
  )
}
