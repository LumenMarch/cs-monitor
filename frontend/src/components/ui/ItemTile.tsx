import { cn } from '@/utils/cn'

type Size = 'sm' | 'lg' | 'xl'

interface Props {
  label?: string
  size?: Size
  className?: string
}

/**
 * 占位 tile · design.md §7 Imagery
 * - 对角条纹 -42deg,4/5px 间距
 * - sm: 表格里 38×28,无 label
 * - lg: 卡片里 110×78
 * - xl: 详情页全宽 height: 220
 */
export function ItemTile({ label, size = 'sm', className }: Props) {
  const dims = size === 'sm' ? 'w-[38px] h-[28px]' : size === 'lg' ? 'w-[110px] h-[78px]' : 'w-full h-[220px]'
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-[var(--hairline-2)] bg-[var(--surface)] flex-shrink-0',
        size === 'xl' ? 'rounded-[4px]' : 'rounded-[2px]',
        dims,
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-42deg, transparent 0, transparent 4px, var(--hairline) 4px, var(--hairline) 5px)',
        }}
      />
      {label && size !== 'sm' && (
        <span className="absolute bottom-0 inset-x-0 bg-[var(--ink)] text-[var(--bg)] text-center font-mono text-[9px] tracking-[0.16em] uppercase py-[2px] opacity-85">
          {label}
        </span>
      )}
    </div>
  )
}
