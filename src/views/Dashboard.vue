<template>
  <div class="dashboard">
    <!-- 背景 -->
    <div class="dashboard-bg"></div>

    <!-- 头部 -->
    <MHeader title="普洛斯武汉新洲物流仓" sub-text="INTELLIGENT PARK MANAGEMENT CENTER">
      <template #left>
        <span class="text-sm text-cyan-100">🌧️ 小雨 27°C</span>
      </template>
      <template #right>
        <span class="text-sm text-cyan-100 font-mono">{{ currentTime }}</span>
      </template>
    </MHeader>

    <!-- 左侧面板组 -->
    <div class="left-panel-group">
      <MCard title="大宗商品销售额" :width="360">
        <div class="chart-bar">
          <div v-for="item in salesData" :key="item.name" class="bar-item">
            <div class="bar-value" :style="{ height: item.height + 'px', background: item.color }">
              <span>{{ item.value }}</span>
            </div>
            <div class="bar-label">{{ item.name }}</div>
          </div>
        </div>
      </MCard>

      <MCard title="年度经济增长点" :width="360">
        <div class="pie-chart">
          <div class="pie-ring">
            <div class="pie-center">
              <div class="pie-value">36.51%</div>
              <div class="pie-label">类型1</div>
            </div>
          </div>
          <div class="pie-legend">
            <div class="legend-item"><span class="dot" style="background:#30DCFF"></span>类型1 <b>400 亿</b></div>
            <div class="legend-item"><span class="dot" style="background:#64B5F6"></span>类型2 <b>250 亿</b></div>
            <div class="legend-item"><span class="dot" style="background:#4FC3F7"></span>类型3 <b>200 亿</b></div>
            <div class="legend-item"><span class="dot" style="background:#FFD54F"></span>类型4 <b>150 亿</b></div>
          </div>
        </div>
      </MCard>

      <MCard title="近年经济情况" :width="360">
        <div class="line-chart">
          <svg width="100%" height="120" viewBox="0 0 320 120">
            <polyline points="0,90 40,60 80,80 120,40 160,70 200,30 240,55 280,25 320,45"
              fill="none" stroke="#30DCFF" stroke-width="2" />
            <polyline points="0,100 40,80 80,90 120,60 160,85 200,50 240,70 280,40 320,60"
              fill="none" stroke="#64B5F6" stroke-width="2" opacity="0.6" />
          </svg>
          <div class="chart-x-labels">
            <span>2023/04</span>
            <span>2023/06</span>
            <span>2023/08</span>
            <span>2023/10</span>
            <span>2023/12</span>
            <span>2024/02</span>
          </div>
        </div>
      </MCard>

      <MCard title="各区经济收益" :width="360">
        <div class="funnel-chart">
          <div v-for="item in districtData" :key="item.name" class="funnel-item">
            <div class="funnel-bar" :style="{ width: item.width + '%', background: item.color }">
              <span>{{ item.value }}</span>
            </div>
            <div class="funnel-label">{{ item.name }}</div>
          </div>
        </div>
      </MCard>
    </div>

    <!-- 地图模式切换（左侧底部，与面板同层级） -->
    <div class="map-mode-switch">
      <button
        class="mode-btn"
        :class="{ active: mapMode === '2d' }"
        @click="mapMode = '2d'"
      >
        2D
      </button>
      <button
        class="mode-btn"
        :class="{ active: mapMode === '3d' }"
        @click="mapMode = '3d'"
      >
        3D
      </button>
    </div>

    <!-- 右侧面板组 -->
    <div class="right-panel-group">
      <MCard title="专项资金用途" :width="360" >
        <div class="progress-list">
          <div v-for="item in fundData" :key="item.name" class="progress-item">
            <div class="progress-header">
              <span class="progress-name">{{ item.name }}</span>
              <span class="progress-value">{{ item.value }} 万元</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
            </div>
          </div>
        </div>
      </MCard>

      <MCard title="人群消费占比" :width="360" >
        <div class="pie-chart">
          <div class="pie-ring" style="background: conic-gradient(#FF9800 0 40%, #4FC3F7 40% 65%, #30DCFF 65% 85%, #FFD54F 85% 100%)">
            <div class="pie-center">
              <div class="pie-label">消费占比</div>
            </div>
          </div>
          <div class="pie-legend">
            <div class="legend-item"><span class="dot" style="background:#FF9800"></span>类型1 <b>40 %</b></div>
            <div class="legend-item"><span class="dot" style="background:#4FC3F7"></span>类型2 <b>25 %</b></div>
            <div class="legend-item"><span class="dot" style="background:#30DCFF"></span>类型3 <b>20 %</b></div>
            <div class="legend-item"><span class="dot" style="background:#FFD54F"></span>类型4 <b>15 %</b></div>
          </div>
        </div>
      </MCard>

      <MCard title="用电情况" :width="360" >
        <div class="line-chart">
          <svg width="100%" height="120" viewBox="0 0 320 120">
            <polyline points="0,80 40,60 80,90 120,50 160,70 200,40 240,65 280,35 320,55"
              fill="none" stroke="#64B5F6" stroke-width="2" />
            <polyline points="0,90 40,70 80,95 120,60 160,80 200,50 240,75 280,45 320,65"
              fill="none" stroke="#4CAF50" stroke-width="2" />
          </svg>
          <div class="chart-x-labels">
            <span>2023/04</span>
            <span>2023/06</span>
            <span>2023/08</span>
            <span>2023/10</span>
            <span>2023/12</span>
            <span>2024/02</span>
          </div>
        </div>
      </MCard>

      <MCard title="各季度增长情况" :width="360" >
        <div class="group-bar-chart">
          <div v-for="item in quarterData" :key="item.name" class="group-bar-item">
            <div class="group-bars">
              <div class="group-bar" :style="{ height: item.bar1 + 'px', background: '#30DCFF' }"></div>
              <div class="group-bar" :style="{ height: item.bar2 + 'px', background: '#4CAF50' }"></div>
            </div>
            <div class="group-label">{{ item.name }}</div>
          </div>
        </div>
      </MCard>
    </div>

    <!-- 中间地图区域 -->
    <div class="map-area">
      <!-- 2D 地图模式 -->
      <template v-if="mapMode === '2d'">
        <div class="map-placeholder">
          <div class="map-grid"></div>
          <div class="map-center-glow"></div>
        </div>

        <!-- 点位标记 -->
        <div
          v-for="marker in markers"
          :key="marker.id"
          class="map-marker"
          :style="{ left: marker.x + '%', top: marker.y + '%' }"
          @click="showInfoCard(marker)"
        >
          <div class="marker-pillar" :style="{ background: marker.color }"></div>
          <div class="marker-dot" :style="{ background: marker.color, boxShadow: `0 0 15px ${marker.color}` }"></div>
          <div v-if="marker.label" class="marker-label" :style="{ borderColor: marker.color, color: marker.color }">
            {{ marker.label }}
          </div>
        </div>
      </template>

      <!-- 3D 地图模式 -->
      <ParkMap3D v-else @marker-click="showInfoCard" />


      <!-- 信息卡片 -->
      <div v-if="selectedMarker" class="info-card" @click.stop>
        <div class="info-card-header">
          <span class="text-xl">{{ selectedMarker.icon }}</span>
          <span class="text-white font-semibold text-base">{{ selectedMarker.name }}</span>
          <span class="cursor-pointer text-cyan-200 ml-auto" @click="selectedMarker = null">×</span>
        </div>
        <div class="info-card-body">
          <div class="info-row">
            <span class="info-label">设备类型</span>
            <span class="info-value">{{ selectedMarker.type }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">安装位置</span>
            <span class="info-value">{{ selectedMarker.location }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">运行状态</span>
            <span class="info-value" :style="{ color: selectedMarker.status === '异常' ? '#ff6b6b' : '#4ecdc4' }">
              {{ selectedMarker.status }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">备注信息</span>
            <span class="info-value">{{ selectedMarker.note }}</span>
          </div>
          <div class="info-actions">
            <button class="btn-primary" @click="locateToCenter">快定位到中心</button>
            <button class="btn-secondary">查看详情</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部托盘 -->
    <div class="bottom-tray">
      <div class="bottom-tray-arrow">
        <img src="../assets/images/common/bottom-menu-arrow-big.svg" alt="" />
        <img src="../assets/images/common/bottom-menu-arrow-small.svg" alt="" />
      </div>
      <div class="bottom-menu">
        <router-link
          v-for="item in topMenuItems"
          :key="item.index"
          :to="item.route"
          class="bottom-menu-item"
          :class="{ 'is-active': activeMenu === item.index }"
          @click="handleMenuSelect(item.index)"
        >
          <span>{{ item.label }}</span>
        </router-link>
      </div>
      <div class="bottom-tray-arrow is-reverse">
        <img src="../assets/images/common/bottom-menu-arrow-big.svg" alt="" />
        <img src="../assets/images/common/bottom-menu-arrow-small.svg" alt="" />
      </div>
    </div>

    <!-- 右下角雷达 -->
    <div class="radar-decor">
      <div class="radar-circle"></div>
      <div class="radar-line"></div>
    </div>

    <!-- 左右装饰线 -->
    <div class="left-zsline"></div>
    <div class="right-zsline"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MHeader from '../components/MHeader.vue'
import MMenu from '../components/MMenu.vue'
import MCard from '../components/MCard.vue'
import ParkMap3D from '../components/ParkMap3D.vue'

const currentTime = ref('')
const activeMenu = ref('1')
const selectedMarker = ref(null)
const mapMode = ref('2d')

const topMenuItems = [
  { index: '1', label: '编辑地图', route: '/map-edit' },
  { index: '2', label: '消防管理', route: '/fire-management' },
  { index: '3', label: '设备管理', route: '/device-management' },
  { index: '4', label: '告警管理', route: '/alarm-management' },
]

// 左侧图表数据
const salesData = [
  { name: '农产品', value: 100, height: 60, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.3))' },
  { name: '能源', value: 120, height: 75, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.3))' },
  { name: '金属', value: 150, height: 95, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.3))' },
  { name: '化工', value: 110, height: 70, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.3))' },
  { name: '木材', value: 100, height: 65, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.3))' },
]

