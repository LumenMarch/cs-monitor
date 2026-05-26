import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * Axios 实例 · 走 vite proxy → 后端 FastAPI 127.0.0.1:8000
 * - 请求拦截器:自动注入 Authorization Bearer
 * - 响应拦截器:401 自动清 token + 重定向到 /login
 */
const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

const TOKEN_KEY = 'cs-monitor-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 仅清 token,不强制跳转;由 RequireAuth 守卫处理
      clearToken()
    }
    return Promise.reject(error)
  },
)

export interface ApiErrorBody {
  detail?: string
}

/** 把 axios error 标准化为更易展示的消息 */
export function apiErrorMessage(err: unknown, fallback = '请求失败'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined
    if (data?.detail) return data.detail
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

export default client
