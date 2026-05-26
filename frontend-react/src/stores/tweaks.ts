import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type Accent = 'sienna' | 'lime' | 'cobalt' | 'plum'
export type RiseFall = 'cn' | 'intl'
export type Density = 'comfortable' | 'compact'
export type AppState = 'normal' | 'empty' | 'loading' | 'offline'

interface TweaksState {
  theme: Theme
  accent: Accent
  riseFall: RiseFall
  density: Density
  appState: AppState
  set: <K extends keyof Omit<TweaksState, 'set'>>(key: K, value: TweaksState[K]) => void
}

/**
 * Tweaks · design.md §1 设计 token 切换中心
 * 持久化到 localStorage,App 启动时同步到 <html data-*>
 */
export const useTweaks = create<TweaksState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'sienna',
      riseFall: 'cn',
      density: 'comfortable',
      appState: 'normal',
      set: (key, value) => set({ [key]: value } as Partial<TweaksState>),
    }),
    { name: 'cs-monitor-tweaks' },
  ),
)
