<template>
  <img
    v-if="!imgError && resolvedUrl"
    :src="resolvedUrl"
    :alt="alt || ''"
    :class="className"
    @error="onError"
    @load="onLoad"
    loading="lazy"
  />
  <span v-else class="steam-image-fallback" :class="className">
    {{ fallbackEmoji }}
  </span>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/api'

const props = withDefaults(
  defineProps<{
    marketHashName?: string
    iconUrl?: string | null
    alt?: string
    className?: string
    fallbackEmoji?: string
  }>(),
  {
    fallbackEmoji: 'CS',
  },
)

const imgError = ref(false)
const resolvedUrl = ref<string | null>(props.iconUrl || null)

function onError() {
  imgError.value = true
}

function onLoad() {
  imgError.value = false
}

async function loadIcon() {
  // 优先使用外部传入的 iconUrl
  if (props.iconUrl) {
    resolvedUrl.value = props.iconUrl
    imgError.value = false
    return
  }
  if (!props.marketHashName) return

  try {
    const { data } = await api.getItemIcon(props.marketHashName)
    resolvedUrl.value = data.icon_url
  } catch {
    resolvedUrl.value = null
  }
}

onMounted(loadIcon)

watch(
  () => [props.marketHashName, props.iconUrl],
  () => {
    imgError.value = false
    if (props.iconUrl) {
      resolvedUrl.value = props.iconUrl
    } else {
      loadIcon()
    }
  },
)
</script>

<style scoped>
.steam-image-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0;
  color: var(--cs-text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--cs-border);
  border-radius: 0.375rem;
  user-select: none;
}
</style>
