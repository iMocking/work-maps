<template>
  <div class="fire-management">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ fireDevices.length }}</div>
        <div class="stat-label">消防栓总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ normalCount }}</div>
        <div class="stat-label">正常运行</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-warning">{{ abnormalCount }}</div>
        <div class="stat-label">异常待检</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-primary">6</div>
        <div class="stat-label">本月巡检</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <input v-model="searchQuery" type="text" placeholder="搜索设施..." class="search-input" />
      <button class="btn-primary">+ 添加消防设施</button>
    </div>

    <!-- 表格 -->
    <div class="table-card">
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
              <span class="status-tag" :class="device.status === '正常' ? 'status-success' : 'status-danger'">
                {{ device.status }}
              </span>
            </td>
            <td>正常</td>
            <td>2024-01-10</td>
            <td>
              <button class="btn-link">编辑</button>
              <button class="btn-link">巡检</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../../store'

const store = useMainStore()
const searchQuery = ref('')

const fireDevices = computed(() => store.markersByType('fire'))
const normalCount = computed(() => fireDevices.value.filter(d => d.status === '正常').length)
const abnormalCount = computed(() => fireDevices.value.filter(d => d.status !== '正常').length)

const filteredDevices = computed(() => {
  if (!searchQuery.value) return fireDevices.value
  return fireDevices.value.filter(d =>
    d.name.includes(searchQuery.value) || d.location.includes(searchQuery.value)
  )
})
</script>

<style scoped>
.fire-management {
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
  justify-content: space-between;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  width: 240px;
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
</style>
