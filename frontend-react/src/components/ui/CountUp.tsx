import { useEffect, useState } from 'react'

interface Props {
  value: number
  duration?: number
  decimals?: number
  /** 自定义格式化(覆盖默认 toFixed) */
  format?: (n: number) => string
  className?: string
}

/**
 * 数字滚动到位动效 · design.md §5 Motion
 * cubic-out (1 - (1-t)^3),900-1100ms
 */
export function CountUp({ value, duration = 1000, decimals = 0, format, className }: Props) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const from = 0
    const to = value
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const text = format ? format(display) : display.toFixed(decimals)
  return <span className={className}>{text}</span>
}
