import { Button } from '@/components/ui/Button'
import { SettingRow } from './SettingRow'

/** 数据 tab */
export function DataTab() {
  return (
    <div>
      <SettingRow title="Database" description="SQLite WAL · ~/data/cs_monitor.db" control={<div className="font-mono text-[13px]">18.4 MB</div>} />
      <SettingRow
        title="Price records"
        description="Across all watchlist + extreme tracking"
        control={<div className="font-mono text-[13px]">14,238 rows</div>}
      />
      <SettingRow
        title="Alert records"
        description="All channels, normal + extreme"
        control={<div className="font-mono text-[13px]">412 rows</div>}
      />
      <SettingRow
        title="Export"
        description="Bundle the DB plus archived parquet shards."
        control={<Button>Download .zip</Button>}
      />
      <SettingRow
        title={<span className="text-[var(--down)]">Clear monitor data</span>}
        description="Removes all price + alert history. Watchlist + tracker configs are preserved. Irreversible."
        control={
          <Button
            className="!border-[var(--down)] !text-[var(--down)] hover:!bg-[var(--down-bg)]"
          >
            Erase…
          </Button>
        }
      />
    </div>
  )
}
