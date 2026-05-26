/** 单 tracker 的近期事件(来自 ExtremeAlertRecord 投影) */
export interface TrackEvent {
  /** 变化百分比(price 或 quantity) */
  delta: number
  /** 该事件的度量类型,用于颜色/tooltip */
  metric: 'price' | 'qty'
  /** 告警时间 ISO 字符串 */
  notifiedAt: string
  /** 后端原始 alert_type */
  alertType: string
}

/** SessionLog 行 · 由 ExtremeAlertRecord 直接投影 */
export interface SessionEvent {
  id: number
  notifiedAt: string
  tracker: string
  platform: string
  delta: number
  metric: 'price' | 'qty'
  alertType: string
}
