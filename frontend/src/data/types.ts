/**
 * 前端 UI 域类型 · 与后端 schema 的映射通过 api/adapters.ts 完成
 * 这些类型代表「前端规范化后」的数据形态,可能比后端字段更精简或附带 UI 派生字段
 */

export type Wear = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'
export type Category = 'Rifle' | 'Sniper' | 'Pistol' | 'Knife'

export interface WatchItem {
  id: number
  name: string
  wear: Wear
  category: Category
  price: number
  change24: number
  change7d: number
  threshold: number
  monitoring: boolean
  series: number[]
}

export interface Alert {
  id: number
  time: string
  kind: 'surge' | 'drop' | 'qty'
  name: string
  wear: Wear
  desc: string
  delta: number
  price: number
  platform: string
}

export interface OHLC {
  open: number
  close: number
  high: number
  low: number
  volume: number
}

export interface PlatformPrice {
  name: string
  code: string
  price: number
  listings: number
  change: number
}
