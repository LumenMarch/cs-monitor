import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Watchlist from '@/pages/Watchlist'
import ComingSoon from '@/pages/ComingSoon'

/**
 * 路由表 · 6 个主页面 + item 详情
 * 当前仅 Dashboard 完整实现,其余走 ComingSoon 占位
 */
export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route
          path="/item/:id"
          element={
            <ComingSoon
              title="Item Detail"
              description="K 线 + MA5/MA20 + 成交量、5 平台比价、套利横幅、统计与告警历史 — 下一轮实现。"
            />
          }
        />
        <Route
          path="/extreme"
          element={
            <ComingSoon
              title="Extreme Track"
              description="30 次轮询脉冲、倒计时进度、终端式 session log — 下一轮实现。"
            />
          }
        />
        <Route
          path="/alerts"
          element={
            <ComingSoon
              title="Alerts"
              description="14 日堆叠柱状图、±1h 价格曲线、Top alerting items 排行 — 下一轮实现。"
            />
          }
        />
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
  )
}
