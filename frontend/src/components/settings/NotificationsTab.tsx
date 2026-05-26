import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/api/client'
import {
  fetchNotifySettings,
  testNotify,
  updateNotifySettings,
} from '@/api/endpoints'
import type { NotifySettings } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Input } from './Input'
import { SegmentedControl } from './SegmentedControl'
import { SettingRow } from './SettingRow'
import { useAuth } from '@/stores/auth'

type Channel = 'wecom' | 'telegram' | 'serverchan'

const EMPTY: NotifySettings = {
  notify_channel: 'wecom',
  wecom_webhook_url: '',
  telegram_bot_token: '',
  telegram_chat_id: '',
  serverchan_sendkey: '',
}

/**
 * Notifications tab · 接 /api/settings/notify
 * - admin-only:非 admin 显示提示
 * - GET 拉值 → PUT 保存 → POST /test 发测试
 */
export function NotificationsTab() {
  const user = useAuth((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notify-settings'],
    queryFn: fetchNotifySettings,
    enabled: isAdmin,
  })

  const [form, setForm] = useState<NotifySettings>(EMPTY)
  const [testMsg, setTestMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (query.data) setForm(query.data)
  }, [query.data])

  const saveMut = useMutation({
    mutationFn: (payload: NotifySettings) => updateNotifySettings(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notify-settings'] }),
  })

  const testMut = useMutation({
    mutationFn: (channel: Channel) => testNotify({ channel }),
    onSuccess: () => setTestMsg({ kind: 'ok', text: '测试通知已发送,请到目标渠道查收' }),
    onError: (err) => setTestMsg({ kind: 'err', text: apiErrorMessage(err) }),
  })

  if (!isAdmin) {
    return (
      <div className="py-[40px] text-center">
        <div className="font-serif text-[20px] mb-2">需要管理员权限</div>
        <p className="text-[var(--muted)] text-[13px]">通知渠道为全局共享配置,仅管理员账户可修改。</p>
      </div>
    )
  }

  if (query.isLoading) {
    return <div className="font-mono text-[11px] text-[var(--muted)] py-6">Loading…</div>
  }

  if (query.isError) {
    return (
      <div className="font-mono text-[11px] text-[var(--down)] py-6">
        Failed to load · {apiErrorMessage(query.error)}
      </div>
    )
  }

  const channel = (form.notify_channel as Channel) || 'wecom'
  const dirty = JSON.stringify(form) !== JSON.stringify(query.data)

  return (
    <div>
      <SettingRow
        title="Default channel"
        description="新告警优先走该渠道。其他渠道仍可独立测试。"
        control={
          <SegmentedControl<Channel>
            value={channel}
            options={[
              { value: 'wecom', label: 'WeCom' },
              { value: 'telegram', label: 'Telegram' },
              { value: 'serverchan', label: 'Server酱' },
            ]}
            onChange={(v) => setForm((f) => ({ ...f, notify_channel: v }))}
          />
        }
      />

      <SettingRow
        align="stretch"
        title="WeCom webhook URL"
        description="企业微信机器人 webhook,格式 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…"
        control={
          <div className="flex flex-col gap-2 min-w-[260px]">
            <Input
              mono
              type="text"
              placeholder="https://qyapi.weixin.qq.com/…"
              value={form.wecom_webhook_url}
              onChange={(e) => setForm((f) => ({ ...f, wecom_webhook_url: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => testMut.mutate('wecom')}
              disabled={testMut.isPending || !form.wecom_webhook_url}
              className="self-end font-mono text-[10.5px] tracking-[0.1em] uppercase text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {testMut.isPending && testMut.variables === 'wecom' ? 'Testing…' : 'Send test →'}
            </button>
          </div>
        }
      />

      <SettingRow
        align="stretch"
        title="Telegram bot"
        description="Bot Token + Chat ID(BotFather 拿 token;给 bot 发一条消息后 getUpdates 拿 chat_id)"
        control={
          <div className="flex flex-col gap-2 min-w-[260px]">
            <Input
              mono
              type="text"
              placeholder="bot token"
              value={form.telegram_bot_token}
              onChange={(e) => setForm((f) => ({ ...f, telegram_bot_token: e.target.value }))}
            />
            <Input
              mono
              type="text"
              placeholder="chat id"
              value={form.telegram_chat_id}
              onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => testMut.mutate('telegram')}
              disabled={
                testMut.isPending || !form.telegram_bot_token || !form.telegram_chat_id
              }
              className="self-end font-mono text-[10.5px] tracking-[0.1em] uppercase text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {testMut.isPending && testMut.variables === 'telegram' ? 'Testing…' : 'Send test →'}
            </button>
          </div>
        }
      />

      <SettingRow
        align="stretch"
        title="Server酱 SendKey"
        description="可选回落渠道。https://sct.ftqq.com/ 申请。"
        control={
          <div className="flex flex-col gap-2 min-w-[260px]">
            <Input
              mono
              type="text"
              placeholder="SCT… SendKey"
              value={form.serverchan_sendkey}
              onChange={(e) => setForm((f) => ({ ...f, serverchan_sendkey: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => testMut.mutate('serverchan')}
              disabled={testMut.isPending || !form.serverchan_sendkey}
              className="self-end font-mono text-[10.5px] tracking-[0.1em] uppercase text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {testMut.isPending && testMut.variables === 'serverchan' ? 'Testing…' : 'Send test →'}
            </button>
          </div>
        }
      />

      <SettingRow
        title="Quiet hours"
        description="目前免打扰窗口在每条极致追踪配置内单独设置(详见 Extreme Track),没有全局值。"
        control={
          <div className="font-mono text-[12px] text-[var(--muted)]">per-tracker</div>
        }
      />

      {/* Save bar */}
      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="primary"
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate(form)}
        >
          {saveMut.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {dirty && !saveMut.isPending && (
          <Button variant="ghost" onClick={() => query.data && setForm(query.data)}>
            Discard
          </Button>
        )}
        {saveMut.isSuccess && !dirty && (
          <span className="font-mono text-[11px] text-[var(--up)]">✓ Saved</span>
        )}
        {saveMut.isError && (
          <span className="font-mono text-[11px] text-[var(--down)]">
            {apiErrorMessage(saveMut.error)}
          </span>
        )}
        {testMsg && (
          <span
            className={`font-mono text-[11px] ${
              testMsg.kind === 'ok' ? 'text-[var(--up)]' : 'text-[var(--down)]'
            }`}
          >
            {testMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
