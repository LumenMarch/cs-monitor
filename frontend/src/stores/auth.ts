/**
 * Auth Store — v2 多用户登录状态管理
 *
 * - 持有 access token / 当前用户信息
 * - 提供 login / logout / fetchMe / changePassword
 * - token 持久化由 api/index.ts 的 localStorage helper 负责
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api, { clearStoredToken, getStoredToken, setStoredToken } from '@/api'
import type { MeResponse } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getStoredToken())
  const user = ref<MeResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const username = computed(() => user.value?.username ?? '')
  const requiresPasswordChange = computed(
    () => !!user.value?.must_change_password,
  )
  const hasSteamdtKey = computed(() => !!user.value?.has_steamdt_key)

  async function login(payload: {
    username: string
    password: string
  }): Promise<{ success: boolean; requiresPasswordChange: boolean }> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.login(payload)
      token.value = data.access_token
      setStoredToken(data.access_token)
      await fetchMe()
      return {
        success: true,
        requiresPasswordChange: data.requires_password_change,
      }
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || '登录失败'
      error.value = detail
      clearStoredToken()
      token.value = null
      user.value = null
      return { success: false, requiresPasswordChange: false }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchMe(): Promise<MeResponse | null> {
    if (!token.value) return null
    try {
      const { data } = await api.me()
      user.value = data
      return data
    } catch {
      user.value = null
      return null
    }
  }

  async function changePassword(payload: {
    current_password: string
    new_password: string
  }): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    try {
      await api.changePassword(payload)
      await fetchMe()
      return { success: true }
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || '改密失败'
      return { success: false, error: detail }
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    clearStoredToken()
    token.value = null
    user.value = null
  }

  /** 应用启动时：若 localStorage 有 token，拉一次 me 校验 */
  async function initFromStorage(): Promise<void> {
    if (!token.value) return
    await fetchMe()
  }

  return {
    token,
    user,
    isLoading,
    error,
    isLoggedIn,
    isAdmin,
    username,
    requiresPasswordChange,
    hasSteamdtKey,
    login,
    fetchMe,
    changePassword,
    logout,
    initFromStorage,
  }
})