const districtData = [
  { name: '南山区', value: '8000', width: 90, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.2))' },
  { name: '天河区', value: '7500', width: 80, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.2))' },
  { name: '福田区', value: '6000', width: 65, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.2))' },
  { name: '龙岗区', value: '5800', width: 60, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.2))' },
  { name: '宝安区', value: '5000', width: 50, color: 'linear-gradient(180deg, #30DCFF, rgba(48,220,255,0.2))' },
]

// 右侧图表数据
const fundData = [
  { name: '扶贫资金', value: 100, percent: 90, color: '#4CAF50' },
  { name: '医疗卫生', value: 80, percent: 75, color: '#30DCFF' },
  { name: '渔业资金', value: 60, percent: 55, color: '#B0BEC5' },
  { name: '社区改造', value: 50, percent: 40, color: '#FFB74D' },
]

const quarterData = [
  { name: '一季度', bar1: 50, bar2: 30 },
  { name: '二季度', bar1: 70, bar2: 40 },
  { name: '三季度', bar1: 90, bar2: 60 },
  { name: '四季度', bar1: 80, bar2: 50 },
]

// 地图点位
const markers = [
  { id: 1, type: 'camera', name: '东南3摄像头', icon: '📹', x: 65, y: 35, color: '#30DCFF', label: '📹 东南3', location: '东南门东侧建筑外墙', status: '在线', note: '正常运行' },
  { id: 2, type: 'camera', name: '西北2摄像头', icon: '📹', x: 30, y: 30, color: '#30DCFF', label: '', location: '西北角办公楼顶层', status: '在线', note: '正常运行' },
  { id: 3, type: 'fire', name: '东门消防栓', icon: '🧯', x: 75, y: 60, color: '#ff6b6b', label: '', location: '东门外道路南侧', status: '正常', note: '水压正常' },
  { id: 4, type: 'fire', name: '西门消防栓', icon: '🧯', x: 25, y: 55, color: '#ff6b6b', label: '', location: '西门内广场西侧', status: '正常', note: '水压正常' },
  { id: 5, type: 'water', name: '北区水井', icon: '💧', x: 45, y: 25, color: '#64b5f6', label: '', location: '北厂区绿化带内', status: '正常', note: '水质合格' },
  { id: 6, type: 'electric', name: '中心电井房', icon: '⚡', x: 55, y: 45, color: '#ffd54f', label: '⚠ 温度异常', location: '中央配电室', status: '异常', note: '温度偏高38°C' },
  { id: 7, type: 'electric', name: '南区电井房', icon: '⚡', x: 40, y: 70, color: '#ffd54f', label: '', location: '南办公楼地下一层', status: '正常', note: '温度28°C' },
]

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

