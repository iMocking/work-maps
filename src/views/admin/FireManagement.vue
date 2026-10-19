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
        <div class="stat-value text-primary">{{ monthInspectionCount }}</div>
        <div class="stat-label">本月巡检</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <input v-model="searchQuery" type="text" placeholder="搜索设施..." class="search-input" />
      <button class="btn-primary" @click="openAdd">+ 添加消防设施</button>
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
            <td>
              <span class="status-tag" :class="pressureTagClass(device.waterPressure)">
                {{ device.waterPressure || '—' }}
              </span>
            </td>
            <td>{{ device.lastInspection || '—' }}</td>
            <td>
              <button class="btn-link" @click="openEdit(device)">编辑</button>
              <button
                class="btn-link"
                :class="{ 'btn-disabled': isInspectedToday(device) }"
                :disabled="isInspectedToday(device)"
                @click="inspectDevice(device)"
              >
                {{ isInspectedToday(device) ? '✓ 今日已巡检' : '巡检' }}
              </button>
            </td>
          </tr>
          <tr v-if="filteredDevices.length === 0">
            <td colspan="7" class="empty-cell">暂无消防设施</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">{{ editingId === null ? '添加消防设施' : '编辑消防设施' }}</span>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">设施名称<span class="required">*</span></label>
            <input v-model="form.name" type="text" class="form-input" placeholder="如 东门消防栓" />
          </div>
          <div class="form-item">
            <label class="form-label">安装位置<span class="required">*</span></label>
            <input v-model="form.location" type="text" class="form-input" placeholder="如 东门外道路南侧" />
          </div>
          <div class="form-item">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="form-input">
              <option value="正常">正常</option>
              <option value="异常">异常待检</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">水压</label>
            <select v-model="form.waterPressure" class="form-input">
              <option value="正常">正常</option>
              <option value="偏低">偏低</option>
              <option value="异常">异常</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">备注</label>
            <textarea v-model="form.note" rows="2" class="form-input form-textarea" placeholder="选填"></textarea>
          </div>
          <div v-if="editingId === null" class="form-tip">新设施默认位于地图中心，可在地图编辑中调整位置</div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeModal">取消</button>
          <button class="btn-primary" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../../store'

const store = useMainStore()
const searchQuery = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const todayStr = formatDate(new Date()).slice(0, 10)
const monthPrefix = todayStr.slice(0, 7)

const fireDevices = computed(() => store.markersByType('fire'))
const normalCount = computed(() => fireDevices.value.filter(d => d.status === '正常').length)
const abnormalCount = computed(() => fireDevices.value.filter(d => d.status !== '正常').length)
const monthInspectionCount = computed(() => {
  return fireDevices.value.filter(d => (d.lastInspection || '').startsWith(monthPrefix)).length
})

const filteredDevices = computed(() => {
  if (!searchQuery.value) return fireDevices.value
  return fireDevices.value.filter(d =>
    d.name.includes(searchQuery.value) || d.location.includes(searchQuery.value)
  )
})

function pressureTagClass(pressure) {
  if (pressure === '偏低') return 'status-warning'
  if (pressure === '异常') return 'status-danger'
  return 'status-success'
}

function isInspectedToday(device) {
  return (device.lastInspection || '').startsWith(todayStr)
}

// 新增 / 编辑
const modalVisible = ref(false)
const editingId = ref(null)
const form = ref({ name: '', location: '', status: '正常', waterPressure: '正常', note: '' })
const formError = ref('')

function openAdd() {
  editingId.value = null
  form.value = { name: '', location: '', status: '正常', waterPressure: '正常', note: '' }
  formError.value = ''
  modalVisible.value = true
}

function openEdit(device) {
  editingId.value = device.id
  form.value = {
    name: device.name,
    location: device.location,
    status: device.status === '正常' ? '正常' : '异常',
    waterPressure: device.waterPressure || '正常',
    note: device.note || '',
  }
  formError.value = ''
  modalVisible.value = true
}

function closeModal() {
  if (modalVisible.value) modalVisible.value = false
}

function saveDevice() {
  const name = form.value.name.trim()
  const location = form.value.location.trim()
  if (!name) {
    formError.value = '请填写设施名称'
    return
  }
  if (!location) {
    formError.value = '请填写安装位置'
    return
  }
  if (editingId.value === null) {
    store.addMarker({
      type: 'fire',
      name,
      icon: '🧯',
      color: '#ff6b6b',
      x: 50,
      y: 50,
      label: '',
      location,
      status: form.value.status,
      note: form.value.note.trim(),
      waterPressure: form.value.waterPressure,
      lastInspection: '',
    })
  } else {
    store.updateMarker(editingId.value, {
      name,
      location,
      status: form.value.status,
      note: form.value.note.trim(),
      waterPressure: form.value.waterPressure,
    })
  }
  modalVisible.value = false
}

// 巡检：记录日期并恢复正常状态
function inspectDevice(device) {
  store.updateMarker(device.id, {
    status: '正常',
    lastInspection: todayStr,
  })
}
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

.search-input:focus {
  outline: none;
  border-color: #409eff;
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

.btn-primary:hover {
  background: #66b1ff;
}

.btn-default {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.btn-default:hover {
  border-color: #409eff;
  color: #409eff;
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

.empty-cell {
  text-align: center;
  color: #909399;
  padding: 32px 0;
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

.status-warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.btn-link {
  background: none;
  border: none;
  color: #409eff;
  font-size: 13px;
  cursor: pointer;
  margin-right: 8px;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-disabled {
  color: #909399;
  cursor: not-allowed;
  text-decoration: none;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  width: 460px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.modal-close {
  background: none;
  border: none;
  color: #909399;
  font-size: 15px;
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #606266;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: #606266;
}

.required {
  color: #f56c6c;
  margin-left: 2px;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  color: #303133;
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
}

.form-textarea {
  resize: vertical;
  min-height: 48px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
}

.form-error {
  font-size: 13px;
  color: #f56c6c;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #ebeef5;
}
</style>
