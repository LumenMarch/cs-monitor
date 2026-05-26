import { useEffect, useMemo, useState } from 'react'
import { Pause, Plus } from 'lucide-react'
import { TRACKS } from '@/data/mock'
import { Button } from '@/components/ui/Button'
import { KpiStrip } from '@/components/dashboard/KpiStrip'
import { SectionHead } from '@/components/ui/SectionHead'
import { TrackerCard } from '@/components/extreme/TrackerCard'
import { SessionLog } from '@/components/extreme/SessionLog'
import type { PollEvent, SessionEvent } from '@/components/extreme/types'

/** seeded random (deterministic) */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * Extreme Track · design.md §4
 * 每秒 tick + 30 次轮询合成 + session log 排序
 */
export default function ExtremeTrack() {
  const [now, setNow] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const tracksWithHistory = useMemo(
    () =>
      TRACKS.map((t) => {
        const rand = seeded(t.id * 17 + 91)
        const history: PollEvent[] = []
        for (let i = 0; i < 30; i++) {
          const delta = (rand() - 0.46) * 2 * t.intensity * 1.2
          const status = rand() > 0.94 ? '429' : 'ok'
          const ms = Math.round(60 + rand() * 400)
          history.push({ delta, status: status as 'ok' | '429', ms })
        }
        return { ...t, history }
      }),
    [],
  )

  const sessionLog: SessionEvent[] = useMemo(() => {
    const events: SessionEvent[] = []
    tracksWithHistory.forEach((t) => {
      const last8 = t.history.slice(-8)
      const intervalSec = parseInt(t.interval) || 30
      last8.forEach((h, i) => {
        const offset = (t.history.length - 1 - (t.history.length - 8 + i)) * intervalSec
        events.push({
          time: offset,
          tracker: t.item,
          platform: t.platform,
          delta: h.delta,
          status: h.status,
          ms: h.ms,
        })
      })
    })
    return events.sort((a, b) => a.time - b.time).slice(0, 18)
  }, [tracksWithHistory])

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      {/* —— Page head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            03 · Extreme Track
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Extreme track <em className="italic text-[var(--accent)]">·</em> seconds-level sniping
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[64ch]">
            High-frequency single-item monitoring. Auto-backoff on 429. Quiet hours enforced. 3 of 4
            trackers live, polling 4.2k times today.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button>
            <Pause size={13} /> Pause all
          </Button>
          <Button variant="primary">
            <Plus size={13} /> New tracker
          </Button>
        </div>
      </div>

      {/* —— KPI strip —— */}
      <KpiStrip
        items={[
          {
            label: 'Active trackers',
            value: 3,
            suffix: <span className="text-[20px] text-[var(--muted)]">/4</span>,
            foot: <>▲ all healthy</>,
            footTone: 'up',
          },
          {
            label: 'Polls today',
            value: 4213,
            format: (v) => Math.floor(v).toLocaleString('en-US'),
            foot: <>avg 8.2s interval</>,
          },
          {
            label: '429 backoffs',
            value: 2,
            foot: <>last 13:08 BUFF</>,
          },
          {
            label: 'Triggered alerts',
            value: 6,
            foot: <>5 surge · 1 drop</>,
            footTone: 'up',
          },
        ]}
      />

      <div className="h-7" />

      {/* —— Trackers + Session log —— */}
      <section className="grid gap-7" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div>
          <SectionHead
            num="01"
            title={
              <>
                Trackers{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  {TRACKS.length} configured
                </span>
              </>
            }
            meta="Sort · by intensity"
          />
          <div className="flex flex-col gap-3.5">
            {tracksWithHistory.map((t) => (
              <TrackerCard key={t.id} t={t} now={now} />
            ))}
          </div>
        </div>

        <div>
          <SectionHead
            num="02"
            title={
              <>
                Session log{' '}
                <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
                  tail · live
                </span>
              </>
            }
            meta={`${sessionLog.length} recent polls`}
          />
          <SessionLog events={sessionLog} />
        </div>
      </section>
    </div>
  )
}
