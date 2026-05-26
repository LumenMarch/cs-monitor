import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

const PLATFORMS = ['BUFF', 'YYYP', 'C5', 'STEAM', 'IGXE']
const PHASES = ['fetch', 'parse', 'diff', 'alert', 'notify'] as const

/**
 * Loading Dashboard · design.md §6 Loading state
 * - 大标题 Collecting prices… N of 12
 * - 进度条 + 12 格指示器(已完成 up / 正在 pulse / 未完成 hairline)
 * - 左侧骨架(hero + movers shimmer)
 * - 右侧实时 terminal log,逐秒推进 fetch/parse/diff/alert/notify
 */
export function LoadingDashboard() {
  const [tick, setTick] = useState(0)
  const [collected, setCollected] = useState(3)

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setCollected((c) => Math.min(12, c + 1))
    }, 800)
    return () => clearInterval(id)
  }, [])

  const elapsedSec = (tick * 0.8).toFixed(1)
  const pct = Math.round((collected / 12) * 100)

  // Generate live log lines
  const lines: { tag: string; text: string }[] = []
  for (let i = 0; i < Math.min(collected, 8); i++) {
    const phase = PHASES[i % PHASES.length]!
    const platform = PLATFORMS[i % PLATFORMS.length]!
    lines.push({
      tag: phase.toUpperCase(),
      text: `${platform} · ${(120 + i * 23).toFixed(0)}ms · ok`,
    })
  }

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* Head */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            Refreshing · started {elapsedSec}s ago
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Collecting prices… <em className="italic text-[var(--accent)]">{collected}</em>{' '}
            <span className="text-[var(--muted)]">of 12 items</span>
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[64ch]">
            Polling 5 platforms in parallel · throttled to stay under quota · est. {Math.max(0, 12 - collected)} more
            seconds.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-7">
        <div className="flex justify-between font-mono text-[10.5px] tracking-[0.16em] text-[var(--muted)] uppercase mb-1.5">
          <span>Progress · {pct}%</span>
          <span>
            {collected} / 12 · {elapsedSec}s elapsed
          </span>
        </div>
        <div className="h-1 bg-[var(--hairline)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
          />
        </div>
        <div className="flex gap-1 mt-3 h-[18px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-[1px]',
                i < collected
                  ? 'bg-[var(--up)]'
                  : i === collected
                    ? 'bg-[var(--hairline)] animate-pulse'
                    : 'bg-[var(--hairline)]',
              )}
            />
          ))}
        </div>
      </div>

      {/* —— Skeletons + Log —— */}
      <section className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        {/* Left: skeleton hero + movers */}
        <div className="flex flex-col gap-4">
          <Skel className="h-[100px]" />
          <Skel className="h-[140px]" />
          <Skel className="h-[140px]" />
        </div>

        {/* Right: terminal log */}
        <div className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] overflow-hidden">
          <div className="bg-[var(--ink)] text-[var(--bg)] px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase flex justify-between">
            <span>~/lumen/cs-monitor/refresh.log</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--up)]"
                style={{ animation: 'pulse-ring 1.4s ease-in-out infinite', boxShadow: '0 0 0 3px var(--up-bg)' }}
              />
              streaming
            </span>
          </div>
          <div className="font-mono text-[11.5px] max-h-[400px] overflow-hidden">
            {lines.map((l, i) => (
              <div
                key={i}
                className="grid gap-2.5 px-3.5 py-[5px] items-center border-b border-dashed border-[var(--hairline)] last:border-0 text-[var(--ink-2)]"
                style={{ gridTemplateColumns: '60px 1fr 40px' }}
              >
                <span className="text-[var(--accent)] tracking-[0.1em]">{l.tag}</span>
                <span className="truncate">{l.text}</span>
                <span className="text-right text-[var(--up)]">✓</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Skel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[4px] bg-[var(--surface-2)] border border-[var(--hairline)] relative overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--surface) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'skel-shimmer 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )
}
