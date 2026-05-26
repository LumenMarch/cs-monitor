import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/endpoints'
import { useAuth } from '@/stores/auth'

/**
 * 路由守卫:无 token → 跳 /login
 * 有 token 时拉一次 /auth/me 同步用户信息(随路由变化失效则自动登出)
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, setUser, logout } = useAuth()
  const location = useLocation()

  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data)
  }, [meQuery.data, setUser])

  useEffect(() => {
    if (meQuery.isError) logout()
  }, [meQuery.isError, logout])

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 等首次 me 拉到结果再渲染子树,避免闪烁
  if (meQuery.isLoading && !meQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="font-mono text-[11.5px] tracking-[0.18em] uppercase text-[var(--muted)]">
          Authenticating…
        </div>
      </div>
    )
  }

  return <>{children}</>
}
