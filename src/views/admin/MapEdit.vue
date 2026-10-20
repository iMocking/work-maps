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
            {{ m.mapName }}（{{ m.data.coordType === 'geo' ? '经纬度' : '园区坐标' }}）
          </option>
        </select>
        <button class="tool-btn" @click="openAddMap">+ 新建地图</button>
        <button class="tool-btn" @click="openRename">重命名</button>
        <button class="tool-btn btn-danger" @click="openDeleteMap">删除</button>
        <button class="tool-btn" @click="openMapInfo">📋 地图信息</button>
        <button class="tool-btn" @click="exportMapJson">📤 导出 JSON</button>
        <button class="tool-btn" @click="openImport">📥 导入 JSON</button>
        <button
          class="tool-btn"
          :class="{ active: isDashboardMap }"
          :title="isDashboardMap ? '当前地图正在驾驶舱展示' : '点击将当前地图设为驾驶舱展示数据源'"
          @click="store.setDashboardMap(store.activeMapId)"
        >🎯 展示到驾驶舱</button>
        <span class="dash-map-badge">驾驶舱：{{ store.dashboardMap?.mapName || '—' }}</span>
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
        <button
          class="tool-btn"
          :disabled="isGeoMap"
          :title="isGeoMap ? '经纬度模式使用中国 GIS 底图，不允许更改' : '切换底图类型与视图范围'"
          @click="showBaseMap = !showBaseMap"
        >🗺️ 底图设置</button>
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

        <template v-else-if="selectedWall">
          <div class="panel-title">墙体属性</div>
          <div class="form-item">
            <label>名称</label>
            <input v-model="selectedWall.name" type="text" />
          </div>
          <div class="form-item">
            <label>高度</label>
            <input v-model.number="selectedWall.height" type="number" min="0.1" step="0.5" />
          </div>
          <div class="form-item">
            <label>厚度</label>
            <input v-model.number="selectedWall.thickness" type="number" min="0.05" step="0.1" />
          </div>
          <div class="form-item">
            <label>颜色</label>
            <input v-model="selectedWall.color" type="color" class="color-input" />
          </div>
          <div class="form-item">
            <label>透明度（{{ Number(selectedWall.opacity ?? 0.95).toFixed(2) }}）</label>
            <input v-model.number="selectedWall.opacity" type="range" min="0" max="1" step="0.05" class="range-input" />
          </div>
          <div class="form-item">
            <label>可见</label>
            <label class="check-label"><input v-model="selectedWall.visible" type="checkbox" /> 显示墙体</label>
          </div>
          <div class="form-item">
            <label>备注</label>
            <input v-model="selectedWall.note" type="text" />
          </div>
          <div class="form-item">
            <label>顶点数</label>
            <div class="static-value">{{ selectedWall.points.length }}</div>
          </div>
          <div class="form-tip">切换到 2D 编辑后可拖动墙体顶点调整走向；3D 中可直接看到墙体立体效果</div>
        </template>

        <template v-else-if="selectedBuilding">
          <div class="panel-title">建筑属性</div>
          <div class="form-item">
            <label>名称</label>
            <input v-model="selectedBuilding.name" type="text" />
          </div>
          <div class="form-item">
            <label>宽度</label>
            <input v-model.number="selectedBuilding.width" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>高度</label>
            <input v-model.number="selectedBuilding.height" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>深度</label>
            <input v-model.number="selectedBuilding.depth" type="number" min="1" step="1" />
          </div>
          <div class="form-item">
            <label>颜色</label>
            <input v-model="selectedBuilding.color" type="color" class="color-input" />
          </div>
          <template v-if="isGeoMap">
            <div class="form-item">
              <label>经度</label>
              <input v-model.number="selectedBuilding.lon" type="number" step="0.0001" />
            </div>
            <div class="form-item">
              <label>纬度</label>
              <input v-model.number="selectedBuilding.lat" type="number" step="0.0001" />
            </div>
          </template>
          <template v-else>
            <div class="form-item">
              <label>X（0-100）</label>
              <input v-model.number="selectedBuilding.x" type="number" step="0.5" />
            </div>
            <div class="form-item">
              <label>Y（0-100）</label>
              <input v-model.number="selectedBuilding.y" type="number" step="0.5" />
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
                <div class="coord-desc">真实地理坐标，标记旅游景点、烈士陵园、名胜古迹等；默认加载中国 GIS 底图（锁定不可改），仅可添加自定义点位</div>
              </div>
              <div
                class="coord-option"
                :class="{ active: addMapForm.coordType === 'local' }"
                @click="addMapForm.coordType = 'local'"
              >
                <div class="coord-title">🏭 园区模式</div>
                <div class="coord-desc">园区逻辑坐标（0-100），建筑结构底图；3D 中可自由摆放与调整建筑体块</div>
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="coord-desc" style="color:#909399">新建地图将同时具备 2D 建筑底图与 3D 立体地图两种编辑形态，可在编辑页顶部切换。</div>
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
            确定删除地图「{{ store.activeMap.mapName }}」吗？其点位、建筑、轮廓数据将一并删除且不可恢复。
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="deleteVisible = false">取消</button>
          <button class="btn-danger-solid" @click="confirmDeleteMap">删除</button>
        </div>
      </div>
    </div>

    <!-- 导入地图 JSON（Smart Factory 协议） -->
    <div v-if="importVisible" class="modal-overlay" @click.self="importVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">导入地图 JSON</span>
          <button class="modal-close" @click="importVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="import-tip">
            支持 Smart Factory 协议文件（顶层为 mapName / description / createdAt / remark / data 结构），
            一个 JSON 即可完整重建园区 2D/3D 地图（含墙体、建筑、点位、道路、标签）。
            <a class="import-demo-link" href="/examples/smart-factory-demo.factory.json" download="smart-factory-demo.factory.json">⬇ 下载示例地图 JSON 体验</a>
          </div>
          <div class="file-zone" :class="{ dragging: importDragging }" @dragover.prevent="importDragging = true" @dragleave.prevent="importDragging = false" @drop.prevent="onImportDrop">
            <input ref="importInputRef" type="file" accept=".json,application/json" class="file-input" @change="onImportFile" />
            <div class="file-placeholder">
              <div class="file-icon">📄</div>
              <div>{{ importFileName || '点击选择或拖拽 JSON 文件到此处' }}</div>
            </div>
          </div>
          <div v-if="importErrors.length" class="import-errors">
            <div class="import-error-title">校验未通过：</div>
            <div v-for="(err, i) in importErrors" :key="i" class="import-error-item">• {{ err }}</div>
          </div>
          <div v-if="importWarnings.length" class="import-warnings">
            <div v-for="(w, i) in importWarnings" :key="i" class="import-warning-item">⚠ {{ w }}</div>
          </div>
          <div v-if="importPreview" class="import-preview">
            <div class="preview-title">预览：{{ importPreview.mapName }}</div>
            <div v-if="importPreview.description" class="preview-line">{{ importPreview.description }}</div>
            <div class="preview-line">坐标模式：{{ importPreview.coordType === 'geo' ? '经纬度' : '园区' }} · 创建时间：{{ importPreview.createdAt || '—' }}</div>
            <div v-if="importPreview.remark" class="preview-line">备注：{{ importPreview.remark }}</div>
            <div class="preview-grid">
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.walls }}</span>墙体</div>
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.buildings }}</span>建筑</div>
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.markers }}</span>点位</div>
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.polygons }}</span>轮廓</div>
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.paths }}</span>道路</div>
              <div class="preview-cell"><span class="cell-num">{{ importPreview.counts.labels }}</span>标签</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="importVisible = false">取消</button>
          <button class="btn-primary" :disabled="!importPreview" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>

    <!-- 地图信息（描述/备注） -->
    <div v-if="infoVisible" class="modal-overlay" @click.self="infoVisible = false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">地图信息</span>
          <button class="modal-close" @click="infoVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">地图名称<span class="required">*</span></label>
            <input v-model="infoForm.name" type="text" class="form-input" />
          </div>
          <div class="form-item">
            <label class="form-label">描述（导出为 description 字段）</label>
            <textarea v-model="infoForm.description" rows="3" class="form-input" placeholder="地图用途、园区规模等"></textarea>
          </div>
          <div class="form-item">
            <label class="form-label">备注（导出为 remark 字段）</label>
            <textarea v-model="infoForm.remark" rows="2" class="form-input" placeholder="版本、维护人等信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="infoVisible = false">取消</button>
          <button class="btn-primary" @click="confirmMapInfo">保存</button>
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
import { validateMapJson, jsonToPrettyString, mapFileName, downloadTextFile } from '../../utils/mapSchema'

