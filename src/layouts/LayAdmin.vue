<template>
  <div class="lay-admin">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">🏢</span>
        <span class="logo-text">园区管理后台</span>
      </div>

      <nav class="menu">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="router.push(item.path)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.title }}</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="back-btn" @click="router.push('/dashboard')">
          ← 返回驾驶舱
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-header">
        <h2 class="page-title">{{ currentPageTitle }}</h2>
        <div class="header-right">
          <span class="user-info">管理员</span>
        </div>
      </div>
      <div class="content-body">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { path: '/map-edit', icon: '🗺️', title: '地图编辑' },
  { path: '/device-management', icon: '📡', title: '设备管理' },
  { path: '/dict-management', icon: '📚', title: '字典管理' },
  { path: '/fire-management', icon: '🧯', title: '消防管理' },
  { path: '/alarm-management', icon: '🚨', title: '告警管理' },
  { path: '/system-config', icon: '⚙️', title: '系统配置' },
]

const currentPageTitle = computed(() => {
  return route.meta.title || '管理后台'
})

function isActive(path) {
  return route.path === path
}
</script>

<style scoped>
.lay-admin {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 240px;
  background: #1a2332;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.menu {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.menu-item.active {
  background: rgba(48, 220, 255, 0.15);
  color: #30DCFF;
  border-right: 3px solid #30DCFF;
}

.menu-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.back-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  color: #606266;
  font-size: 14px;
}

.content-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
</style>
