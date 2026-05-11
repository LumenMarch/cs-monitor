import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import 'virtual:uno.css'
import '@/styles/global.css'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(naive)

// 启动时若本地存有 token，先拉一次 me 校验
const auth = useAuthStore()
auth.initFromStorage().finally(() => {
  app.mount('#app')
})
