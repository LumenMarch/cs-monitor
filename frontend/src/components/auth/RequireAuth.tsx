import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/endpoints'
import { useAuth } from '@/stores/auth'

/**
 * 路由守卫
 * - 无 token → /login
 * - 有 token 但 fetchMe 401/失败 → 自动 logout(回到 /login)
 * - me.must_change_password === true → 强制 /change-password(只允许在该路由停留)
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

  // 必须改密 → 强制跳改密页(若已在该页则放行,避免死循环)
  if (
    meQuery.data?.must_change_password &&
    location.pathname !== '/change-password'
  ) {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
}
