import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, ExternalLink, Settings as SettingsIcon, User } from 'lucide-react'
import { CURRENT_USER } from '@/data/mock'
import { StatusDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', num: '01' },
  { to: '/watchlist', label: 'Watchlist', num: '02' },
  { to: '/extreme', label: 'Extreme Track', num: '03' },
  { to: '/alerts', label: 'Alerts', num: '04' },
  { to: '/analytics', label: 'Analytics', num: '05' },
  { to: '/settings', label: 'Settings', num: '06' },
] as const

const PINNED = [
  { to: '/item/4', label: 'Karambit | Midnight Vein' },
  { to: '/item/2', label: 'AWP | Glacier Echo' },
] as const

/**
 * 左侧栏 220px · 编辑部交易终端版
 * - 顶部 brand mark(衬线斜体 CS Monitor · sienna 点)
 * - 中段 nav-group(Workspace + Pinned),活动项左侧 2px sienna inset
 * - 底部:scheduler 状态 + user-menu(向上展开)
 */
export function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const id = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('click', handler)
    }
  }, [menuOpen])

  return (
    <aside
      className="sticky top-0 h-screen w-[var(--sidebar-w)] flex flex-col gap-[26px] px-[18px] py-[22px] bg-[var(--paper)] border-r border-[var(--hairline)]"
      aria-label="Primary navigation"
    >
      {/* —— Brand —— */}
      <div className="flex flex-col gap-[2px]">
        <div className="font-serif italic text-[28px] leading-none text-[var(--ink)] tracking-[-0.02em]">
          CS Monitor
          <span className="not-italic text-[var(--accent)] ml-1">·</span>
        </div>
        <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-[var(--muted)] mt-1">
          Skin Markets · v3.1
        </div>
      </div>

      {/* —— Workspace —— */}
      <nav className="flex flex-col gap-[1px]">
        <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-[var(--muted-2)] px-2 py-1 mb-1">
          Workspace
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-[10px] px-2 py-[7px] rounded-[4px] text-[13.5px] cursor-pointer select-none transition-[background,color] duration-[120ms] relative whitespace-nowrap',
                isActive
                  ? 'text-[var(--ink)] bg-[var(--surface-2)] shadow-[inset_2px_0_0_var(--accent)]'
                  : 'text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="truncate flex-1">{n.label}</span>
                <span
                  className={cn(
                    'font-mono text-[10px] ml-auto',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted-2)]',
                  )}
                >
                  {n.num}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* —— Pinned —— */}
      <nav className="flex flex-col gap-[1px]">
        <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-[var(--muted-2)] px-2 py-1 mb-1">
          Pinned
        </div>
        {PINNED.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            className={({ isActive }) =>
              cn(
                'flex items-center px-2 py-[7px] rounded-[4px] text-[13.5px] cursor-pointer truncate transition-[background,color] duration-[120ms]',
                isActive
                  ? 'text-[var(--ink)] bg-[var(--surface-2)] shadow-[inset_2px_0_0_var(--accent)]'
                  : 'text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
              )
            }
          >
            <span className="truncate">{p.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* —— Foot:scheduler + user menu —— */}
      <div className="mt-auto flex flex-col gap-[10px] pt-[14px] border-t border-[var(--hairline)]">
        <FootRow
          label={
            <>
              <StatusDot status="live" /> Scheduler
            </>
          }
          value="Live"
        />
        <FootRow label="Next collection" value="14:00" />
        <FootRow label="API quota" value="4,213 / 10k" />

        {/* User menu */}
        <div
          ref={menuRef}
          className={cn(
            'mt-3 grid grid-cols-[26px_1fr_12px] gap-[10px] items-center px-[10px] py-2 bg-[var(--surface-2)] border rounded-[5px] cursor-pointer relative transition-[border,background] duration-[120ms]',
            menuOpen ? 'border-[var(--accent)]' : 'border-[var(--hairline)] hover:border-[var(--ink-2)]',
          )}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span
            className="w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-white text-[11px] font-semibold leading-none flex-shrink-0"
            style={{ background: CURRENT_USER.color }}
          >
            {CURRENT_USER.initials}
          </span>
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-[var(--ink)] truncate leading-[1.2]">
              {CURRENT_USER.name}
            </div>
            <div className="flex gap-1 items-center font-mono text-[9.5px] text-[var(--muted)] mt-[2px]">
              <span className="inline-block px-[5px] py-[1px] font-mono text-[9px] tracking-[0.1em] uppercase border rounded-[2px] leading-[1.2] text-[var(--accent)] border-[var(--accent)]">
                {CURRENT_USER.role}
              </span>
            </div>
          </div>
          <ChevronDown
            size={12}
            className={cn(
              'transition-transform duration-[150ms]',
              menuOpen ? 'rotate-180 text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
          />

          {menuOpen && (
            <div
              className="absolute left-0 right-0 bottom-[calc(100%+6px)] bg-[var(--surface-2)] border border-[var(--hairline)] rounded-[5px] overflow-hidden z-50"
              style={{ boxShadow: '0 -10px 28px rgba(0,0,0,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <UserAction
                  icon={<User size={14} />}
                  label="Profile"
                  onClick={() => {
                    navigate('/settings')
                    setMenuOpen(false)
                  }}
                />
                <UserAction
                  icon={<SettingsIcon size={14} />}
                  label="Preferences"
                  onClick={() => {
                    navigate('/settings')
                    setMenuOpen(false)
                  }}
                />
                <UserAction
                  icon={<ExternalLink size={14} />}
                  label="GitHub · v3.1"
                  onClick={() => {
                    window.open('https://github.com/LumenMarch/cs-monitor', '_blank')
                    setMenuOpen(false)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function FootRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between font-mono text-[11.5px] text-[var(--muted)]">
      <span className="flex items-center">{label}</span>
      <strong className="text-[var(--ink-2)] font-medium">{value}</strong>
    </div>
  )
}

function UserAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'flex gap-[10px] items-center px-[14px] py-[9px] cursor-pointer text-[12.5px] transition-[background] duration-[120ms]',
        danger
          ? 'text-[var(--down)] hover:bg-[var(--surface)]'
          : 'text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
      )}
    >
      <span className={cn('flex-shrink-0', danger ? 'text-[var(--down)]' : 'text-[var(--muted)]')}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  )
}
