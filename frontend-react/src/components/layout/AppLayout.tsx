import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface Props {
  children: ReactNode
}

const CRUMB_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/watchlist': 'Watchlist',
  '/extreme': 'Extreme Track',
  '/alerts': 'Alerts',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

function getCrumb(pathname: string): string {
  if (CRUMB_MAP[pathname]) return CRUMB_MAP[pathname]
  if (pathname.startsWith('/item/')) return 'Item Detail'
  return 'Dashboard'
}

/**
 * 应用外壳
 * grid 220px sidebar + 1fr main · sidebar sticky · main 内 TopBar sticky
 */
export function AppLayout({ children }: Props) {
  const location = useLocation()
  const crumb = getCrumb(location.pathname)

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: 'var(--sidebar-w) 1fr' }}>
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <TopBar crumb={crumb} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
