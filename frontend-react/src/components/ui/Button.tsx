import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'default' | 'primary' | 'ghost'
type Size = 'md' | 'icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

/**
 * Button · design.md §4
 * - default: surface-2 / hairline-2
 * - primary: ink bg, hover→accent
 * - ghost: transparent / muted
 * - 主动按下 translateY(0.5px)
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'default', size = 'md', className, ...props },
  ref,
) {
  const base =
    'inline-flex items-center gap-[7px] rounded-[4px] text-[13px] font-medium whitespace-nowrap transition-[background,border,transform] duration-[120ms] active:translate-y-[0.5px]'
  const pad = size === 'icon' ? 'px-[9px] py-[8px]' : 'px-[14px] py-[8px]'
  const variants = {
    default:
      'bg-[var(--surface-2)] border border-[var(--hairline-2)] text-[var(--ink)] hover:bg-[var(--surface)] hover:border-[var(--ink-2)]',
    primary:
      'bg-[var(--ink)] border border-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white',
    ghost:
      'bg-transparent border border-transparent text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
  }[variant]
  return <button ref={ref} className={cn(base, pad, variants, className)} {...props} />
})
