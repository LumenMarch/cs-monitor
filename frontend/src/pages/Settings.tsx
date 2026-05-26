import { useState } from 'react'
import { AppearanceTab } from '@/components/settings/AppearanceTab'
import { SteamDtTab } from '@/components/settings/SteamDtTab'
import { SecurityTab } from '@/components/settings/SecurityTab'
import { NotificationsTab } from '@/components/settings/NotificationsTab'
import { MonitorTab } from '@/components/settings/MonitorTab'
import { DataTab } from '@/components/settings/DataTab'
import { AboutTab } from '@/components/settings/AboutTab'
import { cn } from '@/utils/cn'

type TabId = 'appearance' | 'api' | 'security' | 'notify' | 'monitor' | 'data' | 'about'

const TABS: { id: TabId; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'api', label: 'SteamDT API' },
  { id: 'security', label: 'Security' },
  { id: 'notify', label: 'Notifications' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'About' },
]

/**
 * Settings · design.md(Settings §4)
 * 200px 左 nav + 1fr content · tab 当前态 surface-2 底 + 左 2px accent
 */
export default function Settings() {
  const [tab, setTab] = useState<TabId>('appearance')

  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0 page-anim">
      {/* —— Head —— */}
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            06 · Settings
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Settings
          </h1>
        </div>
      </div>

      {/* —— Grid —— */}
      <div className="grid gap-9" style={{ gridTemplateColumns: '200px minmax(0, 1fr)' }}>
        <nav className="flex flex-col gap-0.5 self-start" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'true' : 'false'}
              className={cn(
                'text-left px-2.5 py-2 rounded-[3px] text-[13px] cursor-pointer transition-colors duration-[120ms]',
                tab === t.id
                  ? 'bg-[var(--surface-2)] text-[var(--ink)] border-l-2 border-[var(--accent)] pl-2'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'api' && <SteamDtTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'notify' && <NotificationsTab />}
          {tab === 'monitor' && <MonitorTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}
