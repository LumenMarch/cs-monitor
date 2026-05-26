import { useState } from 'react'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { useAuth } from '@/stores/auth'
import { SettingRow } from './SettingRow'

/**
 * Security tab · 主动改密
 * - 显示当前账号 + 上次登录
 * - 内置 ChangePasswordForm 表单
 */
export function SecurityTab() {
  const user = useAuth((s) => s.user)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function fmtTime(s?: string) {
    if (!s) return '—'
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return (
    <div>
      <SettingRow
        title="Account"
        description="当前登录账号 · 由管理员通过 scripts/manage_users.py 维护。"
        control={
          <div className="font-mono text-[13px] text-[var(--ink)]">
            {user?.username ?? '—'}
            {user?.role && (
              <span className="ml-2 text-[10.5px] tracking-[0.14em] uppercase text-[var(--muted)]">
                {user.role}
              </span>
            )}
          </div>
        }
      />
      <SettingRow
        title="Last sign-in"
        description="距上次登录时间。"
        control={
          <div className="font-mono text-[12.5px] text-[var(--muted)]">
            {fmtTime(user?.last_login_at)}
          </div>
        }
      />

      <div className="py-5">
        <h3 className="text-[14px] font-medium m-0 mb-1">Change password</h3>
        <p className="text-[12.5px] text-[var(--muted)] m-0 mb-4 max-w-[60ch] leading-[1.5]">
          至少 8 位字符。建议混用大小写 + 数字 + 符号。修改成功后当前会话不会退出,但同账号其他会话需重新登录。
        </p>
        <ChangePasswordForm
          hideHeading
          onSuccess={() => setSavedAt(new Date().toLocaleTimeString())}
        />
        {savedAt && (
          <div className="mt-3 font-mono text-[11px] text-[var(--up)]">
            ✓ Saved at {savedAt}
          </div>
        )}
      </div>
    </div>
  )
}
