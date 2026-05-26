import { cn } from '@/utils/cn'

export type Chip<T extends string = string> = { value: T; label: string } | '|'

interface Props<T extends string> {
  chips: Chip<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}

/**
 * 通用 chip 筛选行 · design.md §4
 * "|" 作为分隔符,激活态 ink 底 + bg 字
 */
export function FilterChips<T extends string>({ chips, value, onChange, className }: Props<T>) {
  return (
    <div
      className={cn(
        'flex gap-1.5 items-center py-[10px] border-b border-[var(--hairline)] font-mono text-[11.5px] flex-wrap',
        className,
      )}
    >
      {chips.map((c, i) =>
        c === '|' ? (
          <div key={`d-${i}`} className="w-px h-[18px] bg-[var(--hairline)] mx-1.5" />
        ) : (
          <button
            key={c.value}
            aria-pressed={c.value === value}
            onClick={() => onChange(c.value)}
            className={cn(
              'px-[10px] py-[5px] rounded-full border border-transparent tracking-[0.04em] cursor-pointer transition-[background,color] duration-[120ms]',
              c.value === value
                ? 'bg-[var(--ink)] text-[var(--bg)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]',
            )}
          >
            {c.label}
          </button>
        ),
      )}
    </div>
  )
}
