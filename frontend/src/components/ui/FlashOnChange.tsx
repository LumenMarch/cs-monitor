import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  /** 触发闪烁的数值;首次 mount 不闪烁 */
  value: number
  children: ReactNode
  className?: string
  /** 闪烁持续 ms,与 @keyframes flash-up/down 对齐 */
  durationMs?: number
}

/**
 * 数值变化瞬间闪烁底色 · design.md §5 Motion
 * value 上升 → flash-up(红底,中国惯例红涨),下降 → flash-down(绿底)
 * 与 CSS 的 @keyframes flash-up/flash-down 配对,700ms ease-out 消退
 * 尊重 prefers-reduced-motion(global.css 已统一压到 0.001ms)
 */
export function FlashOnChange({ value, children, className, durationMs = 700 }: Props) {
  const prev = useRef(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (prev.current === value) return
    const dir = value > prev.current ? 'up' : 'down'
    setFlash(dir)
    const id = window.setTimeout(() => setFlash(null), durationMs)
    prev.current = value
    return () => window.clearTimeout(id)
  }, [value, durationMs])

  return (
    <span
      className={cn('inline-block rounded-[2px] px-[2px]', className)}
      style={flash ? { animation: `flash-${flash} ${durationMs}ms ease-out` } : undefined}
    >
      {children}
    </span>
  )
}
