import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/StatusDot'
import { Toggle } from '@/components/ui/Toggle'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { Input } from './Input'
import { DiagnosticLog } from './DiagnosticLog'
import { cn } from '@/utils/cn'

interface PlatformSource {
  code: string
  name: string
  on: boolean
  ms: number | null
  note?: string
}

const INITIAL_PLATFORMS: PlatformSource[] = [
  { code: 'BF', name: 'BUFF', on: true, ms: 142, note: 'primary CN market' },
  { code: 'YP', name: 'YYYP', on: true, ms: 168 },
  { code: 'C5', name: 'C5', on: true, ms: 204 },
  { code: 'ST', name: 'STEAM Community', on: true, ms: 318, note: 'rate limited · 5s back-off' },
  { code: 'IX', name: 'IGXE', on: false, ms: null, note: 'disabled' },
]

type RateLimit = '30' | '60' | '120' | '200'
type Cache = '0' | '30' | '60' | '300'

/** SteamDT API tab · 设计最丰富的一页 */
export function SteamDtTab() {
  const [tokenVisible, setTokenVisible] = useState(false)
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS)
  const [rateLimit, setRateLimit] = useState<RateLimit>('120')
  const [autoBackoff, setAutoBackoff] = useState(true)
  const [cache, setCache] = useState<Cache>('30')

  function togglePlatform(i: number) {
    setPlatforms((prev) => prev.map((p, idx) => (idx === i ? { ...p, on: !p.on } : p)))
  }

  return (
    <div>
      <SettingRow
        title="API endpoint"
        description={
          <>
            SteamDT open API base URL. Defaults to{' '}
            <code className="font-mono text-[11.5px]">open.steamdt.com/api</code>. Override for proxy or
            self-hosted relay.
          </>
        }
        control={
          <Input
            mono
            defaultValue="https://open.steamdt.com/api"
            style={{ width: 280 }}
          />
        }
      />

      <SettingRow
        title="API token"
        description={
          <>
            Optional. Without a token you're limited to public quotes (~10k/day). Personal tokens unlock
            50k/day and the <em>inventory</em> endpoint.
          </>
        }
        control={
          <div className="flex items-center gap-2.5">
            <Input
              mono
              type={tokenVisible ? 'text' : 'password'}
              defaultValue="••••••••••••••••a3f2"
              style={{ width: 220, letterSpacing: '0.06em' }}
            />
            <Button
              variant="ghost"
              onClick={() => setTokenVisible((v) => !v)}
              className="text-[11px] tracking-[0.08em] px-2 py-1.5"
            >
              {tokenVisible ? 'HIDE' : 'SHOW'}
            </Button>
            <Button variant="ghost" className="text-[11px] tracking-[0.08em] px-2 py-1.5">
              ROTATE
            </Button>
          </div>
        }
      />

      <SettingRow
        title="Connection status"
        description={
          <>
            Last successful call · 11s ago · token verified · plan tier{' '}
            <strong className="text-[var(--accent)] font-medium">personal</strong>
          </>
        }
        control={
          <div className="flex flex-col gap-1 items-end">
            <span className="font-mono text-[12px] text-[var(--up)] flex items-center gap-1.5">
              <StatusDot /> 184 ms · OK
            </span>
            <Button className="text-[12px] px-2.5 py-1.5">Test connection ↻</Button>
          </div>
        }
      />

      <SettingRow
        title="Daily quota"
        description="Resets at 00:00 UTC. Calls are batched; one fetch covers up to 50 items."
        align="stretch"
        control={
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <div className="font-mono tnum text-[13px] flex justify-between items-baseline">
              <span className="text-[var(--muted)]">USED</span>
              <span>
                <strong className="text-[16px] text-[var(--ink)] font-medium">4,213</strong>{' '}
                <span className="text-[var(--muted-2)]">/ 50,000 · 8.4%</span>
              </span>
            </div>
            <div className="h-1 bg-[var(--hairline)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: '8.4%' }} />
            </div>
            <div className="font-mono text-[10.5px] text-[var(--muted)] tracking-[0.08em] flex justify-between">
              <span>resets in 9h 28m</span>
              <span>~ 17.6k projected today</span>
            </div>
          </div>
        }
      />

      <SettingRow
        title="Platform sources"
        description="Pick which markets to include in the price merge. Each source counts as one call per fetch — disabling unused platforms saves quota."
        align="stretch"
        control={
          <div className="flex flex-col min-w-[320px]">
            {platforms.map((p, i) => (
              <div
                key={p.code}
                className="grid gap-2.5 items-center py-2 border-b border-dashed border-[var(--hairline)] last:border-0"
                style={{ gridTemplateColumns: '26px minmax(0,1fr) auto 36px' }}
              >
                <span
                  className={cn(
                    'w-[22px] h-[22px] rounded-[2px] bg-[var(--surface)] inline-flex items-center justify-center font-mono text-[9px] font-semibold',
                    p.on ? 'text-[var(--muted)]' : 'text-[var(--muted-2)]',
                  )}
                  style={{ border: `1px solid ${p.on ? 'var(--hairline-2)' : 'var(--hairline)'}` }}
                >
                  {p.code}
                </span>
                <span className="text-[13px] truncate">
                  {p.name}
                  {p.note && (
                    <span className="font-mono text-[var(--muted)] text-[10.5px] tracking-[0.08em] ml-2">
                      · {p.note}
                    </span>
                  )}
                </span>
                <span
                  className="font-mono tnum text-[11px]"
                  style={{
                    color: p.on
                      ? (p.ms ?? 0) > 250
                        ? 'var(--accent)'
                        : 'var(--up)'
                      : 'var(--muted-2)',
                  }}
                >
                  {p.on ? `${p.ms} ms` : '—'}
                </span>
                <Toggle checked={p.on} onChange={() => togglePlatform(i)} ariaLabel={`Toggle ${p.name}`} />
              </div>
            ))}
          </div>
        }
      />

      <SettingRow
        title="Rate limit"
        description="Max requests per minute, shared across platforms. SteamDT throttles past 60 rpm on the public plan and 200 rpm on personal."
        control={
          <SegmentedControl
            value={rateLimit}
            onChange={setRateLimit}
            options={[
              { value: '30', label: '30 RPM' },
              { value: '60', label: '60 RPM' },
              { value: '120', label: '120 RPM' },
              { value: '200', label: '200 RPM' },
            ]}
          />
        }
      />

      <SettingRow
        title="Auto-backoff on 429"
        description="Pause all polling for an exponential interval (2s, 4s, 8s…) when the API returns Too Many Requests. Recommended."
        control={<Toggle checked={autoBackoff} onChange={setAutoBackoff} ariaLabel="Auto-backoff" />}
      />

      <SettingRow
        title="Response cache"
        description="Cache identical merged-price responses for this many seconds before re-fetching. Watchlist refresh respects cadence regardless."
        control={
          <SegmentedControl
            value={cache}
            onChange={setCache}
            options={[
              { value: '0', label: '0 S' },
              { value: '30', label: '30 S' },
              { value: '60', label: '60 S' },
              { value: '300', label: '5 MIN' },
            ]}
          />
        }
      />

      <DiagnosticLog />
    </div>
  )
}