function handleMenuSelect(index) {
  activeMenu.value = index
}

function showInfoCard(marker) {
  selectedMarker.value = marker
}

function locateToCenter() {
  const card = document.querySelector('.info-card')
  if (card) {
    card.style.transform = 'translate(-50%, -50%) scale(1.05)'
    setTimeout(() => {
      card.style.transform = 'translate(-50%, -50%) scale(1)'
    }, 200)
  }
}
</script>

<style scoped>
.dashboard {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #050f33;
  overflow: hidden;
}

.dashboard-bg {
  position: absolute;
  inset: 0;
  background: url('../assets/images/common/bg.png') no-repeat center;
  background-size: cover;
  opacity: 0.5;
}

/* 顶部导航菜单 */
.top-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 40px;
  z-index: 10;
  display: flex;
  justify-content: center;
}

/* 顶部统计卡片 */
.top-count-cards {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 105px;
  display: flex;
  gap: 80px;
  z-index: 10;
}

.count-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-card-icon {
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(48, 220, 255, 0.1);
  border: 1px solid rgba(48, 220, 255, 0.3);
}

.count-card-info {
  display: flex;
  flex-direction: column;
}

.count-card-label {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.count-card-sub {
  color: rgba(196, 243, 254, 0.6);
  font-size: 11px;
  margin-top: 2px;
}

.count-card-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-left: 20px;
}

