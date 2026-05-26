import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { apiErrorMessage } from '@/api/client'
import { changePassword } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/settings/Input'

interface Props {
  /** 改密成功后回调(供页面 / 弹层使用) */
  onSuccess?: () => void
  /** 隐藏顶部标题(供 Settings tab 内嵌使用) */
  hideHeading?: boolean
}

/**
 * 改密表单 · POST /auth/change-password
 * - 字段:current / new / confirm,各支持 Show/Hide
 * - 前端校验:new ≥ 8 / new ≠ current / confirm == new
 * - 提交成功显示 inline 状态,onSuccess 由调用方处理后续(跳转 / 提示)
 */
export function ChangePasswordForm({ onSuccess, hideHeading = false }: Props) {
  const queryClient = useQueryClient()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNext, setShowNext] = useState(false)

  const validation = useMemo(() => {
    if (!cur || !next || !confirm) return 'incomplete'
    if (next.length < 8) return 'new password must be at least 8 characters'
    if (next === cur) return 'new password must differ from current'
    if (next !== confirm) return 'confirmation does not match new password'
    return null
  }, [cur, next, confirm])

  const mut = useMutation({
    mutationFn: () =>
      changePassword({ current_password: cur, new_password: next }),
    onSuccess: () => {
      setCur('')
      setNext('')
      setConfirm('')
      // 让 RequireAuth 拉到最新的 must_change_password 状态
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onSuccess?.()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (validation && validation !== 'incomplete') return
    if (!cur || !next || !confirm) return
    mut.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full max-w-[400px]">
      {!hideHeading && (
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            Change password
          </div>
          <h1 className="font-serif font-normal text-[36px] leading-[1.05] tracking-[-0.015em] m-0">
            Pick a <em className="italic text-[var(--accent)]">new password</em>.
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-2">
            最少 8 位字符。建议混用大小写 + 数字 + 符号。
          </p>
        </div>
      )}

      <PwdField
        label="Current password"
        value={cur}
        onChange={setCur}
        show={showCur}
        toggleShow={() => setShowCur((v) => !v)}
        autoComplete="current-password"
      />
      <PwdField
        label="New password"
        value={next}
        onChange={setNext}
        show={showNext}
        toggleShow={() => setShowNext((v) => !v)}
        autoComplete="new-password"
      />
      <PwdField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        show={showNext}
        autoComplete="new-password"
      />

      {validation && validation !== 'incomplete' && (
        <div className="font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-3 py-2">
          {validation}
        </div>
      )}

      {mut.isError && (
        <div className="font-mono text-[11.5px] text-[var(--down)] bg-[var(--down-bg)] border border-[var(--down)]/20 rounded-[3px] px-3 py-2">
          {apiErrorMessage(mut.error)}
        </div>
      )}

      {mut.isSuccess && (
        <div className="font-mono text-[11.5px] text-[var(--up)] bg-[var(--up-bg)] border border-[var(--up)]/20 rounded-[3px] px-3 py-2">
          ✓ Password changed
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={mut.isPending || validation !== null}
        className="justify-center mt-1"
      >
        {mut.isPending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  )
}

function PwdField({
  label,
  value,
  onChange,
  show,
  toggleShow,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  toggleShow?: () => void
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] flex justify-between">
        <span>{label}</span>
        {toggleShow && (
          <button
            type="button"
            onClick={toggleShow}
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1"
          >
            {show ? <EyeOff size={11} /> : <Eye size={11} />}
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </label>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
    </div>
  )
}
