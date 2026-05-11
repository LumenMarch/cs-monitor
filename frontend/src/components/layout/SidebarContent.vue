<template>
  <div class="sidebar-content" :class="{ 'sidebar-content--collapsed': collapsed }">
    <!-- Logo 区 -->
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo__icon" aria-hidden="true">
          <Radar class="w-5 h-5 text-white" />
        </div>
        <div class="sidebar-logo__text">
          <h1 class="sidebar-logo__title">Skin<span class="text-brand">Radar</span></h1>
          <p class="sidebar-logo__subtitle">CS Trading Radar</p>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <button
        v-for="item in menuItems"
        :key="item.id"
        :class="activeKey === item.id ? 'nav-item-active' : 'nav-item'"
        :aria-label="item.label"
        type="button"
        @click="navigate(item.id)"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span class="sidebar-nav__label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 底部区域 -->
    <div class="sidebar-footer">
      <button class="nav-item sidebar-help-btn" type="button" aria-label="帮助中心">
        <HelpCircle class="w-5 h-5 shrink-0" />
        <span class="sidebar-nav__label">帮助中心</span>
      </button>
      <div class="sidebar-divider" />
      <div class="sidebar-status">
        <div class="sidebar-status__label">Radar Link</div>
        <div class="sidebar-status__row">
          <div class="sidebar-status__dot" />
          <span class="sidebar-status__text">API 已连接</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ListOrdered,
  Zap,
  Bell,
  LineChart,
  Settings,
  HelpCircle,
  UserCog,
  Radar,
  Users as UsersIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const emit = defineEmits<{ (e: 'navigate'): void }>()

defineProps<{
  collapsed: boolean
}>()

const activeKey = computed(() => route.name as string)

const menuItems = computed(() => {
  const base: Array<{ id: string; label: string; icon: any }> = [
    { id: 'Dashboard', label: '雷达指挥台', icon: LayoutDashboard },
    { id: 'Watchlist', label: '监控清单', icon: ListOrdered },
    { id: 'ExtremeTrack', label: '高频追踪', icon: Zap },
    { id: 'Bargain', label: '跨市差价', icon: Radar },
    { id: 'Alerts', label: '历史告警', icon: Bell },
    { id: 'Stats', label: '数据分析', icon: LineChart },
    { id: 'Settings', label: '系统设置', icon: Settings },
    { id: 'UserCenter', label: '个人中心', icon: UserCog },
  ]
  if (auth.isAdmin) {
    base.push({ id: 'Users', label: '用户管理', icon: UsersIcon })
  }
  return base
})

function navigate(name: string) {
  router.push({ name })
  emit('navigate')
}
</script>

<style scoped>
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  height: 4.75rem;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-logo__icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #6366f1, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 24px rgba(34, 197, 94, 0.14);
}

.sidebar-logo__title {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0;
  color: #ffffff;
  margin: 0;
}

.text-brand {
  color: #6366f1;
}

.sidebar-logo__subtitle {
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-footer {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-help-btn {
  width: 100%;
}

.sidebar-divider {
  height: 1px;
  background: #242832;
  margin: 0 0.5rem;
}

.sidebar-status {
  padding: 1rem 0.75rem;
}

.sidebar-content--collapsed .sidebar-logo__text,
.sidebar-content--collapsed .sidebar-nav__label,
.sidebar-content--collapsed .sidebar-status,
.sidebar-content--collapsed .sidebar-divider {
  display: none;
}

.sidebar-content--collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
}

.sidebar-content--collapsed .sidebar-nav {
  padding-inline: 0.75rem;
}

.sidebar-content--collapsed :global(.nav-item),
.sidebar-content--collapsed :global(.nav-item-active) {
  justify-content: center;
  padding-inline: 0;
}

.sidebar-status__label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.5rem;
}

.sidebar-status__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-status__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
}

.sidebar-status__text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
}

html:not(.dark) .sidebar-logo__title {
  color: #0f172a;
}

html:not(.dark) .sidebar-logo__subtitle {
  color: #64748b;
}

html:not(.dark) .sidebar-divider {
  background: #e2e8f0;
}

html:not(.dark) .sidebar-status__text {
  color: #64748b;
}
</style>
