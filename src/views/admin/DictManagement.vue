<template>
  <div class="dict-management">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ store.dicts.length }}</div>
        <div class="stat-label">字典总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-primary">{{ withIconCount }}</div>
        <div class="stat-label">已配置图标</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ todayCount }}</div>
        <div class="stat-label">今日新增</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-warning">{{ recentCount }}</div>
        <div class="stat-label">近30天新增</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索字典编码或标签..."
        class="search-input"
      />
      <button class="btn-primary" @click="openAdd">+ 添加字典</button>
    </div>

    <!-- 字典表格 -->
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>字典编码</th>
            <th>标签</th>
            <th>图标</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredDicts" :key="item.id">
            <td class="dict-id">{{ item.id }}</td>
            <td>{{ item.label }}</td>
            <td>
              <span class="dict-icon">{{ item.icon || '—' }}</span>
            </td>
            <td>{{ item.createdAt }}</td>
            <td>
              <button class="btn-link" @click="openEdit(item)">编辑</button>
              <button class="btn-link btn-danger" @click="askDelete(item)">删除</button>
            </td>
          </tr>
          <tr v-if="filteredDicts.length === 0">
            <td colspan="5" class="empty-cell">暂无字典数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">{{ editingId === null ? '添加字典' : '编辑字典' }}</span>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">字典编码<span class="required">*</span></label>
            <input
              v-model="form.id"
              type="text"
              class="form-input"
              placeholder="如 camera / device_status"
              :disabled="editingId !== null"
            />
            <div v-if="editingId !== null" class="form-tip">编码为字典唯一标识，创建后不可修改</div>
          </div>
          <div class="form-item">
            <label class="form-label">标签<span class="required">*</span></label>
            <input
              v-model="form.label"
              type="text"
              class="form-input"
              placeholder="如 摄像头 / 正常"
            />
          </div>
          <div class="form-item">
            <label class="form-label">图标</label>
            <input
              v-model="form.icon"
              type="text"
              class="form-input"
              placeholder="如 📹 或自定义图标文字"
            />
            <div class="icon-presets">
              <span
                v-for="ic in iconPresets"
                :key="ic"
                class="icon-option"
                :class="{ active: form.icon === ic }"
                @click="form.icon = ic"
              >{{ ic }}</span>
            </div>
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeModal">取消</button>
          <button class="btn-primary" @click="saveDict">保存</button>
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
            确定要删除字典「{{ pendingDelete?.label }}」（{{ pendingDelete?.id }}）吗？删除后不可恢复。
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
import { useMainStore } from '../../store'

const store = useMainStore()

const searchQuery = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(str || '')
  if (!m) return NaN
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime()
}

const withIconCount = computed(() => {
  return store.dicts.filter(d => (d.icon || '').trim() !== '').length
})

const todayStr = formatDate(new Date()).slice(0, 10)
const todayCount = computed(() => {
  return store.dicts.filter(d => (d.createdAt || '').startsWith(todayStr)).length
})

const recentCount = computed(() => {
  const threshold = Date.now() - 30 * 24 * 3600 * 1000
  return store.dicts.filter(d => parseDate(d.createdAt) >= threshold).length
})

const filteredDicts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = store.dicts
  if (q) {
    list = list.filter(d =>
      (d.id || '').toLowerCase().includes(q) || (d.label || '').toLowerCase().includes(q)
    )
  }
  return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
})

// 新增 / 编辑
const modalVisible = ref(false)
const editingId = ref(null)
const form = ref({ id: '', label: '', icon: '' })
const formError = ref('')

const iconPresets = ['📹', '🧯', '💧', '⚡', '🏢', '🚗', '🅿️', '📊', '🔥', '🚧', '⚠️', '🏷️', '📍', '🔔', '🛠️', '🧰']

function openAdd() {
  editingId.value = null
  form.value = { id: '', label: '', icon: '' }
  formError.value = ''
  modalVisible.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = { id: item.id, label: item.label, icon: item.icon || '' }
  formError.value = ''
  modalVisible.value = true
}

function closeModal() {
  if (modalVisible.value) modalVisible.value = false
}

function saveDict() {
  const id = form.value.id.trim()
  const label = form.value.label.trim()
  const icon = form.value.icon.trim()
  if (!id) {
    formError.value = '请填写字典编码'
    return
  }
  if (!label) {
    formError.value = '请填写标签'
    return
  }
  if (editingId.value === null && store.dicts.some(d => d.id === id)) {
    formError.value = `字典编码「${id}」已存在`
    return
  }
  if (editingId.value === null) {
    store.addDict({ id, label, icon, createdAt: formatDate(new Date()) })
  } else {
    store.updateDict(editingId.value, { label, icon })
  }
  modalVisible.value = false
}

// 删除
const deleteVisible = ref(false)
const pendingDelete = ref(null)

function askDelete(item) {
  pendingDelete.value = item
  deleteVisible.value = true
}

function confirmDelete() {
  if (pendingDelete.value) {
    store.removeDict(pendingDelete.value.id)
  }
  pendingDelete.value = null
  deleteVisible.value = false
}
</script>

<style scoped>
.dict-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 统计卡片 */
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

/* 工具栏 */
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
  background: #fff;
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

/* 表格 */
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

.dict-id {
  color: #303133;
  font-weight: 500;
}

.dict-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 18px;
}

.empty-cell {
  text-align: center;
  color: #909399;
  padding: 32px 0;
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
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
}

.form-input:disabled {
  background: #f5f7fa;
  color: #909399;
  cursor: not-allowed;
}

.form-tip {
  font-size: 12px;
  color: #909399;
}

.icon-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.icon-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  background: #fff;
}

.icon-option:hover {
  border-color: #409eff;
}

.icon-option.active {
  background: #ecf5ff;
  border-color: #409eff;
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
