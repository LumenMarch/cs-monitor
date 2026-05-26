import { cn } from '@/utils/cn'

interface Props<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}

/**
 * 分段控件 · design.md(view-toggle 同款)
 * 通用 N 段切换,激活 ink/bg 黑底
 */
export function SegmentedControl<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div className={cn('inline-flex border border-[var(--hairline-2)] rounded-[4px] overflow-hidden', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-[7px] font-mono text-[10.5px] tracking-[0.1em] border-l first:border-l-0 border-[var(--hairline-2)] transition-[background,color] duration-[120ms]',
            value === o.value ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-2)] text-[var(--muted)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
