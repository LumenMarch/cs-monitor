import { cn } from '@/utils/cn'

interface Props {
  status?: 'live' | 'idle' | 'warn' | 'down'
  pulse?: boolean
  className?: string
}

/**
 * 状态点 · design.md §4 Status indicators
 * - 6px 圆 + 3px glow ring
 * - pulse=true 时 1.4s ease 循环
 */
export function StatusDot({ status = 'live', pulse = false, className }: Props) {
  const bg =
    status === 'live'
      ? 'bg-[var(--up)]'
      : status === 'warn'
        ? 'bg-[var(--accent)]'
        : status === 'down'
          ? 'bg-[var(--down)]'
          : 'bg-[var(--muted)]'

  return (
    <span
      className={cn('inline-block w-[6px] h-[6px] rounded-full', bg, className)}
      style={{
        boxShadow: status === 'live' ? '0 0 0 3px var(--up-bg)' : status === 'warn' ? '0 0 0 3px var(--accent-soft)' : 'none',
        animation: pulse ? 'pulse-ring 1.4s ease-in-out infinite' : undefined,
      }}
    />
  )
}
