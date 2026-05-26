import { Fragment, useMemo } from 'react'
import { HEATMAP } from '@/data/mock'
import { splitItemName } from '@/utils/format'

/**
 * 24h 波动热力图 · design.md §4
 * - 行:8 个 watchlist item · 列:24 小时
 * - 强度通过 color-mix(accent, transparent N%) 控制
 * - 当前小时 inset 1px accent 描边 + 标签 accent 加粗
 * - 下方时段 label + 底部图例
 */
export function VolatilityHeatmap() {
  const nowHour = useMemo(() => new Date().getHours(), [])

  function cellStyle(v: number): React.CSSProperties {
    const opacity = Math.max(0.05, Math.min(1, v))
    return {
      background: `color-mix(in oklab, var(--accent), transparent ${(1 - opacity) * 100}%)`,
    }
  }

  return (
    <div>
      <div
        className="grid gap-[2px] font-mono text-[9.5px]"
        style={{ gridTemplateColumns: '78px repeat(24, 1fr)' }}
      >
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            className="text-center text-[9px] h-[14px]"
            style={{
              color: h === nowHour ? 'var(--accent)' : 'var(--muted-2)',
              fontWeight: h === nowHour ? 600 : 400,
            }}
          >
            {h % 4 === 0 || h === nowHour ? String(h).padStart(2, '0') : ''}
          </div>
        ))}
        {HEATMAP.map((r, i) => (
          <Fragment key={i}>
            <div
              className="flex items-center justify-end pr-1.5 text-[10px] text-[var(--muted)] truncate"
              title={r.name}
            >
              {splitItemName(r.name).finish || r.name}
            </div>
            {r.row.map((v, h) => (
              <div
                key={h}
                className="h-[18px] rounded-[1px]"
                style={{
                  ...cellStyle(v),
                  boxShadow: h === nowHour ? 'inset 0 0 0 1px var(--accent)' : undefined,
                }}
                title={`${r.name} ${h}:00 · ${(v * 8).toFixed(2)}%`}
              />
            ))}
          </Fragment>
        ))}
      </div>

      {/* Period labels */}
      <div
        className="flex mt-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase text-[var(--muted-2)]"
        style={{ paddingLeft: 78 }}
      >
        <span className="flex-[9]">— overnight —</span>
        <span className="flex-[5] text-[var(--muted)]">— morning peak —</span>
        <span className="flex-[4]">— mid —</span>
        <span className="flex-[6] text-[var(--muted)]">— evening peak —</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 font-mono text-[10px] text-[var(--muted)] tracking-[0.1em]">
        <span>0%</span>
        <div className="flex gap-px">
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((v, i) => (
            <span
              key={i}
              className="w-[18px] h-[10px]"
              style={{
                background: `color-mix(in oklab, var(--accent), transparent ${(1 - v) * 100}%)`,
              }}
            />
          ))}
        </div>
        <span>8%+</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="inline-block w-[6px] h-[6px] bg-[var(--accent)]" />
          now · {String(nowHour).padStart(2, '0')}:00
        </span>
      </div>
    </div>
  )
}
