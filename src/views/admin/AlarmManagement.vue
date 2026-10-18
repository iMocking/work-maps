<template>
  <div class="alarm-management">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value text-danger">{{ highAlarms.length }}</div>
        <div class="stat-label">高优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-warning">{{ mediumAlarms.length }}</div>
        <div class="stat-label">中优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-primary">{{ lowAlarms.length }}</div>
        <div class="stat-label">低优先级</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ resolvedAlarms.length }}</div>
        <div class="stat-label">已处理</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="filterLevel" class="filter-select">
        <option value="all">全部等级</option>
        <option value="high">高优先级</option>
        <option value="medium">中优先级</option>
        <option value="low">低优先级</option>
      </select>
    </div>

    <!-- 告警列表 -->
    <div class="alarm-list">
      <div v-for="alarm in filteredAlarms" :key="alarm.id" class="alarm-item" :class="'level-' + alarm.level">
        <div class="alarm-level">
          <span class="level-badge" :class="'level-' + alarm.level">
            {{ alarm.level === 'high' ? '高' : alarm.level === 'medium' ? '中' : '低' }}
          </span>
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
          <button v-if="alarm.status === 'pending'" class="btn-primary btn-sm" @click="resolveAlarm(alarm)">
            处理
          </button>
          <span v-else class="resolved-tag">✓ 已处理</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const filterLevel = ref('all')

const alarms = ref([
  { id: 1, level: 'high', title: '电井房温度异常', description: '中心电井房温度达到38°C，超出阈值', location: '中央配电室', time: '2024-01-15 14:30', status: 'pending' },
  { id: 2, level: 'medium', title: '摄像头离线', description: '西北2摄像头设备离线，可能网络故障', location: '西北角办公楼', time: '2024-01-15 11:20', status: 'pending' },
  { id: 3, level: 'low', title: '巡检提醒', description: '东门消防栓本周巡检提醒', location: '东门外道路南侧', time: '2024-01-15 09:00', status: 'pending' },
  { id: 4, level: 'low', title: '系统通知', description: '系统例行维护通知', location: '系统', time: '2024-01-14 18:00', status: 'resolved' },
  { id: 5, level: 'medium', title: '水压偏低', description: '西门消防栓水压略低于标准值', location: '西门内广场西侧', time: '2024-01-14 16:45', status: 'resolved' },
])

const highAlarms = computed(() => alarms.value.filter(a => a.level === 'high' && a.status === 'pending'))
const mediumAlarms = computed(() => alarms.value.filter(a => a.level === 'medium' && a.status === 'pending'))
const lowAlarms = computed(() => alarms.value.filter(a => a.level === 'low' && a.status === 'pending'))
const resolvedAlarms = computed(() => alarms.value.filter(a => a.status === 'resolved'))

const filteredAlarms = computed(() => {
  if (filterLevel.value === 'all') return alarms.value
  return alarms.value.filter(a => a.level === filterLevel.value)
})

function resolveAlarm(alarm) {
  alarm.status = 'resolved'
}
</script>

<style scoped>
.alarm-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row {
  display: flex;
  gap: 16px;
}

.stat-card {
  flex: 1;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}

.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.text-primary { color: #409eff; }

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alarm-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  border-left: 4px solid;
}

.alarm-item.level-high { border-left-color: #f56c6c; }
.alarm-item.level-medium { border-left-color: #e6a23c; }
.alarm-item.level-low { border-left-color: #409eff; }

.level-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.level-badge.level-high {
  background: #fef0f0;
  color: #f56c6c;
}

.level-badge.level-medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.level-badge.level-low {
  background: #ecf5ff;
  color: #409eff;
}

.alarm-content {
  flex: 1;
}

.alarm-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.alarm-desc {
  color: #606266;
  font-size: 13px;
  margin-bottom: 8px;
}

.alarm-meta {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 12px;
}

.alarm-actions {
  display: flex;
  align-items: center;
}

.btn-primary {
  padding: 8px 16px;
  background: #409eff;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.resolved-tag {
  color: #67c23a;
  font-size: 13px;
}
</style>
