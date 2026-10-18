<template>
  <div class="map-edit-admin">
    <div class="edit-toolbar">
      <div class="toolbar-group">
        <button class="tool-btn" :class="{ active: tool === 'select' }" @click="tool = 'select'">
          ✋ 选择
        </button>
        <button class="tool-btn" :class="{ active: tool === 'camera' }" @click="tool = 'camera'">
          📹 添加摄像头
        </button>
        <button class="tool-btn" :class="{ active: tool === 'fire' }" @click="tool = 'fire'">
          🧯 添加消防栓
        </button>
        <button class="tool-btn" :class="{ active: tool === 'water' }" @click="tool = 'water'">
          💧 添加水井
        </button>
        <button class="tool-btn" :class="{ active: tool === 'electric' }" @click="tool = 'electric'">
          ⚡ 添加电井房
        </button>
      </div>
      <div class="toolbar-group">
        <button class="tool-btn btn-danger" @click="clearSelected">
          🗑️ 删除选中
        </button>
      </div>
    </div>

    <div class="edit-container">
      <!-- 左侧：地图区域 -->
      <div class="map-area">
        <ParkMap3D v-if="mapMode === '3d'" @marker-click="selectMarker" />
        <div v-else class="map-placeholder">
          <div class="map-grid-bg"></div>
          <div
            v-for="marker in store.markers"
            :key="marker.id"
            class="edit-marker"
            :style="{ left: marker.x + '%', top: marker.y + '%' }"
            @click="selectMarker(marker)"
            :class="{ selected: store.selectedMarker?.id === marker.id }"
          >
            <div class="marker-icon" :style="{ background: marker.color }">{{ marker.icon }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：属性面板 -->
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ParkMap3D from '../../components/ParkMap3D.vue'
import { useMainStore } from '../../store'

const store = useMainStore()
const tool = ref('select')
const mapMode = ref('2d')

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
.map-edit-admin {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.edit-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

.tool-btn {
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.tool-btn.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.btn-danger {
  color: #f56c6c;
  border-color: #fbc4c4;
}

.btn-danger:hover {
  background: #fef0f0;
}

.edit-container {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.map-area {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  position: relative;
  overflow: hidden;
}

.map-placeholder {
  position: absolute;
  inset: 0;
}

.map-grid-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 30px 30px;
}

.edit-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
}

.marker-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.edit-marker.selected .marker-icon {
  box-shadow: 0 0 0 3px #409eff;
}

.property-panel {
  width: 280px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
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
}

.form-item textarea {
  resize: vertical;
}
</style>
