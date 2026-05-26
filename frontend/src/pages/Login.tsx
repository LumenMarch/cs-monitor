import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { fetchMe, login } from '@/api/endpoints'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/settings/Input'

/**
 * Login · design.md(login 全屏 / mobile)
 * 左栏品牌引文 + 右栏表单 · 衬线大字 Welcome back.
 */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, setSession } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 已登录直接跳走
  if (token) {
    const to = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={to} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await login({ username, password })
      // 保存 token,然后异步拉 me(失败也不阻断)
      setSession(res.access_token)
      try {
        const me = await fetchMe()
        useAuth.getState().setUser(me)
      } catch {
        /* ignore */
      }
      const to = (location.state as { from?: string } | null)?.from ?? '/dashboard'
      navigate(to, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, '登录失败,请重试'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }}>
      {/* —— Left brand panel —— */}
      <aside className="hidden md:flex flex-col justify-between bg-[var(--paper)] border-r border-[var(--hairline)] px-12 py-10 relative overflow-hidden">
        <div>
          <div className="font-serif italic text-[36px] leading-none text-[var(--ink)] tracking-[-0.02em]">
            CS Monitor
            <span className="not-italic text-[var(--accent)] ml-1">·</span>
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mt-2">
            Editorial Trading Terminal · v3.1
          </div>
        </div>

        <blockquote className="font-serif text-[var(--ink)] text-[34px] leading-[1.25] tracking-[-0.005em] max-w-[28ch]">
          A book that <em className="italic text-[var(--accent)]">checks its own pulse</em> —<br />
          self-hosted, single-tenant, your data on your machine.
        </blockquote>

        <div className="font-mono text-[10.5px] text-[var(--muted)] tracking-[0.12em]">
          cs-monitor.local · MIT licensed
        </div>

        {/* Diagonal stripes decoration */}
        <div
          aria-hidden
          className="absolute -bottom-12 -right-20 w-[260px] h-[260px] rounded-full opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-42deg, transparent 0, transparent 6px, var(--ink) 6px, var(--ink) 7px)',
          }}
        />
      </aside>

      {/* —— Right form —— */}
      <main className="flex items-center justify-center px-8 py-12 bg-[var(--bg)]">
        <form onSubmit={onSubmit} className="w-full max-w-[400px] flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
              Sign in
            </div>
            <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
              Welcome back.
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-2">
              Single-user instance. Use your admin credentials from <code className="font-mono text-[11.5px]">.env</code>.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="admin"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] flex justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1"
              >
                {showPwd ? <EyeOff size={11} /> : <Eye size={11} />}
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </label>
            <Input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={submitting} className="justify-center mt-1">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="text-[12px] text-[var(--muted)] mt-2">
            Forgot password? Reset via{' '}
            <code className="font-mono text-[11px]">scripts/manage_users.py</code> on the host.
          </div>
        </form>
      </main>
    </div>
  )
}
