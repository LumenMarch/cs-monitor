import { useState } from 'react'
import { Toggle } from '@/components/ui/Toggle'
import { SettingRow } from './SettingRow'

/** 监控 tab */
export function MonitorTab() {
  const [archive, setArchive] = useState(true)

  return (
    <div>
      <SettingRow
        title="Collection cadence"
        description="How often the scheduler polls SteamDT for regular watchlist items."
        control={<div className="font-mono text-[13px]">every 30 min</div>}
      />
      <SettingRow
        title="Default threshold"
        description="% change vs 7-day average that triggers an alert. Per-item overrides available."
        control={<div className="font-mono text-[13px]">5.0 %</div>}
      />
      <SettingRow
        title="Cooldown"
        description="Same item + direction muted for this duration after firing."
        control={<div className="font-mono text-[13px]">4h</div>}
      />
      <SettingRow
        title="Auto-archive prices"
        description="Detail-level records older than 90 days roll up into daily summaries."
        control={<Toggle checked={archive} onChange={setArchive} ariaLabel="Auto-archive" />}
      />
    </div>
  )
}
