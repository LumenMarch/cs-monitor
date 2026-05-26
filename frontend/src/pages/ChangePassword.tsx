import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { fetchMe } from '@/api/endpoints'
import { useAuth } from '@/stores/auth'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'

/**
 * /change-password · 强制改密落地页
 * 触发条件:fetchMe.must_change_password === true(由 RequireAuth 守卫)
 * 成功后:刷新 me → must_change 应为 false → navigate /dashboard
 */
export default function ChangePassword() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuth((s) => s.user)
  const forced = !!user?.must_change_password

  async function onSuccess() {
    // 拉一次新的 me · 后端改密会清掉 must_change_password
    try {
      const me = await fetchMe()
      useAuth.getState().setUser(me)
    } catch {
      /* ignore */
    }
    queryClient.invalidateQueries({ queryKey: ['me'] })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div
      className="min-h-screen grid"
      style={{ gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }}
    >
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
          {forced ? (
            <>
              First sign-in —<br />
              please <em className="italic text-[var(--accent)]">rotate</em> the default password.
            </>
          ) : (
            <>
              A new password is <em className="italic text-[var(--accent)]">a new front door.</em>
            </>
          )}
        </blockquote>

        <div className="font-mono text-[10.5px] text-[var(--muted)] tracking-[0.12em]">
          {user ? `signed in as ${user.username}` : 'session'}
        </div>

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
        <div className="w-full max-w-[400px]">
          {forced && (
            <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/30 rounded-[3px] px-3 py-2 mb-5">
              管理员要求首次登录后修改密码,改完才能进入其他页面。
            </div>
          )}
          <ChangePasswordForm onSuccess={onSuccess} />
          {!forced && (
            <div className="mt-5 text-[12px] text-[var(--muted)]">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="font-mono tracking-[0.1em] uppercase text-[var(--muted)] hover:text-[var(--ink)]"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
