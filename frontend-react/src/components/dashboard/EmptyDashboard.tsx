import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ItemTile } from '@/components/ui/ItemTile'
import { SectionHead } from '@/components/ui/SectionHead'

const STEPS = [
  {
    n: '01',
    t: 'Add items',
    d: 'Search 39,000+ tracked skins or paste a Steam Market URL. We index Buff, YYYP, C5, Steam and IGXE.',
  },
  {
    n: '02',
    t: 'Set thresholds',
    d: 'Default 5% vs 7-day average. Override per item, per direction. Cooldown 4h after firing.',
  },
  {
    n: '03',
    t: 'Pick channels',
    d: 'WeCom · Telegram · Server酱. Quiet hours 23:30 — 07:00 by default. Configure in Settings.',
  },
]

const SUGGESTIONS = [
  { name: 'AWP | Dragon Lore', category: 'Sniper', popularity: 98 },
  { name: 'AK-47 | Fire Serpent', category: 'Rifle', popularity: 94 },
  { name: 'M4A4 | Howl', category: 'Rifle', popularity: 92 },
  { name: 'Karambit | Doppler', category: 'Knife', popularity: 89 },
]

/**
 * Empty Dashboard (first-run) · design.md §6 Empty state
 * Welcome eyebrow + 衬线大字 + 3 step 卡 + 4 suggested + footer
 */
export function EmptyDashboard() {
  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            Welcome · v3.1.0
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            Let's set up your <em className="italic text-[var(--accent)]">first watchlist</em>.
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[64ch]">
            CS Monitor polls SteamDT every 30 minutes for the items you care about and alerts you when prices
            shift. Three quick steps and you're collecting.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button>Import from Steam inventory</Button>
          <Button variant="primary">
            <Plus size={13} /> Add first item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 mb-9" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {STEPS.map((s) => (
          <Card key={s.n} className="!p-[22px]">
            <div className="font-mono text-[11px] tracking-[0.2em] text-[var(--accent)] mb-3">STEP {s.n}</div>
            <div className="font-serif text-[26px] leading-[1.1] mb-2">{s.t}</div>
            <p className="text-[var(--muted)] text-[13px] m-0 leading-[1.5]">{s.d}</p>
          </Card>
        ))}
      </div>

      <SectionHead
        num="04"
        title={
          <>
            Suggested · popular this month{' '}
            <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--muted)] ml-2">
              starter ideas
            </span>
          </>
        }
        meta="Tap to add ↓"
      />

      <div className="grid gap-[18px] mt-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {SUGGESTIONS.map((s) => (
          <article
            key={s.name}
            className="bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[4px] overflow-hidden cursor-pointer flex flex-col transition-[border] duration-[120ms] hover:border-[var(--ink-2)]"
          >
            <div className="flex justify-between items-center px-[14px] py-3 font-mono text-[10.5px] text-[var(--muted)] tracking-[0.1em] uppercase border-b border-[var(--hairline)]">
              <span>{s.category} · suggested</span>
              <span>★ {s.popularity}</span>
            </div>
            <ItemTile size="lg" label={s.name} className="w-full !h-[78px]" />
            <div className="px-4 py-[14px] pb-[18px] flex flex-col gap-2.5">
              <h3 className="font-serif font-normal text-[22px] m-0 leading-[1.15] tracking-[-0.005em]">
                {s.name}
              </h3>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-[var(--muted)] text-[11px]">Add at default threshold</span>
                <span className="font-mono text-[12px] text-[var(--accent)]">＋ Add</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-9 pt-[18px] border-t border-[var(--hairline)] flex justify-between font-mono text-[11px] text-[var(--muted)] tracking-[0.1em]">
        <span>0 items · 0 polls today · scheduler idle</span>
        <span>
          Need help? Read the{' '}
          <a className="text-[var(--accent)] underline cursor-pointer">quickstart →</a>
        </span>
      </div>
    </div>
  )
}
