import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { TweaksPanel } from '@/components/tweaks/TweaksPanel'
import { useTweaks } from '@/stores/tweaks'
import Dashboard from '@/pages/Dashboard'
import Watchlist from '@/pages/Watchlist'
import ItemDetail from '@/pages/ItemDetail'
import Alerts from '@/pages/Alerts'
import ExtremeTrack from '@/pages/ExtremeTrack'
import ComingSoon from '@/pages/ComingSoon'

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
    <>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/extreme" element={<ExtremeTrack />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route
            path="/analytics"
            element={
              <ComingSoon
                title="Analytics"
                description="31 日波动日历、跨平台价差、流动性排名 — 下一轮实现。"
              />
            }
          />
          <Route
            path="/settings"
            element={
              <ComingSoon
                title="Settings"
                description="外观 / SteamDT API / 通知 / 监控 / 数据 / 关于 6 个 tab — 下一轮实现。"
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>

      <TweaksPanel />
    </>
  )
}
