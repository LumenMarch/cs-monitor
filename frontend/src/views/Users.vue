<template>
  <div class="users">
    <div class="users__header">
      <div>
        <h2 class="users__title">用户管理</h2>
        <p class="users__desc">仅管理员可见 · 管理所有账号的权限、密码与 SteamDT Key</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <UserPlus :size="16" /> 新建用户
      </button>
    </div>

    <div class="glass-card users__filter">
      <label class="users__check">
        <input v-model="includeInactive" type="checkbox" @change="reload" />
        <span>显示已停用账号</span>
      </label>
      <button class="btn-outline users__refresh" @click="reload">
        <RefreshCw :size="14" /> 刷新
      </button>
    </div>

    <div class="glass-card users__table-wrap">
      <table class="users__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>角色</th>
            <th>状态</th>
            <th>SteamDT Key</th>
            <th>需改密</th>
            <th>创建时间</th>
            <th>上次登录</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="users__loading">加载中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="9" class="users__empty">暂无用户</td>
          </tr>
          <tr v-for="u in rows" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>
              <span class="badge" :class="u.role === 'admin' ? 'badge--admin' : 'badge--user'">
                {{ u.role === 'admin' ? '管理员' : '普通用户' }}
              </span>
            </td>
            <td>
              <span class="dot" :class="u.is_active ? 'dot--ok' : 'dot--off'" />
              {{ u.is_active ? '启用' : '已停用' }}
            </td>
            <td>
              <span :class="u.has_steamdt_key ? 'val--ok' : 'val--off'">
                {{ u.has_steamdt_key ? '✓' : '—' }}
              </span>
            </td>
            <td>{{ u.must_change_password ? '是' : '否' }}</td>
            <td class="mono">{{ fmt(u.created_at) }}</td>
            <td class="mono">{{ fmt(u.last_login_at) }}</td>
            <td class="users__actions">
              <button class="btn-mini" :disabled="u.id === auth.user?.id" @click="onToggleRole(u)">
                {{ u.role === 'admin' ? '降为用户' : '提为管理员' }}
              </button>
              <button class="btn-mini" :disabled="u.id === auth.user?.id" @click="onToggleActive(u)">
                {{ u.is_active ? '停用' : '启用' }}
              </button>
              <button class="btn-mini" @click="onResetPassword(u)">重置密码</button>
              <button class="btn-mini btn-mini--danger" :disabled="u.id === auth.user?.id" @click="onDelete(u)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新建用户对话框 -->
    <NModal v-model:show="createVisible" preset="card" title="新建用户" style="max-width: 28rem">
      <NForm ref="createFormRef" :model="createForm" :rules="createRules">
        <NFormItem path="username" label="用户名">
          <NInput v-model:value="createForm.username" placeholder="3-64 个字符" />
        </NFormItem>
        <NFormItem path="password" label="初始密码">
          <NInput
            v-model:value="createForm.password"
            type="password"
            show-password-on="click"
            placeholder="至少 8 位"
          />
        </NFormItem>
        <NFormItem path="role" label="角色">
          <NSelect
            v-model:value="createForm.role"
            :options="[
              { label: '普通用户', value: 'user' },
              { label: '管理员', value: 'admin' },
            ]"
          />
        </NFormItem>
        <NFormItem>
          <label class="users__check">
            <input v-model="createForm.must_change_password" type="checkbox" />
            <span>首次登录强制改密</span>
          </label>
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="users__modal-actions">
          <button class="btn-outline" @click="createVisible = false">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="onCreate">
            {{ submitting ? '创建中...' : '创建' }}
          </button>
        </div>
      </template>
    </NModal>

    <!-- 重置密码对话框 -->
    <NModal v-model:show="resetVisible" preset="card" :title="`重置 ${resetTarget?.username ?? ''} 的密码`" style="max-width: 26rem">
      <NForm ref="resetFormRef" :model="resetForm" :rules="resetRules">
        <NFormItem path="new_password" label="新密码（至少 8 位）">
          <NInput
            v-model:value="resetForm.new_password"
            type="password"
            show-password-on="click"
          />
        </NFormItem>
        <NFormItem>
          <label class="users__check">
            <input v-model="resetForm.must_change_password" type="checkbox" />
            <span>下次登录强制改密</span>
          </label>
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="users__modal-actions">
          <button class="btn-outline" @click="resetVisible = false">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="onConfirmReset">
            {{ submitting ? '提交中...' : '重置' }}
          </button>
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useDialog,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { RefreshCw, UserPlus } from 'lucide-vue-next'
import api, { type UserResponse } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toastError, toastSuccess } from '@/composables/useToast'

const auth = useAuthStore()
const dialog = useDialog()

const rows = ref<UserResponse[]>([])
const loading = ref(false)
const includeInactive = ref(false)
const submitting = ref(false)

