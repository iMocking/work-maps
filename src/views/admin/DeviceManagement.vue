<template>
  <div class="device-management">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ store.markers.length }}</div>
        <div class="stat-label">设备总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ onlineCount }}</div>
        <div class="stat-label">在线设备</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-danger">{{ store.abnormalCount }}</div>
        <div class="stat-label">异常设备</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-primary">{{ onlineRate }}%</div>
        <div class="stat-label">在线率</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="filter-tabs">
        <button
          class="tab"
          :class="{ active: filterType === 'all' }"
          @click="filterType = 'all'"
        >
          全部
        </button>
        <button
          v-for="type in ['camera', 'fire', 'water', 'electric']"
          :key="type"
          class="tab"
          :class="{ active: filterType === type }"
          @click="filterType = type"
        >
          {{ typeLabels[type] }}
        </button>
      </div>
      <div class="toolbar-actions">
        <input v-model="searchQuery" type="text" placeholder="搜索设备..." class="search-input" />
        <button class="btn-primary">+ 添加设备</button>
      </div>
    </div>

    <!-- 设备表格 -->
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>编号</th>
            <th>设备名称</th>
            <th>类型</th>
            <th>安装位置</th>
            <th>状态</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in filteredDevices" :key="device.id">
            <td>{{ device.id }}</td>
            <td>{{ device.name }}</td>
            <td>{{ typeLabels[device.type] }}</td>
            <td>{{ device.location }}</td>
            <td>
              <span class="status-tag" :class="device.status === '异常' ? 'status-danger' : 'status-success'">
                {{ device.status }}
              </span>
            </td>
            <td>{{ device.note }}</td>
            <td>
              <button class="btn-link" @click="editDevice(device)">编辑</button>
              <button class="btn-link btn-danger">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '../../store'

const router = useRouter()
const store = useMainStore()
const filterType = ref('all')
const searchQuery = ref('')

const typeLabels = {
  camera: '摄像头',
  fire: '消防栓',
  water: '水井',
  electric: '电井房',
}

const onlineCount = computed(() => {
  return store.markers.filter(m => m.status !== '异常').length
})

const onlineRate = computed(() => {
  if (store.markers.length === 0) return 0
  return Math.round((onlineCount.value / store.markers.length) * 100)
})

const filteredDevices = computed(() => {
  let list = store.markers
  if (filterType.value !== 'all') {
    list = list.filter(m => m.type === filterType.value)
  }
  if (searchQuery.value) {
    list = list.filter(m =>
      m.name.includes(searchQuery.value) || m.location.includes(searchQuery.value)
    )
  }
  return list
})

function editDevice(device) {
  store.selectMarker(device)
  router.push('/admin/map-edit')
}
</script>

<style scoped>
.device-management {
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
.text-primary { color: #409eff; }

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.tab.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  width: 200px;
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

.table-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
  font-size: 13px;
  color: #606266;
}

th {
  background: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

.status-tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-success {
  background: #f0f9eb;
  color: #67c23a;
}

.status-danger {
  background: #fef0f0;
  color: #f56c6c;
}

.btn-link {
  background: none;
  border: none;
  color: #409eff;
  font-size: 13px;
  cursor: pointer;
  margin-right: 8px;
}

.btn-danger {
  color: #f56c6c;
}
</style>
