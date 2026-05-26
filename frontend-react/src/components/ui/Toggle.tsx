import { cn } from '@/utils/cn'

interface Props {
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * 开关 · design.md §4 Forms
 * 28×16 track + 12×12 thumb · 关闭 hairline-2 / 开启 accent
 * 滑动 150ms
 */
export function Toggle({ checked, onChange, disabled, className, ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange?.(!checked)
      }}
      className={cn(
        'inline-flex relative w-[28px] h-[16px] rounded-full transition-colors duration-[150ms] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--hairline-2)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-[left] duration-[150ms]"
        style={{ left: checked ? 14 : 2 }}
      />
    </button>
  )
}
