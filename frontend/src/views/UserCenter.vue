<template>
  <div class="uc">
    <div class="uc__header">
      <h2 class="uc__title">个人中心</h2>
      <p class="uc__desc">管理你的账号信息、密码、SteamDT API Key</p>
    </div>

    <!-- 账号信息 -->
    <section class="glass-card uc__section">
      <h3 class="uc__section-title">
        <UserCircle :size="20" /> 账号信息
      </h3>
      <dl class="uc__kv">
        <div><dt>用户名</dt><dd>{{ auth.user?.username ?? '-' }}</dd></div>
        <div><dt>角色</dt><dd>
          <span class="uc__badge" :class="auth.isAdmin ? 'uc__badge--admin' : 'uc__badge--user'">
            {{ auth.isAdmin ? '管理员' : '普通用户' }}
          </span>
        </dd></div>
        <div><dt>创建时间</dt><dd>{{ fmt(auth.user?.created_at) }}</dd></div>
        <div><dt>上次登录</dt><dd>{{ fmt(auth.user?.last_login_at) }}</dd></div>
      </dl>
    </section>

    <!-- SteamDT API Key -->
    <section class="glass-card uc__section">
      <h3 class="uc__section-title">
        <KeyRound :size="20" /> SteamDT API Key
      </h3>
      <p class="uc__section-desc">
        系统将使用你的个人 Key 调度监控和极致追踪任务。
        Key 经过 Fernet 加密后存于数据库，明文仅在 API 请求瞬间存在。
      </p>
      <div class="uc__row">
        <span v-if="auth.hasSteamdtKey" class="uc__status uc__status--ok">
          <CheckCircle2 :size="16" /> 已配置
        </span>
        <span v-else class="uc__status uc__status--warn">
          <AlertCircle :size="16" /> 未配置
        </span>
      </div>
      <NInput
        v-model:value="apiKey"
        type="password"
        show-password-on="click"
        :placeholder="auth.hasSteamdtKey ? '输入新 Key 以替换' : '输入你的 SteamDT API Key'"
      />
      <div class="uc__actions">
        <button
          v-if="auth.hasSteamdtKey"
          type="button"
          class="btn-outline"
          :disabled="saving"
          @click="onDeleteKey"
        >
          清除 Key
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="saving || !apiKey.trim()"
          @click="onSaveKey"
        >
          {{ saving ? '保存中...' : '保存 Key' }}
        </button>
      </div>
    </section>

    <!-- 修改密码 -->
    <section class="glass-card uc__section">
      <h3 class="uc__section-title">
        <Lock :size="20" /> 修改密码
      </h3>
      <NForm ref="pwdFormRef" :model="pwdForm" :rules="pwdRules">
        <NFormItem path="current_password" label="当前密码">
          <NInput
            v-model:value="pwdForm.current_password"
            type="password"
            show-password-on="click"
            autocomplete="current-password"
          />
        </NFormItem>
        <NFormItem path="new_password" label="新密码（至少 8 位）">
          <NInput
            v-model:value="pwdForm.new_password"
            type="password"
            show-password-on="click"
            autocomplete="new-password"
          />
        </NFormItem>
        <NFormItem path="confirm_password" label="确认新密码">
          <NInput
            v-model:value="pwdForm.confirm_password"
            type="password"
            show-password-on="click"
            autocomplete="new-password"
          />
        </NFormItem>
        <div class="uc__actions">
          <button
            type="button"
            class="btn-primary"
            :disabled="auth.isLoading"
            @click="onChangePassword"
          >
            {{ auth.isLoading ? '提交中...' : '修改密码' }}
          </button>
        </div>
      </NForm>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  useDialog,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { AlertCircle, CheckCircle2, KeyRound, Lock, UserCircle } from 'lucide-vue-next'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toastError, toastSuccess } from '@/composables/useToast'

const auth = useAuthStore()
const dialog = useDialog()

const apiKey = ref('')
const saving = ref(false)

const pwdFormRef = ref<FormInst | null>(null)
const pwdForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const pwdRules: FormRules = {
  current_password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_r, v: string) =>
        !v || v.length >= 8 || new Error('新密码至少 8 位'),
      trigger: 'blur',
    },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_r, v: string) =>
        !v || v === pwdForm.new_password || new Error('两次输入不一致'),
      trigger: 'blur',
    },
  ],
}

function fmt(iso?: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

async function onSaveKey() {
  if (!apiKey.value.trim()) return
  saving.value = true
  try {
    await api.setSteamdtKey(apiKey.value.trim())
    apiKey.value = ''
    await auth.fetchMe()
    toastSuccess('SteamDT API Key 已保存')
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '保存失败'
    toastError(detail)
  } finally {
    saving.value = false
  }
}

function onDeleteKey() {
  dialog.warning({
    title: '清除 SteamDT API Key',
    content: '清除后你的监控、极致追踪任务都将无法运行。确定吗？',
    positiveText: '确认清除',
    negativeText: '取消',
    onPositiveClick: async () => {
      saving.value = true
      try {
        await api.deleteSteamdtKey()
        await auth.fetchMe()
        toastSuccess('已清除 SteamDT API Key')
      } catch {
        toastError('清除失败')
      } finally {
        saving.value = false
      }
    },
  })
}

async function onChangePassword() {
  try {
    await pwdFormRef.value?.validate()
  } catch {
    return
  }
  const result = await auth.changePassword({
    current_password: pwdForm.current_password,
    new_password: pwdForm.new_password,
  })
  if (result.success) {
    toastSuccess('密码已更新')
    pwdForm.current_password = ''
    pwdForm.new_password = ''
    pwdForm.confirm_password = ''
  } else {
    toastError(result.error || '修改失败')
  }
}

onMounted(() => {
  // 进页面时若 user 未刷新，主动拉一次
  if (!auth.user) auth.fetchMe()
})
</script>

<style scoped>
.uc {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 48rem;
  margin: 0 auto;
}

.uc__header h2.uc__title {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
}

html:not(.dark) .uc__header h2.uc__title {
  color: #0f172a;
}

.uc__desc {
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.uc__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.uc__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

html:not(.dark) .uc__section-title {
  color: #0f172a;
}

.uc__section-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.uc__kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.5rem;
  margin: 0;
}

.uc__kv > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.uc__kv dt {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.uc__kv dd {
  margin: 0;
  font-size: 0.95rem;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
}

html:not(.dark) .uc__kv dd {
  color: #1e293b;
}

.uc__badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.025em;
}

.uc__badge--admin {
  background: rgba(99, 102, 241, 0.18);
  color: #818cf8;
}

.uc__badge--user {
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
}

.uc__status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.uc__status--ok {
  color: #22c55e;
}

.uc__status--warn {
  color: #f59e0b;
}

.uc__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.uc__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
