import { useMemo } from 'react'
import { PLATFORM_PRICES, type PlatformPrice } from '@/data/mock'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  platforms?: PlatformPrice[]
}

/**
 * 平台比价 · design.md(详情页 §4)
 * 三部分:
 *  1. Arbitrage 横幅(Buy at / +X% / Sell at)
 *  2. 渐变彩条价格轴 + 平台圆形 code 标记
 *  3. 每平台行带 bid/ask 范围条 + ↑now 标记 + vs floor 百分比
 *
 * 默认走 mock(无数据展示);传入 platforms 数组覆盖。
 */
export function PlatformComparison({ platforms = PLATFORM_PRICES }: Props = {}) {
  const list = platforms
  const { min, max, range, cheapest, dearest, arbAbs, arbPct, sorted } = useMemo(() => {
    const prices = list.map((p) => p.price)
    const mn = Math.min(...prices)
    const mx = Math.max(...prices)
    const rg = mx - mn || 1
    const ch = list.find((p) => p.price === mn)!
    const de = list.find((p) => p.price === mx)!
    return {
      min: mn,
      max: mx,
      range: rg,
      cheapest: ch,
      dearest: de,
      arbAbs: mx - mn,
      arbPct: ((mx - mn) / mn) * 100,
      sorted: [...list].sort((a, b) => a.price - b.price),
    }
  }, [list])

  return (
    <div>
      {/* —— Arbitrage banner —— */}
      <div
        className="grid items-center gap-[18px] px-[14px] py-2.5 bg-[var(--surface)] border border-[var(--hairline)] rounded-[3px] mb-[22px]"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-[var(--muted)]">
            Buy at
          </div>
          <div className="flex items-baseline gap-2.5 mt-0.5">
            <span
              className="font-serif text-[var(--up)] tracking-[-0.01em]"
              style={{ fontSize: 28 }}
            >
              {cheapest.name}
            </span>
            <span className="font-mono tnum text-[14px]">{formatCurrency(cheapest.price)}</span>
            <span className="font-mono text-[10.5px] text-[var(--muted)]">
              · {cheapest.listings} listings
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-[2px] px-[14px]">
          <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-[var(--muted)]">
            Arbitrage
          </div>
          <div
            className="font-serif text-[var(--accent)] leading-none tracking-[-0.01em]"
            style={{ fontSize: 32 }}
          >
            +{arbPct.toFixed(1)}%
          </div>
          <div className="font-mono text-[10.5px] text-[var(--muted)]">
            {formatCurrency(arbAbs)} spread
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-[var(--muted)]">
            Sell at
          </div>
          <div className="flex items-baseline gap-2.5 mt-0.5 justify-end">
            <span className="font-mono text-[10.5px] text-[var(--muted)]">
              {dearest.listings} listings ·
            </span>
            <span className="font-mono tnum text-[14px]">{formatCurrency(dearest.price)}</span>
            <span
              className="font-serif text-[var(--down)] tracking-[-0.01em]"
              style={{ fontSize: 28 }}
            >
              {dearest.name}
            </span>
          </div>
        </div>
      </div>

      {/* —— Range axis —— */}
      <div className="relative" style={{ padding: '30px 8px 36px', marginBottom: 4 }}>
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{ top: 36, height: 6, background: 'var(--hairline)' }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--up), var(--accent), var(--down))',
              opacity: 0.18,
            }}
          />
        </div>
        <div className="absolute top-1.5 left-0 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--up)]">
          {formatCurrency(min)} · floor
        </div>
        <div className="absolute top-1.5 right-0 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--down)] text-right">
          ceiling · {formatCurrency(max)}
        </div>
        {/* Platform dots */}
        {list.map((p) => {
          const pos = ((p.price - min) / range) * 100
          const isCheap = p.price === min
          const isDear = p.price === max
          const color = isCheap ? 'var(--up)' : isDear ? 'var(--down)' : 'var(--ink)'
          return (
            <div
              key={p.name}
              className="absolute flex flex-col items-center"
              style={{ top: 26, left: `calc(${pos}% - 14px)`, width: 28 }}
            >
              <div
                className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center font-mono text-[10px] font-semibold"
                style={{
                  border: `2px solid ${color}`,
                  color,
                  boxShadow: isCheap || isDear ? '0 2px 6px rgba(0,0,0,0.08)' : undefined,
                }}
              >
                {p.code}
              </div>
              <div className="font-mono text-[9.5px] text-[var(--muted)] mt-1 tracking-[0.04em]">
                ¥{Math.round(p.price)}
              </div>
            </div>
          )
        })}
      </div>

      {/* —— Per-platform rows with bid/ask —— */}
      <div className="mt-2 pt-3.5 border-t border-[var(--hairline)]">
        <div
          className="grid gap-3.5 py-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase text-[var(--muted)]"
          style={{ gridTemplateColumns: '180px 1fr 80px 80px 90px' }}
        >
          <span>Platform</span>
          <span>Bid · ask range</span>
          <span className="text-right">Listings</span>
          <span className="text-right">Best ask</span>
          <span className="text-right">vs floor</span>
        </div>
        {sorted.map((p, i) => (
          <PlatformRow
            key={p.name}
            p={p}
            i={i}
            total={sorted.length}
            min={min}
            max={max}
          />
        ))}
      </div>
    </div>
  )
}

