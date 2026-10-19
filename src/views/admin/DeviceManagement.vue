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
          v-for="dict in store.dicts"
          :key="dict.id"
          class="tab"
          :class="{ active: filterType === dict.id }"
          @click="filterType = dict.id"
        >
          {{ dict.label }}
        </button>
      </div>
      <div class="toolbar-actions">
        <input v-model="searchQuery" type="text" placeholder="搜索设备..." class="search-input" />
        <button class="btn-primary" @click="openAdd">+ 添加设备</button>
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
            <td>{{ store.dictLabel(device.type) }}</td>
            <td>{{ device.location }}</td>
            <td>
              <span class="status-tag" :class="device.status === '异常' ? 'status-danger' : 'status-success'">
                {{ device.status }}
              </span>
            </td>
            <td>{{ device.note }}</td>
            <td>
              <button class="btn-link" @click="editDevice(device)">编辑</button>
              <button class="btn-link btn-danger" @click="askDelete(device)">删除</button>
            </td>
          </tr>
          <tr v-if="filteredDevices.length === 0">
            <td colspan="7" class="empty-cell">暂无设备数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增设备弹窗 -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">添加设备</span>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">设备名称<span class="required">*</span></label>
            <input v-model="form.name" type="text" class="form-input" placeholder="如 东南4摄像头" />
          </div>
          <div class="form-item">
            <label class="form-label">设备类型<span class="required">*</span></label>
            <select v-model="form.type" class="form-input">
              <option value="" disabled>请选择类型</option>
              <option v-for="dict in store.dicts" :key="dict.id" :value="dict.id">
                {{ dict.icon }} {{ dict.label }}
              </option>
            </select>
            <div v-if="store.dicts.length === 0" class="form-tip">
              字典为空，请先在「字典管理」中添加设备类型
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">安装位置<span class="required">*</span></label>
            <input v-model="form.location" type="text" class="form-input" placeholder="如 东南门东侧建筑外墙" />
          </div>
          <div class="form-item">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="form-input">
              <option value="在线">在线</option>
              <option value="正常">正常</option>
              <option value="离线">离线</option>
              <option value="异常">异常</option>
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">备注</label>
            <textarea v-model="form.note" rows="2" class="form-input form-textarea" placeholder="选填"></textarea>
          </div>
          <div class="form-tip">新设备默认位于地图中心，可在地图编辑中调整位置</div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeModal">取消</button>
          <button class="btn-primary" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteVisible" class="modal-overlay" @click.self="deleteVisible = false">
      <div class="modal-card modal-sm">
        <div class="modal-header">
          <span class="modal-title">删除确认</span>
          <button class="modal-close" @click="deleteVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="delete-text">
            确定要删除设备「{{ pendingDelete?.name }}」（{{ pendingDelete?.id }}）吗？删除后不可恢复。
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="deleteVisible = false">取消</button>
          <button class="btn-danger-solid" @click="confirmDelete">删除</button>
        </div>
      </div>
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

// 新增设备
const modalVisible = ref(false)
const form = ref({ name: '', type: '', location: '', status: '正常', note: '' })
const formError = ref('')

function openAdd() {
  form.value = { name: '', type: '', location: '', status: '正常', note: '' }
  formError.value = ''
  modalVisible.value = true
}

function closeModal() {
  if (modalVisible.value) modalVisible.value = false
}

function saveDevice() {
  const name = form.value.name.trim()
  const location = form.value.location.trim()
  const type = form.value.type
  if (!name) {
    formError.value = '请填写设备名称'
    return
  }
  if (!type) {
    formError.value = '请选择设备类型'
    return
  }
  if (!location) {
    formError.value = '请填写安装位置'
    return
  }
  store.addMarker({
    type,
    name,
    icon: store.dictIcon(type) || '📍',
    color: store.typeColor(type),
    x: 50,
    y: 50,
    label: '',
    location,
    status: form.value.status,
    note: form.value.note.trim(),
  })
  modalVisible.value = false
}

// 编辑：跳转地图编辑并定位到该设备
function editDevice(device) {
  store.selectMarker(device.id)
  router.push('/map-edit')
}

// 删除
const deleteVisible = ref(false)
const pendingDelete = ref(null)

function askDelete(device) {
  pendingDelete.value = device
  deleteVisible.value = true
}

function confirmDelete() {
  if (pendingDelete.value) {
    store.removeMarker(pendingDelete.value.id)
  }
  pendingDelete.value = null
  deleteVisible.value = false
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
  flex-wrap: wrap;
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

.btn-danger-solid {
  padding: 8px 16px;
  background: #f56c6c;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-danger-solid:hover {
  background: #f78989;
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

.btn-danger {
  color: #f56c6c;
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

.modal-sm {
  width: 380px;
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

.delete-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #ebeef5;
}
</style>