const store = useMainStore()

const mode = ref('2d')
const tool = ref('select')
const showBaseMap = ref(false)
const selectedPoly = ref(null)

const isGeoMap = computed(() => store.coordType === 'geo')
// 当前地图是否为驾驶舱展示数据源
const isDashboardMap = computed(() => store.dashboardMapId === store.activeMapId)

const tools = [
  { id: 'select', label: '✋ 选择', modes: ['2d', '3d'] },
  { id: 'add-marker', label: '📍 添加点位', modes: ['2d', '3d'] },
  { id: 'draw-polygon', label: '✏️ 绘制轮廓', modes: ['2d'] },
  { id: 'add-box', label: '🏢 添加建筑', modes: ['3d'] },
  { id: 'add-wall', label: '🧱 添加墙体', modes: ['3d'] },
]

const visibleTools = computed(() => {
  // 经纬度（中国 GIS）模式：底图锁定，仅允许添加自定义点位与选择
  if (isGeoMap.value) {
    return tools.filter(t => (t.id === 'select' || t.id === 'add-marker') && t.modes.includes(mode.value))
  }
  // 园区建筑模式：2D 可绘制轮廓，3D 可自由摆放/调整建筑与墙体
  return tools.filter(t => t.modes.includes(mode.value))
})

const selectedBuilding = computed(() => {
  return store.buildings.find(b => b.id === store.selectedBuildingId) || null
})