// 新建
const createVisible = ref(false)
const createFormRef = ref<FormInst | null>(null)
const createForm = reactive({
  username: '',
  password: '',
  role: 'user' as 'admin' | 'user',
  must_change_password: true,
})
const createRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      validator: (_r, v: string) =>
        !v
        || (v.length >= 3 && v.length <= 64)
        || new Error('用户名长度 3-64'),
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    {
      validator: (_r, v: string) =>
        !v || v.length >= 8 || new Error('密码至少 8 位'),
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// 重置密码
const resetVisible = ref(false)
const resetTarget = ref<UserResponse | null>(null)
const resetFormRef = ref<FormInst | null>(null)
const resetForm = reactive({
  new_password: '',
  must_change_password: true,
})
const resetRules: FormRules = {
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_r, v: string) =>
        !v || v.length >= 8 || new Error('密码至少 8 位'),
      trigger: 'blur',
    },
  ],
}

function fmt(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}

async function reload() {
  loading.value = true
  try {
    const { data } = await api.listUsers(includeInactive.value)
    rows.value = data
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '加载失败'
    toastError(detail)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createForm.username = ''
  createForm.password = ''
  createForm.role = 'user'
  createForm.must_change_password = true
  createVisible.value = true
}

async function onCreate() {
  try {
    await createFormRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await api.createUser({ ...createForm })
    toastSuccess(`已创建用户 ${createForm.username}`)
    createVisible.value = false
    await reload()
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '创建失败'
    toastError(detail)
  } finally {
    submitting.value = false
  }
}

async function onToggleRole(u: UserResponse) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  try {
    await api.updateUser(u.id, { role: newRole })
    toastSuccess(`${u.username} 角色已切换为 ${newRole}`)
    await reload()
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '操作失败'
    toastError(detail)
  }
}

async function onToggleActive(u: UserResponse) {
  try {
    await api.updateUser(u.id, { is_active: !u.is_active })
    toastSuccess(`${u.username} 已${u.is_active ? '停用' : '启用'}`)
    await reload()
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '操作失败'
    toastError(detail)
  }
}

function onResetPassword(u: UserResponse) {
  resetTarget.value = u
  resetForm.new_password = ''
  resetForm.must_change_password = true
  resetVisible.value = true
}

async function onConfirmReset() {
  try {
    await resetFormRef.value?.validate()
  } catch {
    return
  }
  if (!resetTarget.value) return
  submitting.value = true
  try {
    await api.resetUserPassword(resetTarget.value.id, { ...resetForm })
    toastSuccess(`已重置 ${resetTarget.value.username} 的密码`)
    resetVisible.value = false
    await reload()
  } catch (e: unknown) {
    const detail =
      (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || '重置失败'
    toastError(detail)
  } finally {
    submitting.value = false
  }
}

function onDelete(u: UserResponse) {
  dialog.warning({
    title: `删除用户 ${u.username}`,
    content: '此操作将级联清空该用户的 watchlist / 告警 / 极致追踪等全部数据，不可恢复。确定继续吗？',
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.deleteUser(u.id)
        toastSuccess(`已删除 ${u.username}`)
        await reload()
      } catch (e: unknown) {
        const detail =
          (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          || '删除失败'
        toastError(detail)
      }
    },
  })
}

onMounted(reload)
</script>

<style scoped>
.users {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin: 0 auto;
}

.users__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.users__title {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
}

html:not(.dark) .users__title {
  color: #0f172a;
}

.users__desc {
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.users__filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
}

.users__check {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #94a3b8;
}

.users__check input[type='checkbox'] {
  accent-color: #6366f1;
}

.users__refresh {
  padding: 0.375rem 0.75rem;
}

.users__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.users__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.users__table th,
.users__table td {
  padding: 0.625rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(31, 31, 35, 0.6);
  vertical-align: middle;
}

html:not(.dark) .users__table th,
html:not(.dark) .users__table td {
  border-bottom-color: #e2e8f0;
}

.users__table th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
  background: rgba(15, 15, 18, 0.4);
}

html:not(.dark) .users__table th {
  background: #f8fafc;
}

.users__table td {
  color: #e2e8f0;
}

html:not(.dark) .users__table td {
  color: #1e293b;
}

.users__table tbody tr:hover {
  background: rgba(99, 102, 241, 0.04);
}

.users__loading,
.users__empty {
  text-align: center;
  padding: 2rem 1rem !important;
  color: #64748b;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.025em;
}

.badge--admin {
  background: rgba(99, 102, 241, 0.18);
  color: #818cf8;
}

.badge--user {
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
}

.dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.375rem;
}

.dot--ok {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.dot--off {
  background: #64748b;
}

.val--ok {
  color: #22c55e;
  font-weight: 700;
}

.val--off {
  color: #64748b;
}

.users__actions {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.btn-mini {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: #818cf8;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 150ms;
}

.btn-mini:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.18);
  border-color: rgba(99, 102, 241, 0.5);
}

.btn-mini:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-mini--danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.btn-mini--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.5);
}

.users__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
