import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RefreshCcw, Trash2, XCircle } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import {
  deleteSteamdtKey,
  fetchMe,
  fetchSystemInfo,
  updateSteamdtKey,
} from '@/api/endpoints'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
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

/** SteamDT API tab · 接 /auth/steamdt-key + /settings/system */
export function SteamDtTab() {
  const queryClient = useQueryClient()
  const me = useAuth((s) => s.user)
  const setMe = useAuth((s) => s.setUser)

  const [tokenInput, setTokenInput] = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)

  const sysQuery = useQuery({
    queryKey: ['system-info'],
    queryFn: fetchSystemInfo,
    staleTime: 60_000,
  })

  // 真后端动作
  const updateKey = useMutation({
    mutationFn: (apiKey: string) => updateSteamdtKey(apiKey),
    onSuccess: async () => {
      const fresh = await fetchMe()
      setMe(fresh)
      setTokenInput('')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const deleteKey = useMutation({
    mutationFn: deleteSteamdtKey,
    onSuccess: async () => {
      const fresh = await fetchMe()
      setMe(fresh)
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const testConn = useMutation({
    mutationFn: fetchMe,
    onSuccess: (fresh) => setMe(fresh),
  })

  // —— 仅本地状态(未持久化的 UI 偏好) ——
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS)
  const [rateLimit, setRateLimit] = useState<RateLimit>('120')
  const [autoBackoff, setAutoBackoff] = useState(true)
  const [cache, setCache] = useState<Cache>('30')

  function togglePlatform(i: number) {
    setPlatforms((prev) => prev.map((p, idx) => (idx === i ? { ...p, on: !p.on } : p)))
  }

  const hasKey = !!me?.has_steamdt_key
  const connOk = testConn.isSuccess || hasKey

  return (
    <div>
      <SettingRow
        title="API endpoint"
        description={
          <>
            SteamDT open API base URL. 默认 <code className="font-mono text-[11.5px]">open.steamdt.com/api</code>,
            由后端 <code className="font-mono text-[11.5px]">.env</code> 配置;前端只读展示。
          </>
        }
        control={
          <Input
            mono
            readOnly
            value="https://open.steamdt.com/api"
            style={{ width: 280 }}
          />
        }
      />

      <SettingRow
        title="API token"
        description={
          <>
            可选。无 token 时回退到系统级 .env 配置。Personal token 解锁 50k/天与{' '}
            <em>inventory</em> 接口,密文 + master 密钥加密入 DB。
          </>
        }
        control={
          <div className="flex flex-col gap-1.5 items-end">
            <div className="flex items-center gap-2">
              <Input
                mono
                type={tokenVisible ? 'text' : 'password'}
                placeholder={hasKey ? '••••••••••••(已加密保存)' : 'Paste your SteamDT token'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{ width: 240, letterSpacing: '0.06em' }}
              />
              <Button
                variant="ghost"
                onClick={() => setTokenVisible((v) => !v)}
                className="text-[11px] tracking-[0.08em] px-2 py-1.5"
              >
                {tokenVisible ? 'HIDE' : 'SHOW'}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                onClick={() => tokenInput.trim() && updateKey.mutate(tokenInput.trim())}
                disabled={!tokenInput.trim() || updateKey.isPending}
                className="text-[12px] px-3 py-1.5"
              >
                {updateKey.isPending ? 'Saving…' : hasKey ? 'Rotate key' : 'Save key'}
              </Button>
              {hasKey && (
                <Button
                  variant="ghost"
                  onClick={() => deleteKey.mutate()}
                  disabled={deleteKey.isPending}
                  className="!text-[var(--down)] text-[12px] px-3 py-1.5"
                >
                  <Trash2 size={12} /> Remove
                </Button>
              )}
            </div>
            {(updateKey.error || deleteKey.error) && (
              <div className="font-mono text-[10.5px] text-[var(--down)] mt-0.5">
                {apiErrorMessage(updateKey.error ?? deleteKey.error)}
              </div>
            )}
            {updateKey.isSuccess && (
              <div className="font-mono text-[10.5px] text-[var(--up)] mt-0.5">
                ✓ 已加密保存,后续 SteamDT 请求会优先用你的 key
              </div>
            )}
            {deleteKey.isSuccess && (
              <div className="font-mono text-[10.5px] text-[var(--muted)] mt-0.5">
                — Key 已清除,回退到系统级 fallback
              </div>
            )}
          </div>
        }
      />

      <SettingRow
        title="Connection status"
        description={
          hasKey ? (
            <>
              Personal key registered · <strong className="text-[var(--accent)] font-medium">user-scoped</strong>{' '}
              · master encrypted at rest
            </>
          ) : (
            <>System fallback · 当无个人 key 时使用 .env 配置(若有)</>
          )
        }
        control={
          <div className="flex flex-col gap-1 items-end">
            {testConn.isPending ? (
              <span className="font-mono text-[12px] text-[var(--muted)] flex items-center gap-1.5">
                <RefreshCcw size={11} className="animate-spin" /> Testing…
              </span>
            ) : connOk ? (
              <span className="font-mono text-[12px] text-[var(--up)] flex items-center gap-1.5">
                <CheckCircle2 size={11} /> {testConn.isSuccess ? 'token verified' : 'configured'}
              </span>
            ) : (
              <span className="font-mono text-[12px] text-[var(--muted)] flex items-center gap-1.5">
                <XCircle size={11} /> not set
              </span>
            )}
            <Button onClick={() => testConn.mutate()} className="text-[12px] px-2.5 py-1.5">
              <RefreshCcw size={11} /> Test connection
            </Button>
          </div>
        }
      />

      <SettingRow
        title="Account stats"
        description="当前用户在 SteamDT 上的轮询占用 + 数据库大小。SteamDT 不提供配额查询接口,这里展示本地索引和你的监控规模。"
        align="stretch"
        control={
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            {sysQuery.isLoading && (
              <span className="font-mono text-[11px] text-[var(--muted)]">Loading…</span>
            )}
            {sysQuery.data && (
              <>
                <KvLine label="Watchlist" value={`${sysQuery.data.watchlist_count} items`} />
                <KvLine label="Extreme trackers" value={`${sysQuery.data.extreme_track_count} configs`} />
                <KvLine label="DB size" value={sysQuery.data.db_size_human} />
                <KvLine label="Server version" value={`v${sysQuery.data.version}`} />
                <KvLine
                  label="Data dir"
                  value={
                    <code className="font-mono text-[10.5px]">{sysQuery.data.data_dir}</code>
                  }
                />
              </>
            )}
            {sysQuery.isError && (
              <div className="font-mono text-[11px] text-[var(--down)]">
                {apiErrorMessage(sysQuery.error)}
              </div>
            )}
          </div>
        }
      />

      <SettingRow
        title="Platform sources"
        description="前端展示用,实际平台选择由后端 .env 配置。Disabling 在 UI 上预览效果,不向服务端提交。"
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
        description="Max requests per minute, shared across platforms. SteamDT throttles past 60 rpm on the public plan and 200 rpm on personal. 仅前端预览。"
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
        description="Pause all polling for an exponential interval (2s, 4s, 8s…) when the API returns Too Many Requests. 后端默认开启。"
        control={<Toggle checked={autoBackoff} onChange={setAutoBackoff} ariaLabel="Auto-backoff" />}
      />

      <SettingRow
        title="Response cache"
        description="Cache identical merged-price responses for this many seconds before re-fetching. 仅前端预览。"
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

function KvLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline font-mono text-[12px]">
      <span className="text-[var(--muted)] tracking-[0.1em] uppercase text-[10px]">{label}</span>
      <span className="text-[var(--ink)] tnum">{value}</span>
    </div>
  )
}