function PlatformRow({
  p,
  i,
  total,
  min,
  max,
}: {
  p: PlatformPrice
  i: number
  total: number
  min: number
  max: number
}) {
  // Mock bid/ask: ±2% around best ask
  const bid = p.price * 0.985
  const ask = p.price * 1.012
  const lower = min * 0.98
  const upper = max * 1.02
  const span = upper - lower || 1
  const bidPos = ((bid - lower) / span) * 100
  const askPos = ((ask - lower) / span) * 100
  const nowPos = ((p.price - lower) / span) * 100
  const vsFloor = ((p.price - min) / min) * 100
  const isCheap = p.price === min

  return (
    <div
      className={cn(
        'grid items-center gap-3.5 py-[11px]',
        i < total - 1 && 'border-b border-dashed border-[var(--hairline)]',
      )}
      style={{ gridTemplateColumns: '180px 1fr 80px 80px 90px' }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-[22px] h-[22px] rounded-[2px] bg-[var(--surface)] inline-flex items-center justify-center font-mono text-[10px] font-semibold"
          style={{
            border: `1px solid ${isCheap ? 'var(--up)' : 'var(--hairline-2)'}`,
            color: isCheap ? 'var(--up)' : 'var(--muted)',
          }}
        >
          {p.code}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] truncate">{p.name}</div>
          <div className="font-mono text-[10px] text-[var(--muted)]">
            {isCheap ? '★ best price' : `+¥${(p.price - min).toFixed(1)}`}
          </div>
        </div>
      </div>

      {/* bid/ask range bar */}
      <div className="relative h-7">
        <div className="absolute left-0 right-0 h-[2px] bg-[var(--hairline)]" style={{ top: 13 }} />
        <div
          className="absolute rounded-[1px]"
          style={{
            top: 11,
            left: `${bidPos}%`,
            width: `${askPos - bidPos}%`,
            height: 6,
            background: isCheap ? 'var(--up)' : 'var(--ink-2)',
            opacity: 0.85,
          }}
        />
        <div
          className="absolute font-mono text-[9.5px] text-[var(--muted)]"
          style={{ top: 0, left: `${bidPos}%`, transform: 'translateX(-50%)' }}
        >
          {Math.round(bid)}
        </div>
        <div
          className="absolute font-mono text-[9.5px] text-[var(--muted)]"
          style={{ top: 0, left: `${askPos}%`, transform: 'translateX(-50%)' }}
        >
          {Math.round(ask)}
        </div>
        <div
          className="absolute font-mono text-[8.5px] tracking-[0.06em] uppercase"
          style={{
            top: 18,
            left: `${nowPos}%`,
            transform: 'translateX(-50%)',
            color: isCheap ? 'var(--up)' : 'var(--ink-2)',
          }}
        >
          ↑ now
        </div>
      </div>

      <div className="text-right font-mono tnum text-[12px]">{p.listings}</div>
      <div
        className="text-right font-mono tnum text-[12.5px]"
        style={{ color: isCheap ? 'var(--up)' : 'var(--ink)' }}
      >
        {formatCurrency(p.price)}
      </div>
      <div
        className="text-right font-mono tnum text-[12px]"
        style={{ color: isCheap ? 'var(--muted)' : 'var(--accent)' }}
      >
        {isCheap ? '—' : `+${vsFloor.toFixed(2)}%`}
      </div>
    </div>
  )
}
