<template>
  <div class="login">
    <div class="login__card glass-card">
      <div class="login__brand">
        <div class="login__logo">
          <Radar :size="28" />
        </div>
        <h1 class="login__title">CS2 Monitor</h1>
        <p class="login__subtitle">多用户监控 · 捡漏雷达</p>
      </div>

      <NForm
        ref="formRef"
        :model="formValue"
        :rules="rules"
        @submit.prevent="onSubmit"
      >
        <NFormItem path="username" label="用户名">
          <NInput
            v-model:value="formValue.username"
            placeholder="请输入用户名"
            :disabled="auth.isLoading"
            autocomplete="username"
            @keyup.enter="onSubmit"
          />
        </NFormItem>
        <NFormItem path="password" label="密码">
          <NInput
            v-model:value="formValue.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            :disabled="auth.isLoading"
            autocomplete="current-password"
            @keyup.enter="onSubmit"
          />
        </NFormItem>
        <div v-if="auth.error" class="login__error">
          {{ auth.error }}
        </div>
        <button
          type="submit"
          class="btn-primary login__submit"
          :disabled="auth.isLoading"
        >
          <LogIn :size="16" />
          {{ auth.isLoading ? '登录中...' : '登录' }}
        </button>
      </NForm>

      <p class="login__hint">
        首次部署后默认账号：<code>admin</code> / 密码来自
        <code>.env</code> 的 <code>ADMIN_INITIAL_PASSWORD</code>，首次登录后将强制改密
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, type FormInst, type FormRules } from 'naive-ui'
import { LogIn, Radar } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { toastError, toastSuccess } from '@/composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const formRef = ref<FormInst | null>(null)

const formValue = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const result = await auth.login({
    username: formValue.username.trim(),
    password: formValue.password,
  })

  if (!result.success) {
    toastError(auth.error || '登录失败')
    return
  }

  toastSuccess(`欢迎回来，${auth.username}`)

  // 若需要改密，强制跳改密页
  if (result.requiresPasswordChange) {
    router.replace({ name: 'ChangePassword' })
    return
  }

  // 否则跳 next 参数或首页
  const next = (route.query.next as string) || '/'
  router.replace(next)
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.12) 0, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.08) 0, transparent 50%),
    #050505;
}

html:not(.dark) .login {
  background:
    radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0, transparent 50%),
    #f8fafc;
}

.login__card {
  width: 100%;
  max-width: 24rem;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.login__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 0.5rem;
}

.login__logo {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border-radius: 0.75rem;
  color: #fff;
  margin-bottom: 0.75rem;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
}

.login__title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
}

html:not(.dark) .login__title {
  color: #0f172a;
}

.login__subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.login__error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.login__submit {
  width: 100%;
  margin-top: 0.25rem;
}

.login__submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login__hint {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}

.login__hint code {
  background: rgba(99, 102, 241, 0.12);
  color: #818cf8;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
}
</style>
