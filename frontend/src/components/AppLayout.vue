<template>
  <div class="app-layout">
    <a class="app-layout__skip-link" href="#main-content">跳到主内容</a>
    <Sidebar
      :collapsed="collapsed"
      :is-mobile="isMobile"
      :mobile-drawer-open="mobileDrawerOpen"
      @update:mobile-drawer-open="mobileDrawerOpen = $event"
    />
    <div class="app-layout__main">
      <!-- 背景装饰光晕 -->
      <div class="app-layout__glow" />
      <TopBar
        :collapsed="collapsed"
        :is-mobile="isMobile"
        @toggle-collapse="toggleCollapse"
        @toggle-mobile-drawer="mobileDrawerOpen = !mobileDrawerOpen"
      />
      <main id="main-content" class="app-layout__content scrollbar-hide" tabindex="-1">
        <router-view v-slot="{ Component, route: viewRoute }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="viewRoute.path" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'

const isMobile = ref(false)
const collapsed = ref(false)
const mobileDrawerOpen = ref(false)

function updateLayout() {
  const w = window.innerWidth
  if (w < 640) {
    isMobile.value = true
    collapsed.value = false
  } else if (w < 1024) {
    isMobile.value = false
    collapsed.value = true
  } else {
    isMobile.value = false
    collapsed.value = false
  }
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

onMounted(() => {
  updateLayout()
  window.addEventListener('resize', updateLayout)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateLayout)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #050505;
  color: #ffffff;
}

.app-layout__skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 2000;
  transform: translateY(-180%);
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  background: #6366f1;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
  transition: transform 160ms;
}

.app-layout__skip-link:focus {
  transform: translateY(0);
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.app-layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.app-layout__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.app-layout__glow::before,
.app-layout__glow::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.app-layout__glow::before {
  top: -10%;
  left: -10%;
  width: 40%;
  height: 40%;
  background: rgba(99, 102, 241, 0.05);
  filter: blur(120px);
}

.app-layout__glow::after {
  bottom: -10%;
  right: -10%;
  width: 30%;
  height: 30%;
  background: rgba(99, 102, 241, 0.1);
  filter: blur(100px);
}

.app-layout__content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 1.5rem;
  position: relative;
  z-index: 1;
}

.app-layout__content:focus {
  outline: none;
}

/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

html:not(.dark) .app-layout {
  background: #f8fafc;
  color: #0f172a;
}

@media (max-width: 640px) {
  .app-layout__content {
    padding: 1.25rem 1rem;
  }
}
</style>
