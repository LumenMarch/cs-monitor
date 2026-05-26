import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
}

/**
 * 复选框 · 用 native input + accent-color 染色
 * 支持 indeterminate(全选中间态)
 */
export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { indeterminate, className, ...props },
  ref,
) {
  return (
    <input
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      type="checkbox"
      className={cn('w-[14px] h-[14px] cursor-pointer', className)}
      style={{ accentColor: 'var(--accent)' }}
      {...props}
    />
  )
})