const selectedWall = computed(() => {
  return store.walls.find(w => w.id === store.selectedWallId) || null
})

const hasSelection = computed(() => {
  return !!(store.selectedMarker || selectedBuilding.value || selectedWall.value || selectedPoly.value)
})

function switchMode(m) {
  mode.value = m
  if (m === '2d' && (tool.value === 'add-box' || tool.value === 'add-wall')) tool.value = 'select'
  if (m === '3d' && tool.value === 'draw-polygon') tool.value = 'select'
}

function onSelectPolygon(poly) {
  selectedPoly.value = poly
  if (poly) {
    store.selectedMarker = null
    store.selectedWallId = null
  }
}

function deleteSelected() {
  if (store.selectedMarker) {
    store.removeMarker(store.selectedMarker.id)
  } else if (selectedBuilding.value) {
    store.removeBuilding(selectedBuilding.value.id)
  } else if (selectedWall.value) {
    store.removeWall(selectedWall.value.id)
  } else if (selectedPoly.value) {
    store.removePolygon(selectedPoly.value.id)
    selectedPoly.value = null
  }
}

// ===== 底图设置 =====
const baseMapForm = ref({ type: 'china', centerLon: 114.35, centerLat: 30.575, span: 0.45 })

watch(() => store.activeMapId, () => {
  const map = store.activeMap
  const d = map?.data || {}
  baseMapForm.value = {
    type: d.baseMap || 'china',
    centerLon: d.center?.lon ?? 114.35,
    centerLat: d.center?.lat ?? 30.575,
    span: d.span ?? 0.45,
  }
  selectedPoly.value = null
  // 切到经纬度模式地图时，将工具复位为合法工具（该模式下仅点位可编辑）
  if (isGeoMap.value && (tool.value === 'draw-polygon' || tool.value === 'add-box' || tool.value === 'add-wall')) {
    tool.value = 'select'
  }
}, { immediate: true })

