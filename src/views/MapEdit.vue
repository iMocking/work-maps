<template>
  <div class="page-container">
    <MHeader title="地图编辑" sub-text="MAP EDITOR">
      <template #left>
        <span class="text-sm text-cyan-100">🛠️ 编辑模式</span>
      </template>
      <template #right>
        <span class="text-sm text-cyan-100">{{ currentTime }}</span>
      </template>
    </MHeader>

    <div class="edit-toolbar">
      <div class="toolbar-item" :class="{ active: tool === 'select' }" @click="tool = 'select'">
        ✋ 选择
      </div>
      <div class="toolbar-item" :class="{ active: tool === 'camera' }" @click="tool = 'camera'">
        📹 添加摄像头
      </div>
      <div class="toolbar-item" :class="{ active: tool === 'fire' }" @click="tool = 'fire'">
        🧯 添加消防栓
      </div>
      <div class="toolbar-item" :class="{ active: tool === 'water' }" @click="tool = 'water'">
        💧 添加水井
      </div>
      <div class="toolbar-item" :class="{ active: tool === 'electric' }" @click="tool = 'electric'">
        ⚡ 添加电井房
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-item danger" @click="clearSelected">
        🗑️ 删除选中
      </div>
    </div>

    <div class="edit-map-area">
      <!-- 地图模式切换 -->
      <div class="map-mode-switch">
        <button
          class="mode-btn"
          :class="{ active: mapMode === '2d' }"
          @click="mapMode = '2d'"
        >
          2D 编辑
        </button>
        <button
          class="mode-btn"
          :class="{ active: mapMode === '3d' }"
          @click="mapMode = '3d'"
        >
          3D 预览
        </button>
      </div>

      <!-- 2D 编辑模式 -->
      <template v-if="mapMode === '2d'">
        <div class="map-grid-bg"></div>

        <!-- 可编辑点位 -->
        <div
          v-for="marker in store.markers"
          :key="marker.id"
          class="edit-marker"
          :style="{ left: marker.x + '%', top: marker.y + '%', cursor: tool === 'select' ? 'move' : 'crosshair' }"
          @click.stop="selectMarker(marker)"
          :class="{ selected: store.selectedMarker?.id === marker.id }"
        >
          <div class="marker-icon" :style="{ background: marker.color }">{{ marker.icon }}</div>
        </div>

        <!-- 空状态提示 -->
        <div v-if="store.markers.length === 0" class="empty-hint">
          <div class="text-6xl mb-4">🗺️</div>
          <div class="text-cyan-200">使用左侧工具栏添加点位</div>
        </div>
      </template>

      <!-- 3D 预览模式 -->
      <ParkMap3D v-else @marker-click="selectMarker" />
    </div>

    <!-- 右侧属性面板 -->
    <div class="property-panel" v-if="store.selectedMarker">
      <div class="panel-title">点位属性</div>
      <div class="form-item">
        <label>名称</label>
        <input v-model="store.selectedMarker.name" type="text" />
      </div>
      <div class="form-item">
        <label>类型</label>
        <select v-model="store.selectedMarker.type">
          <option value="camera">摄像头</option>
          <option value="fire">消防栓</option>
          <option value="water">水井</option>
          <option value="electric">电井房</option>
        </select>
      </div>
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
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">🏠 驾驶舱</router-link>
      <router-link to="/map-edit" class="nav-item active">✏️ 地图编辑</router-link>
      <router-link to="/fire-management" class="nav-item">🧯 消防管理</router-link>
      <router-link to="/device-management" class="nav-item">📡 设备管理</router-link>
      <router-link to="/alarm-management" class="nav-item">🚨 告警管理</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import MHeader from '../components/MHeader.vue'
import ParkMap3D from '../components/ParkMap3D.vue'
import { useMainStore } from '../store'

const router = useRouter()
const store = useMainStore()
const currentTime = ref('')
const tool = ref('select')
const mapMode = ref('2d')

let timer = null

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

function selectMarker(marker) {
  store.selectMarker(marker)
}

function clearSelected() {
  if (store.selectedMarker) {
    store.removeMarker(store.selectedMarker.id)
    store.selectedMarker = null
  }
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

.edit-toolbar {
  position: absolute;
  left: 20px;
  top: 110px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.toolbar-item {
  padding: 10px 16px;
  background: rgba(5, 30, 50, 0.9);
  border: 1px solid rgba(48, 220, 255, 0.3);
  color: rgba(224, 247, 250, 0.9);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.toolbar-item:hover,
.toolbar-item.active {
  background: rgba(48, 220, 255, 0.2);
  border-color: #30DCFF;
  color: #fff;
}

.toolbar-item.danger {
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.toolbar-item.danger:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff6b6b;
}

.toolbar-divider {
  height: 1px;
  background: rgba(48, 220, 255, 0.2);
  margin: 4px 0;
}

.edit-map-area {
  position: absolute;
  left: 160px;
  right: 280px;
  top: 110px;
  bottom: 80px;
  border: 1px solid rgba(48, 220, 255, 0.2);
  overflow: hidden;
}

.map-mode-switch {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  display: flex;
  gap: 4px;
  background: rgba(5, 25, 45, 0.8);
  border: 1px solid rgba(48, 220, 255, 0.3);
  padding: 4px;
}

.mode-btn {
  padding: 4px 12px;
  background: transparent;
  border: none;
  color: rgba(196, 243, 254, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-btn.active {
  background: rgba(48, 220, 255, 0.2);
  color: #30DCFF;
}

.map-grid-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(48, 220, 255, 0.1) 1px, transparent 1px);
  background-size: 30px 30px;
}

.edit-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.marker-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 2px solid #fff;
}

.edit-marker.selected .marker-icon {
  box-shadow: 0 0 20px #30DCFF;
  transform: scale(1.2);
}

.property-panel {
  position: absolute;
  right: 20px;
  top: 110px;
  width: 240px;
  background: rgba(5, 30, 50, 0.95);
  border: 1px solid rgba(48, 220, 255, 0.3);
  padding: 16px;
  z-index: 10;
}

.panel-title {
  color: #30DCFF;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(48, 220, 255, 0.2);
}

.form-item {
  margin-bottom: 12px;
}

.form-item label {
  display: block;
  color: rgba(128, 222, 234, 0.7);
  font-size: 12px;
  margin-bottom: 4px;
}

.form-item input,
.form-item select,
.form-item textarea {
  width: 100%;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(48, 220, 255, 0.2);
  color: #fff;
  font-size: 13px;
}

.form-item textarea {
  resize: vertical;
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

.empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(128, 222, 234, 0.5);
}
</style>
