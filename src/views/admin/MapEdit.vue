<template>
  <div class="map-edit-admin">
    <!-- 顶栏：地图列表 + 视图模式 -->
    <div class="edit-toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">地图</span>
        <select
          class="map-select"
          :value="store.activeMapId"
          @change="store.switchMap($event.target.value)"
        >
          <option v-for="m in store.maps" :key="m.id" :value="m.id">
            {{ m.name }}（{{ m.coordType === 'geo' ? '经纬度' : '园区坐标' }}）
          </option>
        </select>
        <button class="tool-btn" @click="openAddMap">+ 新建地图</button>
        <button class="tool-btn" @click="openRename">重命名</button>
        <button class="tool-btn btn-danger" @click="openDeleteMap">删除</button>
      </div>
      <div class="toolbar-group">
        <button class="tool-btn" :class="{ active: mode === '2d' }" @click="switchMode('2d')">
          2D 建筑底图
        </button>
        <button class="tool-btn" :class="{ active: mode === '3d' }" @click="switchMode('3d')">
          3D 地图
        </button>
      </div>
    </div>

    <!-- 编辑工具条 -->
    <div class="edit-toolbar">
      <div class="toolbar-group">
        <button
          v-for="t in visibleTools"
          :key="t.id"
          class="tool-btn"
          :class="{ active: tool === t.id }"
          @click="tool = t.id"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="toolbar-group">
        <button class="tool-btn btn-danger" :disabled="!hasSelection" @click="deleteSelected">
          🗑️ 删除选中
        </button>
        <button class="tool-btn" @click="showBaseMap = !showBaseMap">🗺️ 底图设置</button>
      </div>
    </div>

    <!-- 底图设置面板 -->
    <div v-if="showBaseMap" class="base-map-panel">
      <div class="panel-item">
        <label>底图类型</label>
        <select v-model="baseMapForm.type" class="base-input">
          <option value="china">中国 GIS 底图（省界矢量）</option>
          <option value="grid">网格底图（建筑结构）</option>
          <option value="none">空白</option>
        </select>
      </div>
      <div class="panel-item">
        <label>视图中心经度</label>
        <input v-model.number="baseMapForm.centerLon" type="number" step="0.001" class="base-input" />
      </div>
      <div class="panel-item">
        <label>视图中心纬度</label>
        <input v-model.number="baseMapForm.centerLat" type="number" step="0.001" class="base-input" />
      </div>
      <div class="panel-item">
        <label>视图经度跨度</label>
        <input v-model.number="baseMapForm.span" type="number" step="0.01" min="0.01" class="base-input" />
      </div>
      <button class="btn-primary btn-sm" @click="applyBaseMap">应用底图设置</button>
    </div>

    <!-- 内容区 -->
    <div class="edit-container">
      <div class="map-area">
        <Map2DEditor v-if="mode === '2d'" :tool="tool" @select-polygon="onSelectPolygon" />
        <Map3DEditor v-else :tool="tool" />
      </div>

      <!-- 属性面板 -->
      <div class="property-panel">
        <template v-if="store.selectedMarker">
          <div class="panel-title">点位属性</div>
          <div class="form-item">
            <label>名称</label>
            <input v-model="store.selectedMarker.name" type="text" />
          </div>
          <div class="form-item">
            <label>类型</label>
            <select v-model="store.selectedMarker.type">
              <option v-for="dict in store.dicts" :key="dict.id" :value="dict.id">
                {{ dict.icon }} {{ dict.label }}
              </option>
            </select>
          </div>
          <template v-if="isGeoMap">
            <div class="form-item">
              <label>经度</label>
              <input v-model.number="store.selectedMarker.lon" type="number" step="0.0001" />
            </div>
            <div class="form-item">
              <label>纬度</label>
              <input v-model.number="store.selectedMarker.lat" type="number" step="0.0001" />
            </div>
          </template>
          <template v-else>
            <div class="form-item">
              <label>X（0-100）</label>
              <input v-model.number="store.selectedMarker.x" type="number" step="0.5" />
            </div>
            <div class="form-item">
              <label>Y（0-100）</label>
              <input v-model.number="store.selectedMarker.y" type="number" step="0.5" />
            </div>
          </template>
          <div class="form-item">
            <label>位置描述</label>
            <input v-model="store.selectedMarker.location" type="text" />
          </div>
          <div class="form-item">
            <label>状态</label>
            <select v-model="store.selectedMarker.status">
              <option value="正常">正常</option>
              <option value="在线">在线</option>
              <option value="异常">异常</option>
              <option value="离线">离线</option>
            </select>
          </div>
          <div class="form-item">
            <label>备注</label>
            <textarea v-model="store.selectedMarker.note" rows="3"></textarea>
          </div>
        </template>

        <template v-else-if="selectedBox">
          <div class="panel-title">建筑盒子属性</div>
          <div class="form-item">
            <label>名称</label>
            <input v-model="selectedBox.name" type="text" />
          </div>
          <div class="form-item">
            <label>宽度</label>
            <input v-model.number="selectedBox.width" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>高度</label>
            <input v-model.number="selectedBox.height" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>深度</label>
            <input v-model.number="selectedBox.depth" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>颜色</label>
            <input v-model="selectedBox.color" type="color" class="color-input" />
          </div>
          <template v-if="isGeoMap">
            <div class="form-item">
              <label>经度</label>
              <input v-model.number="selectedBox.lon" type="number" step="0.0001" />
            </div>
            <div class="form-item">
              <label>纬度</label>
              <input v-model.number="selectedBox.lat" type="number" step="0.0001" />
            </div>
          </template>
          <template v-else>
            <div class="form-item">
              <label>X（0-100）</label>
              <input v-model.number="selectedBox.x" type="number" step="0.5" />
            </div>
            <div class="form-item">
              <label>Y（0-100）</label>
              <input v-model.number="selectedBox.y" type="number" step="0.5" />
            </div>
          </template>
        </template>

        <template v-else-if="selectedPoly">
          <div class="panel-title">底图轮廓属性</div>
          <div class="form-item">
            <label>名称</label>
            <input v-model="selectedPoly.name" type="text" />
          </div>
          <div class="form-item">
            <label>颜色</label>
            <input v-model="selectedPoly.color" type="color" class="color-input" />
          </div>
          <div class="form-item">
            <label>顶点数</label>
            <div class="static-value">{{ selectedPoly.points.length }}</div>
          </div>
          <div class="form-tip">选中后可在 2D 图中拖动顶点调整形状</div>
        </template>

        <div v-else class="panel-empty">
          点击选择点位、建筑或底图轮廓进行编辑
        </div>
      </div>
    </div>

    <!-- 新建地图弹窗 -->
    <div v-if="addMapVisible" class="modal-overlay" @click.self="addMapVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">新建地图</span>
          <button class="modal-close" @click="addMapVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">地图名称<span class="required">*</span></label>
            <input v-model="addMapForm.name" type="text" class="form-input" placeholder="如 西湖景区 / 南山烈士陵园" />
          </div>
          <div class="form-item">
            <label class="form-label">坐标模式</label>
            <div class="coord-options">
              <div
                class="coord-option"
                :class="{ active: addMapForm.coordType === 'geo' }"
                @click="addMapForm.coordType = 'geo'"
              >
                <div class="coord-title">🌐 经纬度模式</div>
                <div class="coord-desc">真实地理坐标，标记旅游景点、烈士陵园、名胜古迹等</div>
              </div>
              <div
                class="coord-option"
                :class="{ active: addMapForm.coordType === 'local' }"
                @click="addMapForm.coordType = 'local'"
              >
                <div class="coord-title">🏭 园区模式</div>
                <div class="coord-desc">园区逻辑坐标（0-100），建筑结构底图</div>
              </div>
            </div>
          </div>
          <template v-if="addMapForm.coordType === 'geo'">
            <div class="form-item">
              <label class="form-label">视图中心经度</label>
              <input v-model.number="addMapForm.centerLon" type="number" step="0.001" class="form-input" />
            </div>
            <div class="form-item">
              <label class="form-label">视图中心纬度</label>
              <input v-model.number="addMapForm.centerLat" type="number" step="0.001" class="form-input" />
            </div>
            <div class="form-item">
              <label class="form-label">视图经度跨度</label>
              <input v-model.number="addMapForm.span" type="number" step="0.01" min="0.01" class="form-input" />
            </div>
          </template>
          <div v-if="addMapError" class="form-error">{{ addMapError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="addMapVisible = false">取消</button>
          <button class="btn-primary" @click="confirmAddMap">创建</button>
        </div>
      </div>
    </div>

    <!-- 重命名弹窗 -->
    <div v-if="renameVisible" class="modal-overlay" @click.self="renameVisible = false">
      <div class="modal-card modal-sm">
        <div class="modal-header">
          <span class="modal-title">重命名地图</span>
          <button class="modal-close" @click="renameVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">地图名称<span class="required">*</span></label>
            <input v-model="renameForm.name" type="text" class="form-input" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="renameVisible = false">取消</button>
          <button class="btn-primary" @click="confirmRename">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除地图确认 -->
    <div v-if="deleteVisible" class="modal-overlay" @click.self="deleteVisible = false">
      <div class="modal-card modal-sm">
        <div class="modal-header">
          <span class="modal-title">删除地图</span>
          <button class="modal-close" @click="deleteVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="delete-text">
            确定删除地图「{{ store.activeMap.name }}」吗？其点位、建筑、轮廓数据将一并删除且不可恢复。
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="deleteVisible = false">取消</button>
          <button class="btn-danger-solid" @click="confirmDeleteMap">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Map2DEditor from '../../components/map/Map2DEditor.vue'
import Map3DEditor from '../../components/map/Map3DEditor.vue'
import { useMainStore } from '../../store'

const store = useMainStore()

const mode = ref('2d')
const tool = ref('select')
const showBaseMap = ref(false)
const selectedPoly = ref(null)

const isGeoMap = computed(() => store.coordType === 'geo')

const tools = [
  { id: 'select', label: '✋ 选择', modes: ['2d', '3d'] },
  { id: 'add-marker', label: '📍 添加点位', modes: ['2d', '3d'] },
  { id: 'draw-polygon', label: '✏️ 绘制轮廓', modes: ['2d'] },
  { id: 'add-box', label: '🏢 添加建筑', modes: ['3d'] },
]

const visibleTools = computed(() => tools.filter(t => t.modes.includes(mode.value)))

const selectedBox = computed(() => {
  return store.boxes.find(b => b.id === store.selectedBoxId) || null
})

const hasSelection = computed(() => {
  return !!(store.selectedMarker || selectedBox.value || selectedPoly.value)
})

function switchMode(m) {
  mode.value = m
  if (m === '2d' && tool.value === 'add-box') tool.value = 'select'
  if (m === '3d' && tool.value === 'draw-polygon') tool.value = 'select'
}

function onSelectPolygon(poly) {
  selectedPoly.value = poly
  if (poly) store.selectedMarker = null
}

function deleteSelected() {
  if (store.selectedMarker) {
    store.removeMarker(store.selectedMarker.id)
  } else if (selectedBox.value) {
    store.removeBox(selectedBox.value.id)
  } else if (selectedPoly.value) {
    store.removePolygon(selectedPoly.value.id)
    selectedPoly.value = null
  }
}

// ===== 底图设置 =====
const baseMapForm = ref({ type: 'china', centerLon: 114.35, centerLat: 30.575, span: 0.45 })

watch(() => store.activeMapId, () => {
  const map = store.activeMap
  baseMapForm.value = {
    type: map.baseMap || 'china',
    centerLon: map.center?.lon ?? 114.35,
    centerLat: map.center?.lat ?? 30.575,
    span: map.span ?? 0.45,
  }
  selectedPoly.value = null
}, { immediate: true })

function applyBaseMap() {
  store.setBaseMap({
    baseMap: baseMapForm.value.type,
    center: { lon: baseMapForm.value.centerLon, lat: baseMapForm.value.centerLat },
    span: Math.max(0.01, baseMapForm.value.span),
  })
  showBaseMap.value = false
}

// ===== 新建地图 =====
const addMapVisible = ref(false)
const addMapForm = ref({ name: '', coordType: 'geo', centerLon: 114.35, centerLat: 30.575, span: 0.45 })
const addMapError = ref('')

function openAddMap() {
  addMapForm.value = { name: '', coordType: 'geo', centerLon: 114.35, centerLat: 30.575, span: 0.45 }
  addMapError.value = ''
  addMapVisible.value = true
}

function confirmAddMap() {
  const name = addMapForm.value.name.trim()
  if (!name) {
    addMapError.value = '请填写地图名称'
    return
  }
  const id = store.addMap({
    name,
    coordType: addMapForm.value.coordType,
    center: { lon: addMapForm.value.centerLon, lat: addMapForm.value.centerLat },
    span: Math.max(0.01, addMapForm.value.span),
  })
  store.switchMap(id)
  addMapVisible.value = false
}

// ===== 重命名 =====
const renameVisible = ref(false)
const renameForm = ref({ name: '' })

function openRename() {
  renameForm.value = { name: store.activeMap.name }
  renameVisible.value = true
}

function confirmRename() {
  const name = renameForm.value.name.trim()
  if (name) {
    store.renameMap(store.activeMapId, name)
    renameVisible.value = false
  }
}

// ===== 删除地图 =====
const deleteVisible = ref(false)

function openDeleteMap() {
  deleteVisible.value = true
}

function confirmDeleteMap() {
  const ok = store.removeMap(store.activeMapId)
  deleteVisible.value = false
  if (!ok) {
    alert('至少保留一张地图，无法删除')
  }
}

// ===== 属性面板持久化 =====
watch(() => store.selectedMarker, () => store.persistMaps(), { deep: true })
watch(() => selectedBox.value, () => store.persistMaps(), { deep: true })
watch(() => selectedPoly.value, () => store.persistMaps(), { deep: true })
</script>

<style scoped>
.map-edit-admin {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.edit-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-label {
  font-size: 13px;
  color: #909399;
}

.map-select {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  color: #303133;
  min-width: 180px;
}

.tool-btn {
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.tool-btn.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  color: #f56c6c;
  border-color: #fbc4c4;
}

.btn-danger:hover:not(:disabled) {
  background: #fef0f0;
}

/* 底图设置面板 */
.base-map-panel {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.panel-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-item label {
  font-size: 12px;
  color: #909399;
}

.base-input {
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  width: 150px;
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

.edit-container {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  min-width: 0;
}

/* 属性面板 */
.property-panel {
  width: 280px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.form-item {
  margin-bottom: 14px;
}

.form-item label {
  display: block;
  color: #606266;
  font-size: 13px;
  margin-bottom: 6px;
}

.form-item input,
.form-item select,
.form-item textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.form-item textarea {
  resize: vertical;
}

.color-input {
  height: 36px;
  padding: 2px !important;
  cursor: pointer;
}

.static-value {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
}

.form-tip {
  font-size: 12px;
  color: #909399;
}

.panel-empty {
  padding: 40px 12px;
  text-align: center;
  color: #909399;
  font-size: 13px;
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
  width: 480px;
  max-height: 86vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
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
  box-sizing: border-box;
}

.coord-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coord-option {
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.coord-option.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.coord-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.coord-desc {
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
</style>
