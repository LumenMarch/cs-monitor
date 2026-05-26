import { create } from 'zustand'
import { clearToken as clearStoredToken, getToken, setToken as setStoredToken } from '@/api/client'
import type { MeResponse } from '@/api/types'

interface AuthState {
  token: string | null
  user: MeResponse | null
  /** 登录成功后调用,持久化 token 并设置用户 */
  setSession: (token: string, user?: MeResponse | null) => void
  setUser: (user: MeResponse | null) => void
  logout: () => void
}

/**
 * 鉴权 store · token + 当前用户
 * token 持久化由 api/client(localStorage cs-monitor-token)统一管理,
 * 用户信息每次启动 fetchMe 重新拉取,不入 store 持久化
 */
export const useAuth = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  setSession: (token, user = null) => {
    setStoredToken(token)
    set({ token, user })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    clearStoredToken()
    set({ token: null, user: null })
  },
}))
