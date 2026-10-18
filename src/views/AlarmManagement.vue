<template>
  <div class="page-container">
    <MHeader title="告警管理" sub-text="ALARM MANAGEMENT">
      <template #left>
        <span class="text-sm text-cyan-100">🚨 告警事件中心</span>
      </template>
      <template #right>
        <span class="text-sm text-cyan-100">{{ currentTime }}</span>
      </template>
    </MHeader>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value text-red-400">{{ highAlarmCount }}</div>
        <div class="stat-label">高优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-yellow-400">{{ mediumAlarmCount }}</div>
        <div class="stat-label">中优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-cyan-400">{{ lowAlarmCount }}</div>
        <div class="stat-label">低优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-green-400">{{ resolvedCount }}</div>
        <div class="stat-label">已处理</div>
      </div>
    </div>

    <!-- 告警列表 -->
    <div class="content-area">
      <div class="panel">
        <div class="panel-header">
          <span>🚨 告警事件列表</span>
          <div class="panel-actions">
            <select v-model="filterLevel" class="filter-select">
              <option value="all">全部等级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>
        </div>
        <div class="alarm-list">
          <div
            v-for="alarm in filteredAlarms"
            :key="alarm.id"
            class="alarm-item"
            :class="'level-' + alarm.level"
          >
            <div class="alarm-level">
              <span v-if="alarm.level === 'high'" class="level-badge level-high">高</span>
              <span v-else-if="alarm.level === 'medium'" class="level-badge level-medium">中</span>
              <span v-else class="level-badge level-low">低</span>
            </div>
            <div class="alarm-content">
              <div class="alarm-title">{{ alarm.title }}</div>
              <div class="alarm-desc">{{ alarm.description }}</div>
              <div class="alarm-meta">
                <span>📍 {{ alarm.location }}</span>
                <span>⏰ {{ alarm.time }}</span>
              </div>
            </div>
            <div class="alarm-actions">
              <button v-if="alarm.status === 'pending'" class="btn-primary" @click="resolveAlarm(alarm)">
                处理
              </button>
              <span v-else class="resolved-tag">✓ 已处理</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">🏠 驾驶舱</router-link>
      <router-link to="/map-edit" class="nav-item">✏️ 地图编辑</router-link>
      <router-link to="/fire-management" class="nav-item">🧯 消防管理</router-link>
      <router-link to="/device-management" class="nav-item">📡 设备管理</router-link>
      <router-link to="/alarm-management" class="nav-item active">🚨 告警管理</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import MHeader from '../components/MHeader.vue'
import { useMainStore } from '../store'

const store = useMainStore()
const currentTime = ref('')
const filterLevel = ref('all')

let timer = null

// 模拟告警数据
const alarms = ref([
  { id: 1, level: 'high', title: '电井房温度异常', description: '中心电井房温度达到38°C，超出阈值', location: '中央配电室', time: '2024-01-15 14:30', status: 'pending' },
  { id: 2, level: 'medium', title: '摄像头离线', description: '西北2摄像头设备离线，可能网络故障', location: '西北角办公楼', time: '2024-01-15 11:20', status: 'pending' },
  { id: 3, level: 'low', title: '巡检提醒', description: '东门消防栓本周巡检提醒', location: '东门外道路南侧', time: '2024-01-15 09:00', status: 'pending' },
  { id: 4, level: 'low', title: '系统通知', description: '系统例行维护通知', location: '系统', time: '2024-01-14 18:00', status: 'resolved' },
  { id: 5, level: 'medium', title: '水压偏低', description: '西门消防栓水压略低于标准值', location: '西门内广场西侧', time: '2024-01-14 16:45', status: 'resolved' },
])

const highAlarmCount = computed(() => alarms.value.filter(a => a.level === 'high' && a.status === 'pending').length)
const mediumAlarmCount = computed(() => alarms.value.filter(a => a.level === 'medium' && a.status === 'pending').length)
const lowAlarmCount = computed(() => alarms.value.filter(a => a.level === 'low' && a.status === 'pending').length)
const resolvedCount = computed(() => alarms.value.filter(a => a.status === 'resolved').length)

const filteredAlarms = computed(() => {
  if (filterLevel.value === 'all') return alarms.value
  return alarms.value.filter(a => a.level === filterLevel.value)
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

function resolveAlarm(alarm) {
  alarm.status = 'resolved'
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

.filter-select {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(48, 220, 255, 0.2);
  color: #fff;
  font-size: 13px;
}

.alarm-list {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.alarm-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid;
}

.alarm-item.level-high {
  border-left-color: #ff6b6b;
}

.alarm-item.level-medium {
  border-left-color: #ffd54f;
}

.alarm-item.level-low {
  border-left-color: #30DCFF;
}

.alarm-level {
  flex-shrink: 0;
}

.level-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.level-high {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.level-medium {
  background: rgba(255, 213, 79, 0.2);
  color: #ffd54f;
}

.level-low {
  background: rgba(48, 220, 255, 0.2);
  color: #30DCFF;
}

.alarm-content {
  flex: 1;
}

.alarm-title {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}

.alarm-desc {
  color: rgba(196, 243, 254, 0.8);
  font-size: 13px;
  margin-bottom: 8px;
}

.alarm-meta {
  display: flex;
  gap: 16px;
  color: rgba(128, 222, 234, 0.6);
  font-size: 12px;
}

.alarm-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.btn-primary {
  padding: 8px 16px;
  background: linear-gradient(135deg, #30DCFF 0%, #05839D 100%);
  border: none;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.resolved-tag {
  color: #4CAF50;
  font-size: 13px;
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
