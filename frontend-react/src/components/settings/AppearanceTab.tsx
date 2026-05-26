import { useTweaks } from '@/stores/tweaks'
import { SettingRow } from './SettingRow'
import { SegmentedControl } from './SegmentedControl'
import { cn } from '@/utils/cn'

const ACCENT_SWATCHES = [
  { v: 'sienna', c: '#c75a2a' },
  { v: 'lime', c: '#6f8d2e' },
  { v: 'cobalt', c: '#2c54b4' },
  { v: 'plum', c: '#7a3a72' },
] as const

/** 外观 tab · 与 tweaks store 双向绑定 */
export function AppearanceTab() {
  const { theme, accent, riseFall, density, set } = useTweaks()

  return (
    <div>
      <SettingRow
        title="Theme"
        description="Toggle between light editorial and the dark geek-terminal palette."
        control={
          <SegmentedControl
            value={theme}
            onChange={(v) => set('theme', v)}
            options={[
              { value: 'light', label: 'LIGHT' },
              { value: 'dark', label: 'DARK' },
            ]}
          />
        }
      />
      <SettingRow
        title="Accent color"
        description="Used for active states, brand mark and accent fills. Choose a tone that survives both themes."
        control={
          <div className="flex gap-1.5">
            {ACCENT_SWATCHES.map((s) => (
              <button
                key={s.v}
                type="button"
                aria-pressed={accent === s.v}
                aria-label={s.v}
                title={s.v}
                onClick={() => set('accent', s.v)}
                className={cn(
                  'w-[22px] h-[22px] rounded-[4px] cursor-pointer transition-transform duration-[120ms]',
                  accent === s.v
                    ? 'border-2 border-[var(--ink)] scale-110'
                    : 'border-2 border-transparent',
                )}
                style={{ background: s.c }}
              />
            ))}
          </div>
        }
      />
      <SettingRow
        title="Rise / fall colors"
        description="China convention shows price increases in red; international convention uses green."
        control={
          <SegmentedControl
            value={riseFall}
            onChange={(v) => set('riseFall', v)}
            options={[
              { value: 'cn', label: 'CHINA · 红涨' },
              { value: 'intl', label: 'INTERNATIONAL' },
            ]}
          />
        }
      />
      <SettingRow
        title="Density"
        description="Compact halves row height — useful for ≥ 50 watchlist items."
        control={
          <SegmentedControl
            value={density}
            onChange={(v) => set('density', v)}
            options={[
              { value: 'comfortable', label: 'COMFORTABLE' },
              { value: 'compact', label: 'COMPACT' },
            ]}
          />
        }
      />
    </div>
  )
}
