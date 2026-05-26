/**
 * 31 日波动日历 · design.md(Analytics §4 + calendar style)
 * - 7 列 5 行(实际 31 天单纯按顺序排,7 列等宽)
 * - 单元格背景 color-mix(accent, transparent N%) 控制强度
 * - 日期 mono 8.5px 左上角
 */

interface Props {
  days?: number[]
}

function buildDays(): number[] {
  const arr: number[] = []
  for (let i = 0; i < 31; i++) {
    const v = Math.max(0, Math.min(1, 0.1 + ((i * 7 + 13) % 17) / 30 + (i % 5 === 0 ? 0.3 : 0)))
    arr.push(v)
  }
  return arr
}

export function VolatilityCalendar({ days = buildDays() }: Props) {
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((v, i) => (
          <div
            key={i}
            className="aspect-square rounded-[2px] relative"
            style={{
              background: `color-mix(in oklab, var(--accent), transparent ${(1 - v) * 100}%)`,
            }}
            title={`Day ${i + 1} · ${(v * 8).toFixed(2)}%`}
          >
            <span className="absolute top-[2px] left-[3px] font-mono text-[8.5px] text-[var(--muted-2)]">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 font-mono text-[10px] text-[var(--muted)] tracking-[0.1em]">
        <span>quiet</span>
        <div className="flex gap-px">
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((v, i) => (
            <span
              key={i}
              className="w-[18px] h-[10px]"
              style={{ background: `color-mix(in oklab, var(--accent), transparent ${(1 - v) * 100}%)` }}
            />
          ))}
        </div>
        <span>turbulent</span>
      </div>
    </div>
  )
}
