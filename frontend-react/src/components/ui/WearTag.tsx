import { cn } from '@/utils/cn'

interface Props {
  wear: string
  className?: string
}

/**
 * 磨损码 · design.md §7
 * FN / MW / FT / WW / BS
 */
export function WearTag({ wear, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono text-[9.5px] tracking-[0.1em] uppercase text-[var(--muted-2)] border border-[var(--hairline-2)] rounded-[2px] px-[5px] py-[2px] leading-[1.2]',
        className,
      )}
    >
      {wear}
    </span>
  )
}
