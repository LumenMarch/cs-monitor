import { formatCurrency } from '@/utils/format'

interface Category {
  name: string
  value: number
  color: string
  count: number
}

const CATEGORIES: Category[] = [
  { name: 'Knife', value: 2810.5, color: 'var(--accent)', count: 2 },
  { name: 'Rifle', value: 471.55, color: 'var(--ink-2)', count: 4 },
  { name: 'Sniper', value: 501.95, color: 'var(--muted)', count: 2 },
  { name: 'Pistol', value: 150.9, color: 'var(--hairline-2)', count: 4 },
]

/**
 * 品类分布 · design.md(Analytics)
 * 顶部 22px 横向堆叠 + 下方 4 行明细(色块 / 名 + count / ¥ / 百分比)
 */
export function CategoryBars() {
  const total = CATEGORIES.reduce((a, b) => a + b.value, 0)

  return (
    <div>
      {/* Top bar */}
      <div className="flex h-[22px] rounded-[2px] overflow-hidden mb-3.5">
        {CATEGORIES.map((c) => (
          <div
            key={c.name}
            title={`${c.name} ¥${c.value.toFixed(0)}`}
            style={{ flex: c.value, background: c.color }}
          />
        ))}
      </div>

      <div>
        {CATEGORIES.map((c) => (
          <div
            key={c.name}
            className="grid items-center gap-2.5 py-2 border-b border-dashed border-[var(--hairline)] last:border-0"
            style={{ gridTemplateColumns: '10px minmax(0,1fr) auto auto' }}
          >
            <span
              className="w-2 h-2 inline-block rounded-[1px]"
              style={{ background: c.color }}
              aria-hidden
            />
            <span className="text-[13px] truncate">
              {c.name}{' '}
              <span className="font-mono text-[var(--muted)] text-[10.5px]">· {c.count} items</span>
            </span>
            <span className="font-mono tnum text-[12.5px]">{formatCurrency(c.value)}</span>
            <span className="font-mono text-[var(--muted)] text-[11px] text-right w-[50px]">
              {((c.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
