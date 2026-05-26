import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { TweaksPanel } from '@/components/tweaks/TweaksPanel'
import { useTweaks } from '@/stores/tweaks'
import Dashboard from '@/pages/Dashboard'
import Watchlist from '@/pages/Watchlist'
import ItemDetail from '@/pages/ItemDetail'
import Alerts from '@/pages/Alerts'
import ExtremeTrack from '@/pages/ExtremeTrack'
import Settings from '@/pages/Settings'
import Analytics from '@/pages/Analytics'
import Login from '@/pages/Login'
import ChangePassword from '@/pages/ChangePassword'

/**
 * App · 路由 + Tweaks 同步到 <html data-*>
 * Editorial Trading Terminal · v3.1
 */
export default function App() {
  const { theme, accent, riseFall, density, appState } = useTweaks()

  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = theme
    r.dataset.accent = accent
    r.dataset.risefall = riseFall
    r.dataset.density = density
    r.dataset.appState = appState
  }, [theme, accent, riseFall, density, appState])

  return (
    <Routes>
      {/* 登录页:无 layout / 无 tweaks panel */}
      <Route path="/login" element={<Login />} />

      {/* 改密页:有 RequireAuth 但无 AppLayout(自带全屏 layout) */}
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        }
      />

      {/* 其余路由统一走 RequireAuth + AppLayout */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/item/:id" element={<ItemDetail />} />
                <Route path="/extreme" element={<ExtremeTrack />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
            <TweaksPanel />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
