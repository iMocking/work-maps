<template>
  <div class="page-container">
    <MHeader title="消防管理" sub-text="FIRE MANAGEMENT">
      <template #left>
        <span class="text-sm text-cyan-100">🧯 消防设施监控</span>
      </template>
      <template #right>
        <span class="text-sm text-cyan-100">{{ currentTime }}</span>
      </template>
    </MHeader>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value text-red-400">{{ fireDevices.length }}</div>
        <div class="stat-label">消防栓总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green-400">{{ normalCount }}</div>
        <div class="stat-label">正常运行</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-yellow-400">{{ abnormalCount }}</div>
        <div class="stat-label">异常待检</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-cyan-400">{{ lastInspection }}</div>
        <div class="stat-label">本月巡检次数</div>
      </div>
    </div>

    <!-- 消防设施列表 -->
    <div class="content-area">
      <div class="panel">
        <div class="panel-header">
          <span>🧯 消防设施列表</span>
          <div class="panel-actions">
            <input v-model="searchQuery" type="text" placeholder="搜索设施..." class="search-input" />
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>名称</th>
                <th>位置</th>
                <th>状态</th>
                <th>水压</th>
                <th>最近巡检</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="device in filteredDevices" :key="device.id">
                <td>{{ device.id }}</td>
                <td>{{ device.name }}</td>
                <td>{{ device.location }}</td>
                <td>
                  <span class="status-tag" :class="device.status === '正常' ? 'status-normal' : 'status-abnormal'">
                    {{ device.status }}
                  </span>
                </td>
                <td>{{ device.pressure }}</td>
                <td>{{ device.lastCheck }}</td>
                <td>
                  <button class="btn-link" @click="viewDetail(device)">详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">🏠 驾驶舱</router-link>
      <router-link to="/map-edit" class="nav-item">✏️ 地图编辑</router-link>
      <router-link to="/fire-management" class="nav-item active">🧯 消防管理</router-link>
      <router-link to="/device-management" class="nav-item">📡 设备管理</router-link>
      <router-link to="/alarm-management" class="nav-item">🚨 告警管理</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import MHeader from '../components/MHeader.vue'
import { useMainStore } from '../store'

const store = useMainStore()
const currentTime = ref('')
const searchQuery = ref('')

let timer = null

const fireDevices = computed(() => {
  return store.markersByType('fire')
})

const normalCount = computed(() => {
  return fireDevices.value.filter(d => d.status === '正常').length
})

const abnormalCount = computed(() => {
  return fireDevices.value.filter(d => d.status !== '正常').length
})

const lastInspection = ref(6)

const filteredDevices = computed(() => {
  if (!searchQuery.value) return fireDevices.value
  return fireDevices.value.filter(d =>
    d.name.includes(searchQuery.value) || d.location.includes(searchQuery.value)
  )
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

function viewDetail(device) {
  store.selectMarker(device)
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

.content-area {
  position: absolute;
  top: 240px;
  left: 20px;
  right: 20px;
  bottom: 80px;
}

.panel {
  height: 100%;
  background: rgba(5, 30, 50, 0.8);
  border: 1px solid rgba(48, 220, 255, 0.2);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(48, 220, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.panel-actions {
  display: flex;
  gap: 12px;
}

.search-input {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(48, 220, 255, 0.2);
  color: #fff;
  font-size: 13px;
  width: 200px;
}

.table-container {
  flex: 1;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(48, 220, 255, 0.1);
  color: rgba(224, 247, 250, 0.9);
  font-size: 13px;
}

th {
  color: #30DCFF;
  font-weight: 600;
  background: rgba(48, 220, 255, 0.05);
}

.status-tag {
  padding: 4px 10px;
  font-size: 12px;
}

.status-normal {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.status-abnormal {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.btn-link {
  color: #30DCFF;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
}

.btn-link:hover {
  text-decoration: underline;
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
