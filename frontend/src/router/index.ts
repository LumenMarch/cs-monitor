import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useNProgress } from '@/composables/useNProgress'
import { toastError } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const { start, done } = useNProgress()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 公开路由（不需要登录）
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    // 强制改密专属页：需要登录但允许 must_change_password
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('@/views/ChangePassword.vue'),
      meta: { requiresAuth: true, allowMustChange: true },
    },
    // 主应用（需要登录 + 已改密）
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'watchlist',
          name: 'Watchlist',
          component: () => import('@/views/Watchlist.vue'),
        },
        {
          path: 'item/:name',
          name: 'ItemDetail',
          component: () => import('@/views/ItemDetail.vue'),
        },
        {
          path: 'extreme-track',
          name: 'ExtremeTrack',
          component: () => import('@/views/ExtremeTrack.vue'),
        },
        {
          path: 'alerts',
          name: 'Alerts',
          component: () => import('@/views/Alerts.vue'),
        },
        {
          path: 'stats',
          name: 'Stats',
          component: () => import('@/views/StatsView.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/Settings.vue'),
        },
        {
          path: 'user-center',
          name: 'UserCenter',
          component: () => import('@/views/UserCenter.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
  ],
})

// 全局守卫：进度条 + 认证 + 强制改密 + 管理员权限
router.beforeEach(async (to, _from, next) => {
  start()
  const auth = useAuthStore()

  // 启动时如果本地有 token 但还没拉 me，先拉一次
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchMe()
  }

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const isPublic = to.matched.some((r) => r.meta.public)
  const allowMustChange = to.meta.allowMustChange === true
  const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)

  // 1) 公开路由直接通过；但已登录访问 /login 重定向到首页
  if (isPublic) {
    if (to.name === 'Login' && auth.isLoggedIn) {
      return next({ name: 'Dashboard' })
    }
    return next()
  }

  // 2) 需要认证但未登录 → 跳 /login
  if (requiresAuth && !auth.isLoggedIn) {
    return next({
      name: 'Login',
      query: { next: to.fullPath },
    })
  }

  // 3) 已登录但未拿到 user（fetchMe 失败/token 失效）→ 重新登录
  if (requiresAuth && auth.isLoggedIn && !auth.user) {
    auth.logout()
    return next({ name: 'Login', query: { next: to.fullPath } })
  }

  // 4) 必须改密但去的不是改密页 → 强制跳转
  if (
    auth.requiresPasswordChange
    && !allowMustChange
    && to.name !== 'Login'
  ) {
    return next({ name: 'ChangePassword' })
  }

  // 5) 已改密了又去访问改密页 → 跳回首页
  if (
    !auth.requiresPasswordChange
    && to.name === 'ChangePassword'
  ) {
    return next({ name: 'Dashboard' })
  }

  // 6) 管理员页面权限
  if (requiresAdmin && !auth.isAdmin) {
    return next({ name: 'Dashboard' })
  }

  next()
})

router.afterEach(() => {
  done()
})

router.onError((err) => {
  done()
  toastError(`页面加载失败：${err.message}`)
  console.error('[Router] 导航错误:', err)
})

export default router
