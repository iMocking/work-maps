<template>
  <div class="lay-console">
    <router-view />

    <!-- 开发者工具检测提示 -->
    <div v-if="devToolsOpen" class="dev-tools-warning">
      <div class="warning-content">
        <div class="warning-icon">⚠️</div>
        <div class="warning-title">检测到开发者工具已打开</div>
        <div class="warning-desc">为保证系统安全，请关闭开发者工具后继续访问</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const devToolsOpen = ref(false)
let devToolsCheckTimer = null

onMounted(() => {
  // 禁止右键菜单
  document.addEventListener('contextmenu', preventDefault)

  // 禁止开发者工具快捷键
  document.addEventListener('keydown', blockShortcuts)

  // 启动开发者工具检测
  startDevToolsDetection()
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('keydown', blockShortcuts)
  if (devToolsCheckTimer) {
    clearInterval(devToolsCheckTimer)
  }
})

function preventDefault(e) {
  e.preventDefault()
  return false
}

function blockShortcuts(e) {
  // F12
  if (e.key === 'F12') {
    e.preventDefault()
    return false
  }
  // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
  if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
    e.preventDefault()
    return false
  }
  // Ctrl+U (查看源码)
  if (e.ctrlKey && e.key.toUpperCase() === 'U') {
    e.preventDefault()
    return false
  }
}

function startDevToolsDetection() {
  // 通过窗口大小差异检测开发者工具是否打开
  const threshold = 160
  devToolsCheckTimer = setInterval(() => {
    const widthDiff = window.outerWidth - window.innerWidth
    const heightDiff = window.outerHeight - window.innerHeight

    // 开发者工具 dock 到底部或侧边时会有明显的尺寸差异
    devToolsOpen.value = widthDiff > threshold || heightDiff > threshold
  }, 1000)
}
</script>

<style scoped>
.lay-console {
  width: 100vw;
  height: 100vh;
  background: #050f33;
  overflow: hidden;
  position: relative;
}

.dev-tools-warning {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.warning-content {
  text-align: center;
  padding: 40px;
}

.warning-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.warning-title {
  font-size: 24px;
  color: #ff6b6b;
  font-weight: 600;
  margin-bottom: 12px;
}

.warning-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