.count-card-value .value {
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  font-family: 'D-DIN', monospace;
}

.count-card-value .unit {
  color: rgba(196, 243, 254, 0.8);
  font-size: 14px;
}

/* 左右面板组 */
.left-panel-group {
  position: absolute;
  left: 20px;
  top: 100px;
  bottom: 90px;
  width: 360px;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 6px;
  perspective: 800px;
  justify-content: space-between;
  z-index: 10;
}

.left-panel-group > * {
  transform: rotateY(5deg);
}

.right-panel-group {
  position: absolute;
  right: 20px;
  top: 100px;
  bottom: 90px;
  width: 360px;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  grid-gap: 6px;
  perspective: 800px;
  justify-content: space-between;
  z-index: 10;
}

.right-panel-group > * {
  transform: rotateY(-5deg);
}

/* 中间地图区域 */
.map-area {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.map-mode-switch {
  position: absolute;
  left: 410px;
  bottom: 65px;
  display: flex;
  gap: 6px;
  background: rgba(10, 30, 50, 0.406);
  border: 1px solid rgba(48, 220, 255, 0.13);
  border-radius: 6px;
  padding: 4px;
  z-index: 10;
}

.mode-btn {
  flex: 1;
  padding: 6px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: rgba(196, 243, 254, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-btn:hover {
  color: #fff;
}

.mode-btn.active {
  background: rgba(48, 220, 255, 0.15);
  border-color: rgba(48, 220, 255, 0.5);
  color: #30DCFF;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(48, 220, 255, 0.08) 0%, transparent 70%);
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(48, 220, 255, 0.1) 1px, transparent 1px);
  background-size: 30px 30px;
}

.map-center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(48, 220, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
}

/* 地图点位 */
.map-marker {
  position: absolute;
  transform: translate(-50%, -100%);
  cursor: pointer;
  z-index: 10;
}

.marker-pillar {
  width: 3px;
  height: 40px;
  margin: 0 auto;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin: -6px auto 0;
}

.marker-label {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: rgba(5, 20, 35, 0.9);
  padding: 3px 10px;
  border: 1px solid;
  font-size: 11px;
  clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
}

/* 信息卡片 */
.info-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  background: rgba(5, 25, 45, 0.95);
  border: 1px solid rgba(48, 220, 255, 0.5);
  z-index: 100;
  box-shadow: 0 0 40px rgba(48, 220, 255, 0.3);
}

.info-card-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(48, 220, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(90deg, rgba(48, 220, 255, 0.15) 0%, transparent 100%);
}

.info-card-body {
  padding: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.info-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 12px;
}

.info-value {
  color: #e0f7fa;
  font-size: 12px;
}

.info-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-primary {
  flex: 1;
  padding: 10px 0;
  background: linear-gradient(135deg, #30DCFF 0%, #05839D 100%);
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  flex: 1;
  padding: 10px 0;
  background: transparent;
  border: 1px solid rgba(48, 220, 255, 0.5);
  color: #30DCFF;
  font-size: 13px;
  cursor: pointer;
}

/* 地图中心标签 */
.map-center-label {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

/* 底部托盘 */
.bottom-tray {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 1920px;
  height: 90px;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  background: url('../assets/images/common/bottom-menu-bg.png') no-repeat center;
  background-size: contain;
}

.bottom-tray-arrow {
  display: flex;
  align-items: center;
  height: 30px;
}

.bottom-tray-arrow.is-reverse {
  transform: scaleX(-1);
}

.bottom-tray-arrow img {
  animation: arrowAnimate 2s ease-in-out infinite;
}

.bottom-menu {
  display: flex;
  padding: 0 20px;
}

.bottom-menu-item {
  width: 100px;
  height: 32px;
  background: url('../assets/images/common/bottom-menu-btn.png') no-repeat;
  background-size: 100%;
  font-size: 14px;
  letter-spacing: 1.6px;
  text-align: center;
  line-height: 30px;
  cursor: pointer;
  margin: 0 6px;
}

.bottom-menu-item span {
  display: block;
  width: 100%;
  height: 100%;
  font-weight: 600;
  background: linear-gradient(rgba(117, 232, 255, 1), rgba(255, 255, 255, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.bottom-menu-item:hover,
.bottom-menu-item.is-active {
  background: url('../assets/images/common/bottom-menu-btn-hover.png') no-repeat;
  background-size: 100%;
}

/* 雷达装饰 */
.radar-decor {
  position: absolute;
  right: 420px;
  bottom: 65px;
  width: 60px;
  height: 60px;
  z-index: 5;
}

.radar-circle {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(48, 220, 255, 0.4);
  border-radius: 50%;
  position: relative;
}

.radar-circle::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(48, 220, 255, 0.3);
  border-radius: 50%;
}

.radar-line {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50%;
  height: 2px;
  background: linear-gradient(90deg, rgba(48, 220, 255, 0.8), transparent);
  transform-origin: left center;
  animation: radarSpin 4s linear infinite;
}

@keyframes radarSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 左右装饰线 */
.left-zsline {
  position: absolute;
  left: 0;
  top: 50%;
  margin-top: -540px;
  width: 120px;
  height: 1080px;
  background: url('../assets/images/common/left-kuang.svg') no-repeat;
  background-size: contain;
  animation: bkAnimate 3s infinite;
  z-index: 3;
  pointer-events: none;
}

.right-zsline {
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -540px;
  width: 120px;
  height: 1080px;
  background: url('../assets/images/common/right-kuang.svg') no-repeat;
  background-size: contain;
  animation: bkAnimate 3s infinite;
  z-index: 3;
  pointer-events: none;
}

/* 图表样式 */
.chart-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  padding: 0 10px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.bar-value {
  width: 24px;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
}

.bar-value span {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.bar-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 11px;
}

/* 环形饼图 */
.pie-chart {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100%;
}

.pie-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(#30DCFF 0 36.51%, #64B5F6 36.51% 60%, #4FC3F7 60% 80%, #FFD54F 80% 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pie-center {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #050f33;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pie-value {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.pie-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 11px;
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(224, 247, 250, 0.9);
  font-size: 12px;
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-item b {
  margin-left: 8px;
  color: #fff;
}

/* 折线图 */
.line-chart {
  padding: 10px 0;
}

.chart-x-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 5px;
}

.chart-x-labels span {
  color: rgba(128, 222, 234, 0.6);
  font-size: 10px;
}

/* 漏斗图 */
.funnel-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
}

.funnel-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.funnel-bar {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}

.funnel-bar span {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.funnel-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 11px;
  min-width: 50px;
}

/* 进度条列表 */
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 10px 0;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
}

.progress-name {
  color: rgba(224, 247, 250, 0.9);
  font-size: 12px;
}

.progress-value {
  color: #30DCFF;
  font-size: 12px;
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
}

.progress-fill {
  height: 100%;
}

/* 分组柱状图 */
.group-bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  padding: 10px;
}

.group-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.group-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 100px;
}

.group-bar {
  width: 12px;
}

.group-label {
  color: rgba(128, 222, 234, 0.7);
  font-size: 11px;
}
</style>
