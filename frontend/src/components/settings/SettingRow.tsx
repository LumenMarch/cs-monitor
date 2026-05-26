import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  title: ReactNode
  description?: ReactNode
  control: ReactNode
  align?: 'center' | 'stretch'
  className?: string
}

/**
 * Settings 单行 · design.md(Settings §4)
 * 1fr auto 网格,标题+描述左,控件右,1px 下划线
 */
export function SettingRow({ title, description, control, align = 'center', className }: Props) {
  return (
    <div
      className={cn(
        'grid gap-[18px] py-[18px] border-b border-[var(--hairline)] last:border-0',
        align === 'center' ? 'items-center' : 'items-stretch',
        className,
      )}
      style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}
    >
      <div className="min-w-0">
        <h3 className="text-[14px] font-medium m-0 mb-1">{title}</h3>
        {description && (
          <p className="text-[12.5px] text-[var(--muted)] m-0 max-w-[60ch] leading-[1.5]">{description}</p>
        )}
      </div>
      <div className="min-w-0">{control}</div>
    </div>
  )
}
