import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/client'
import { fetchSystemInfo } from '@/api/endpoints'
import { SettingRow } from './SettingRow'

/**
 * Monitor tab · 只读
 * 后端的采集间隔、默认阈值、冷却时间均由 .env / config 驱动,
 * 前端无对应写接口,只展示统计 + 改动指引。
 */
export function MonitorTab() {
  const query = useQuery({
    queryKey: ['system-info'],
    queryFn: fetchSystemInfo,
  })

  return (
    <div>
      <div className="mb-5 px-[14px] py-[10px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[4px] font-mono text-[11px] text-[var(--muted)] leading-[1.55]">
        监控相关参数(采集间隔 / 默认阈值 / 冷却时长 / 自动归档)由后端
        <code className="text-[var(--ink-2)]"> .env </code>
        与 <code className="text-[var(--ink-2)]">config.py</code> 控制。
        修改后需重启服务生效;前端不开放写入,以避免运行时分裂。
      </div>

      <SettingRow
        title="Collection cadence"
        description="后端调度器轮询 SteamDT 的固定间隔。从 .env CHECK_INTERVAL_MINUTES 读取。"
        control={<div className="font-mono text-[13px] tnum text-[var(--muted)]">env-driven</div>}
      />
      <SettingRow
        title="Default threshold"
        description="新增监控项的默认阈值。从 .env DEFAULT_THRESHOLD_PERCENT 读取;每条 watchlist 可单独覆盖。"
        control={<div className="font-mono text-[13px] tnum text-[var(--muted)]">env-driven</div>}
      />
      <SettingRow
        title="Cooldown"
        description="同物品 + 同方向触发后的静默期。从 .env ALERT_COOLDOWN_MINUTES 读取。"
        control={<div className="font-mono text-[13px] tnum text-[var(--muted)]">env-driven</div>}
      />
      <SettingRow
        title="Auto-archive prices"
        description="超过 90 天的明细价格自动滚入按日聚合。从 .env ARCHIVE_ENABLED 读取。"
        control={<div className="font-mono text-[13px] tnum text-[var(--muted)]">env-driven</div>}
      />

      <div className="h-5" />

      <SettingRow
        title="Watchlist items"
        description="当前用户启用 + 暂停的监控项总数。"
        control={
          query.isLoading ? (
            <div className="font-mono text-[12px] text-[var(--muted)]">…</div>
          ) : query.isError ? (
            <div className="font-mono text-[11px] text-[var(--down)]">
              {apiErrorMessage(query.error)}
            </div>
          ) : (
            <div className="font-mono text-[13px] tnum">{query.data?.watchlist_count ?? 0}</div>
          )
        }
      />
      <SettingRow
        title="Extreme trackers"
        description="当前用户秒级追踪项的总数。"
        control={
          query.isLoading ? (
            <div className="font-mono text-[12px] text-[var(--muted)]">…</div>
          ) : (
            <div className="font-mono text-[13px] tnum">
              {query.data?.extreme_track_count ?? 0}
            </div>
          )
        }
      />
    </div>
  )
}
