<template>
  <div class="page-container">
    <MHeader title="设备管理" sub-text="DEVICE MANAGEMENT">
      <template #left>
        <span class="text-sm text-cyan-100">📡 全部设备监控</span>
      </template>
      <template #right>
        <span class="text-sm text-cyan-100">{{ currentTime }}</span>
      </template>
    </MHeader>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value text-cyan-400">{{ store.markers.length }}</div>
        <div class="stat-label">设备总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green-400">{{ onlineCount }}</div>
        <div class="stat-label">在线设备</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-red-400">{{ store.abnormalCount }}</div>
        <div class="stat-label">异常设备</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-blue-400">{{ onlineRate }}%</div>
        <div class="stat-label">在线率</div>
      </div>
    </div>

    <!-- 设备类型筛选 -->
    <div class="filter-tabs">
      <div class="tab" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">
        全部设备 ({{ store.markers.length }})
      </div>
      <div class="tab" :class="{ active: filterType === 'camera' }" @click="filterType = 'camera'">
        📹 摄像头 ({{ store.deviceCount.camera }})
      </div>
      <div class="tab" :class="{ active: filterType === 'fire' }" @click="filterType = 'fire'">
        🧯 消防栓 ({{ store.deviceCount.fire }})
      </div>
      <div class="tab" :class="{ active: filterType === 'water' }" @click="filterType = 'water'">
        💧 水井 ({{ store.deviceCount.water }})
      </div>
      <div class="tab" :class="{ active: filterType === 'electric' }" @click="filterType = 'electric'">
        ⚡ 电井房 ({{ store.deviceCount.electric }})
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="content-area">
      <div class="device-grid">
        <div v-for="device in filteredDevices" :key="device.id" class="device-card">
          <div class="device-icon" :style="{ background: device.color }">
            {{ device.icon }}
          </div>
          <div class="device-info">
            <div class="device-name">{{ device.name }}</div>
            <div class="device-location">{{ device.location }}</div>
            <div class="device-status" :class="device.status === '异常' ? 'text-red-400' : 'text-green-400'">
              {{ device.status }}
            </div>
          </div>
          <div class="device-actions">
            <button class="btn-small" @click="locateDevice(device)">定位</button>
            <button class="btn-small" @click="editDevice(device)">编辑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">🏠 驾驶舱</router-link>
      <router-link to="/map-edit" class="nav-item">✏️ 地图编辑</router-link>
      <router-link to="/fire-management" class="nav-item">🧯 消防管理</router-link>
      <router-link to="/device-management" class="nav-item active">📡 设备管理</router-link>
      <router-link to="/alarm-management" class="nav-item">🚨 告警管理</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import MHeader from '../components/MHeader.vue'
import { useMainStore } from '../store'

const router = useRouter()
const store = useMainStore()
const currentTime = ref('')
const filterType = ref('all')

let timer = null

const onlineCount = computed(() => {
  return store.markers.filter(m => m.status !== '异常').length
})

const onlineRate = computed(() => {
  if (store.markers.length === 0) return 0
  return Math.round((onlineCount.value / store.markers.length) * 100)
})

const filteredDevices = computed(() => {
  if (filterType.value === 'all') return store.markers
  return store.markers.filter(m => m.type === filterType.value)
})

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

function updateTime() {
  const now = new Date()
  currentTime.value = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0')
}

function locateDevice(device) {
  store.selectMarker(device)
  router.push('/dashboard')
}

function editDevice(device) {
  store.selectMarker(device)
  router.push('/map-edit')
}
</script>

<style scoped>
.page-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #050f33;
  overflow: hidden;
}

.stats-row {
  position: absolute;
  top: 110px;
  left: 20px;
  right: 20px;
  display: flex;
  gap: 16px;
}

.stat-card {
  flex: 1;
  padding: 20px;
  background: rgba(5, 30, 50, 0.8);
  border: 1px solid rgba(48, 220, 255, 0.2);
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
}

.stat-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 13px;
  margin-top: 8px;
}

.filter-tabs {
  position: absolute;
  top: 250px;
  left: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
}

.tab {
  padding: 8px 16px;
  background: rgba(5, 30, 50, 0.8);
  border: 1px solid rgba(48, 220, 255, 0.2);
  color: rgba(196, 243, 254, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab:hover,
.tab.active {
  background: rgba(48, 220, 255, 0.15);
  border-color: #30DCFF;
  color: #fff;
}

.content-area {
  position: absolute;
  top: 310px;
  left: 20px;
  right: 20px;
  bottom: 80px;
  overflow: auto;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.device-card {
  padding: 16px;
  background: rgba(5, 30, 50, 0.8);
  border: 1px solid rgba(48, 220, 255, 0.2);
  display: flex;
  gap: 12px;
  align-items: center;
}

.device-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.device-location {
  color: rgba(128, 222, 234, 0.6);
  font-size: 12px;
  margin-bottom: 4px;
}

.device-status {
  font-size: 12px;
}

.device-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-small {
  padding: 4px 12px;
  background: rgba(48, 220, 255, 0.1);
  border: 1px solid rgba(48, 220, 255, 0.3);
  color: #30DCFF;
  font-size: 12px;
  cursor: pointer;
}

.btn-small:hover {
  background: rgba(48, 220, 255, 0.2);
}

.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(5, 20, 35, 0.9);
  border-top: 1px solid rgba(48, 220, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 10;
}

.nav-item {
  padding: 8px 20px;
  color: rgba(196, 243, 254, 0.7);
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-item:hover,
.nav-item.active {
  color: #30DCFF;
  background: rgba(48, 220, 255, 0.1);
}
</style>
