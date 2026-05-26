import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

/**
 * 表单输入 · design.md §4 Forms
 * surface 底 + 1.5px hairline-2 边 + 5px radius + 12-14px padding
 * focus: border accent + 3px accent-soft 描边
 */
export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, mono = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'bg-[var(--surface)] text-[var(--ink)] text-[12.5px] rounded-[5px] px-3 py-2 outline-none transition-[border,box-shadow] duration-[120ms]',
        mono && 'font-mono',
        className,
      )}
      style={{
        border: '1.5px solid var(--hairline-2)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline-2)'
        e.currentTarget.style.boxShadow = 'none'
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
})
