import { StatusDot } from '@/components/ui/StatusDot'
import { SettingRow } from './SettingRow'

/** 关于 tab */
export function AboutTab() {
  return (
    <div>
      <SettingRow
        title="CS Monitor"
        description="Self-hosted CS2 skin price dashboard. MIT licensed. Backed by SteamDT open API. Maintained by LumenMarch and a handful of contributors."
        control={<div className="font-mono text-[12px] text-[var(--muted)]">v3.1.0</div>}
      />
      <SettingRow
        title="API status"
        description="SteamDT openAPI · last successful call 11s ago"
        control={
          <span className="font-mono text-[12px] text-[var(--muted)] inline-flex items-center">
            <StatusDot /> <span className="ml-1.5">OK · 184ms</span>
          </span>
        }
      />
      <SettingRow
        title="Uptime"
        description="Process started 18 May at 02:31"
        control={<div className="font-mono text-[13px]">7d 12h 41m</div>}
      />
      <SettingRow
        title="License"
        description="MIT · feel free to fork."
        control={
          <a
            className="inline-flex items-center gap-1.5 px-[14px] py-2 rounded-[4px] text-[13px] font-medium border border-[var(--hairline-2)] bg-[var(--surface-2)] hover:bg-[var(--surface)] hover:border-[var(--ink-2)] transition-colors cursor-pointer"
            href="https://github.com/LumenMarch/cs-monitor"
            target="_blank"
            rel="noreferrer"
          >
            GitHub →
          </a>
        }
      />
    </div>
  )
}
