import { useState } from 'react'
import { StatusDot } from '@/components/ui/StatusDot'
import { Toggle } from '@/components/ui/Toggle'
import { SettingRow } from './SettingRow'

/** 通知 tab */
export function NotificationsTab() {
  const [wecom, setWecom] = useState(true)
  const [telegram, setTelegram] = useState(true)
  const [serverchan, setServerchan] = useState(false)

  return (
    <div>
      <SettingRow
        title="WeCom bot"
        description="Webhook configured · last test 14:00 · 6 notifications today"
        control={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[var(--muted)] inline-flex items-center">
              <StatusDot /> <span className="ml-1.5">Connected</span>
            </span>
            <Toggle checked={wecom} onChange={setWecom} ariaLabel="Toggle WeCom" />
          </div>
        }
      />
      <SettingRow
        title="Telegram bot"
        description="Connected via SOCKS5 proxy 127.0.0.1:7890 · @lumen_skin_bot"
        control={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[var(--muted)] inline-flex items-center">
              <StatusDot /> <span className="ml-1.5">Connected</span>
            </span>
            <Toggle checked={telegram} onChange={setTelegram} ariaLabel="Toggle Telegram" />
          </div>
        }
      />
      <SettingRow
        title="Server酱"
        description="SendKey not configured. Optional fallback channel."
        control={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[var(--muted)] inline-flex items-center">
              <StatusDot status="idle" /> <span className="ml-1.5">Not set</span>
            </span>
            <Toggle checked={serverchan} onChange={setServerchan} ariaLabel="Toggle Server Chan" />
          </div>
        }
      />
      <SettingRow
        title="Quiet hours"
        description="No notifications between these times. Alerts still record in the journal."
        control={<div className="font-mono text-[13px] text-[var(--ink)]">23:30 — 07:00</div>}
      />
    </div>
  )
}
