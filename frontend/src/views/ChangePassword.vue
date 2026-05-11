<template>
  <div class="cp">
    <div class="cp__card glass-card">
      <div class="cp__head">
        <KeyRound :size="24" class="cp__icon" />
        <div>
          <h2 class="cp__title">修改密码</h2>
          <p class="cp__desc">
            {{ auth.requiresPasswordChange
              ? '首次登录请修改默认密码后继续使用'
              : '修改你的账号密码' }}
          </p>
        </div>
      </div>

      <NForm
        ref="formRef"
        :model="formValue"
        :rules="rules"
      >
        <NFormItem path="current_password" label="当前密码">
          <NInput
            v-model:value="formValue.current_password"
            type="password"
            show-password-on="click"
            placeholder="请输入当前密码"
            autocomplete="current-password"
          />
        </NFormItem>
        <NFormItem path="new_password" label="新密码（至少 8 位）">
          <NInput
            v-model:value="formValue.new_password"
            type="password"
            show-password-on="click"
            placeholder="请输入新密码"
            autocomplete="new-password"
          />
        </NFormItem>
        <NFormItem path="confirm_password" label="确认新密码">
          <NInput
            v-model:value="formValue.confirm_password"
            type="password"
            show-password-on="click"
            placeholder="再次输入新密码"
            autocomplete="new-password"
            @keyup.enter="onSubmit"
          />
        </NFormItem>
        <div class="cp__actions">
          <button
            v-if="!auth.requiresPasswordChange"
            type="button"
            class="btn-outline"
            :disabled="auth.isLoading"
            @click="onCancel"
          >
            取消
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="auth.isLoading"
            @click="onSubmit"
          >
            {{ auth.isLoading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </NForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, type FormInst, type FormRules } from 'naive-ui'
import { KeyRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { toastError, toastSuccess } from '@/composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const formRef = ref<FormInst | null>(null)

const formValue = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const rules: FormRules = {
  current_password: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string) =>
        !value || value.length >= 8 || new Error('新密码至少 8 位'),
      trigger: 'blur',
    },
    {
      validator: (_rule, value: string) =>
        !value
        || value !== formValue.current_password
        || new Error('新密码不能与旧密码相同'),
      trigger: 'blur',
    },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string) =>
        !value || value === formValue.new_password || new Error('两次输入不一致'),
      trigger: 'blur',
    },
  ],
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const result = await auth.changePassword({
    current_password: formValue.current_password,
    new_password: formValue.new_password,
  })

  if (!result.success) {
    toastError(result.error || '修改失败')
    return
  }

  toastSuccess('密码已更新')
  router.replace({ name: 'Dashboard' })
}

function onCancel() {
  router.back()
}
</script>

<style scoped>
.cp {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.cp__card {
  width: 100%;
  max-width: 26rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cp__head {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.cp__icon {
  color: #6366f1;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.cp__title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  color: #ffffff;
}

html:not(.dark) .cp__title {
  color: #0f172a;
}

.cp__desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.cp__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
