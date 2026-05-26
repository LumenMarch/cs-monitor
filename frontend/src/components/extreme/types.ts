export interface PollEvent {
  delta: number
  status: 'ok' | '429'
  ms: number
}

export interface SessionEvent {
  time: number
  tracker: string
  platform: string
  delta: number
  status: 'ok' | '429'
  ms: number
}