function applyBaseMap() {
  // 经纬度模式：中国 GIS 底图不允许更改（只能添加自定义点位）
  if (isGeoMap.value) {
    showBaseMap.value = false
    return
  }
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
  renameForm.value = { name: store.activeMap.mapName }
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

// ===== 地图 JSON 导出（Smart Factory 协议）=====
function exportMapJson() {
  const json = store.exportMapJson(store.activeMapId)
  if (!json) return
  const text = jsonToPrettyString(json)
  downloadTextFile(mapFileName(json.mapName), text)
}

// ===== 地图 JSON 导入 =====
const importVisible = ref(false)
const importDragging = ref(false)
const importInputRef = ref(null)
const importFileName = ref('')
const importErrors = ref([])
const importWarnings = ref([])
const importPreview = ref(null)
let pendingImportJson = null

function openImport() {
  importVisible.value = true
  importFileName.value = ''
  importErrors.value = []
  importWarnings.value = []
  importPreview.value = null
  pendingImportJson = null
  if (importInputRef.value) importInputRef.value.value = ''
}

function onImportDrop(e) {
  importDragging.value = false
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
  if (file) readImportFile(file)
}

function onImportFile(e) {
  const file = e.target.files && e.target.files[0]
  if (file) readImportFile(file)
}

function readImportFile(file) {
  importFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result
    try {
      const json = JSON.parse(text)
      const v = validateMapJson(json)
      if (!v.ok) {
        pendingImportJson = null
        importErrors.value = v.errors
        importWarnings.value = v.warnings || []
        importPreview.value = null
        return
      }
      pendingImportJson = json
      importErrors.value = []
      importWarnings.value = v.warnings || []
      const d = json.data || {}
      importPreview.value = {
        mapName: json.mapName,
        description: json.description || '',
        createdAt: json.createdAt || '',
        remark: json.remark || '',
        coordType: d.coordType,
        counts: {
          walls: (d.walls || []).length,
          buildings: (d.buildings || []).length,
          markers: (d.markers || []).length,
          polygons: (d.polygons || []).length,
          paths: (d.paths || []).length,
          labels: (d.labels || []).length,
        },
      }
    } catch (err) {
      pendingImportJson = null
      importErrors.value = ['不是有效的 JSON 文件：' + err.message]
      importWarnings.value = []
      importPreview.value = null
    }
  }
  reader.readAsText(file)
}

function confirmImport() {
  if (!pendingImportJson) return
  const r = store.importMapFromJson(pendingImportJson)
  if (r.ok) {
    importVisible.value = false
    importFileName.value = ''
    importErrors.value = []
    importWarnings.value = []
    importPreview.value = null
    pendingImportJson = null
  } else {
    importErrors.value = r.errors
    importWarnings.value = r.warnings || []
    importPreview.value = null
  }
}

// ===== 地图信息（描述/备注，导出到 JSON 顶层字段）=====
const infoVisible = ref(false)
const infoForm = ref({ name: '', description: '', remark: '' })

function openMapInfo() {
  const map = store.activeMap
  infoForm.value = {
    name: map.mapName,
    description: map.description || '',
    remark: map.remark || '',
  }
  infoVisible.value = true
}

function confirmMapInfo() {
  const name = infoForm.value.name.trim()
  if (!name) return
  store.renameMap(store.activeMapId, name)
  store.updateMapInfo({
    description: infoForm.value.description,
    remark: infoForm.value.remark,
  })
  infoVisible.value = false
}

// ===== 属性面板持久化 =====
watch(() => store.selectedMarker, () => store.persistMaps(), { deep: true })
watch(() => selectedBuilding.value, () => store.persistMaps(), { deep: true })
watch(() => selectedWall.value, () => store.persistMaps(), { deep: true })
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

.dash-map-badge {
  padding: 6px 10px;
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  color: #409eff;
  font-size: 12px;
  white-space: nowrap;
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

/* 墙体属性 */
.range-input {
  width: 100%;
  padding: 0;
  height: 22px;
  accent-color: #409eff;
  background: transparent;
  border: none;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.check-label input {
  width: auto;
}

/* 导入弹窗 */
.import-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.import-demo-link {
  display: inline-block;
  margin-top: 6px;
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
}

.import-demo-link:hover {
  text-decoration: underline;
}

.file-zone {
  position: relative;
  border: 2px dashed #c0c4cc;
  border-radius: 6px;
  padding: 18px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.file-zone.dragging {
  border-color: #409eff;
  background: #ecf5ff;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-placeholder {
  font-size: 13px;
  color: #606266;
  pointer-events: none;
}

.file-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.import-errors {
  margin-top: 10px;
  padding: 10px 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
}

.import-error-title {
  font-size: 13px;
  color: #f56c6c;
  font-weight: 600;
  margin-bottom: 4px;
}

.import-error-item {
  font-size: 12px;
  color: #f56c6c;
  line-height: 1.7;
}

.import-warnings {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
}

.import-warning-item {
  font-size: 12px;
  color: #e6a23c;
  line-height: 1.7;
}

.import-preview {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.preview-line {
  font-size: 12px;
  color: #606266;
  line-height: 1.7;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.preview-cell {
  text-align: center;
  padding: 8px 4px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
  color: #909399;
}

.cell-num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}
</style>
