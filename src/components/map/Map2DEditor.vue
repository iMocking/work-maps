<template>
  <div class="map-2d-editor">
    <svg
      ref="svgRef"
      class="canvas"
      :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
      preserveAspectRatio="xMidYMid meet"
      @click="onCanvasClick"
      @mousemove="onMove"
      @mouseup="onUp"
      @dblclick="onDblClick"
      @contextmenu.prevent="undoDrawPoint"
    >
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
      </defs>

      <!-- ===== 底图 ===== -->
      <g v-if="isGeo">
        <rect :width="VIEW_W" :height="VIEW_H" fill="#eef4fb" />
        <path
          v-for="cp in chinaPaths"
          :key="cp.name"
          :d="cp.d"
          fill="#dce9f7"
          stroke="#8fa8c9"
          stroke-width="0.6"
          opacity="0.95"
        />
      </g>
      <g v-else>
        <rect :width="VIEW_W" :height="VIEW_H" fill="#f8fafc" />
        <rect :width="VIEW_W" :height="VIEW_H" fill="url(#map-grid)" />
      </g>

      <!-- ===== 中国缩略图参照 ===== -->
      <g class="mini-map" :transform="`translate(${VIEW_W - 130}, 14)`">
        <rect :width="mini.w" :height="mini.h" fill="#fff" stroke="#cbd5e1" rx="3" />
        <path
          v-for="mp in miniPaths"
          :key="mp.name"
          :d="mp.d"
          fill="#e6eefb"
          stroke="#a8c0dd"
          stroke-width="0.4"
        />
        <rect
          v-if="mini.rect"
          :x="mini.rect.x0"
          :y="mini.rect.y0"
          :width="mini.rect.x1 - mini.rect.x0"
          :height="mini.rect.y1 - mini.rect.y0"
          fill="none"
          stroke="#f56c6c"
          stroke-width="1.2"
        />
        <circle :cx="mini.cx" :cy="mini.cy" r="2.4" fill="#f56c6c" />
      </g>

      <!-- ===== 底图轮廓 ===== -->
      <g v-for="poly in store.polygons" :key="poly.id">
        <polygon
          :points="polyPoints(poly)"
          :fill="poly.color"
          fill-opacity="0.22"
          :stroke="poly.color"
          stroke-width="1.6"
          @mousedown.stop="onPolyDown($event, poly)"
          @click.stop="onPolyClick($event, poly)"
        />
        <g v-if="selectedPolyId === poly.id && tool === 'select'">
          <circle
            v-for="(pt, i) in polyViewPoints(poly)"
            :key="i"
            :cx="pt.x"
            :cy="pt.y"
            r="4.5"
            fill="#fff"
            stroke="#409eff"
            stroke-width="1.8"
            @mousedown.stop="onVertexDown($event, poly, i)"
            @click.stop="onPolyClick($event, poly)"
          />
        </g>
        <text
          v-if="selectedPolyId === poly.id"
          :x="polyCenter(poly).x"
          :y="polyCenter(poly).y"
          text-anchor="middle"
          class="poly-name"
        >{{ poly.name }}</text>
      </g>

      <!-- ===== 点位 ===== -->
      <g v-for="marker in store.markers" :key="marker.id">
        <g
          :transform="`translate(${markerView(marker).x}, ${markerView(marker).y})`"
          @mousedown.stop="onMarkerDown($event, marker)"
          @click.stop="onMarkerClick($event, marker)"
        >
          <circle
            r="10"
            :fill="marker.color"
            stroke="#fff"
            stroke-width="2"
            class="marker-circle"
            :class="{ selected: store.selectedMarker?.id === marker.id }"
          />
          <text y="-14" text-anchor="middle" class="marker-text">{{ marker.name }}</text>
        </g>
      </g>

      <!-- ===== 绘制中的多边形 ===== -->
      <g v-if="drawingPoints.length">
        <polygon
          :points="drawingPoints.map(p => `${p.x},${p.y}`).join(' ')"
          fill="#409eff"
          fill-opacity="0.15"
          stroke="#409eff"
          stroke-width="1.4"
          stroke-dasharray="5 3"
        />
        <circle
          v-for="(p, i) in drawingPoints"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="3.5"
          fill="#409eff"
        />
      </g>

      <text v-if="tool === 'draw-polygon'" x="12" y="20" class="hint">单击添加顶点，双击闭合完成多边形，右键撤销顶点</text>
      <text v-else-if="tool === 'add-marker'" x="12" y="20" class="hint">单击底图放置点位，拖动点位可调整位置</text>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../../store'
import { CHINA_GEOJSON } from '../../data/chinaGeo'
import {
  projectGeoToView,
  unprojectViewToGeo,
  localToView,
  viewToLocal,
  chinaToPlane,
  normalizeRing,
} from './geoProjection'

const VIEW_W = 1000
const VIEW_H = 700

const props = defineProps({
  tool: { type: String, default: 'select' },
})
const emit = defineEmits(['select-marker', 'select-polygon'])

const POLY_COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#9c27b0', '#5470c6']

const store = useMainStore()
const svgRef = ref(null)
const selectedPolyId = ref(null)
const drawingPoints = ref([])

const isGeo = computed(() => store.coordType === 'geo')
const activeCenter = computed(() => store.activeMap.center)
const activeSpan = computed(() => store.activeMap.span)

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// ===== SVG 事件坐标换算 =====
function svgPoint(evt) {
  const rect = svgRef.value.getBoundingClientRect()
  return {
    x: ((evt.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((evt.clientY - rect.top) / rect.height) * VIEW_H,
  }
}

// ===== 点位视图坐标 =====
function markerView(marker) {
  if (marker.lon != null) {
    return projectGeoToView(marker.lon, marker.lat, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
  }
  return localToView(marker.x, marker.y, VIEW_W, VIEW_H)
}

// ===== 底图轮廓坐标 =====
function polyViewPoints(poly) {
  return poly.points.map(pt => {
    if (pt.lon != null) {
      return projectGeoToView(pt.lon, pt.lat, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
    }
    return localToView(pt.x, pt.y, VIEW_W, VIEW_H)
  })
}

function polyPoints(poly) {
  return polyViewPoints(poly).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function polyCenter(poly) {
  const pts = polyViewPoints(poly)
  if (!pts.length) return { x: 0, y: 0 }
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x: cx, y: cy }
}

// ===== 中国底图 path（当前窗口）=====
const chinaPaths = computed(() => {
  const center = activeCenter.value
  const span = activeSpan.value
  const paths = []
  CHINA_GEOJSON.features.forEach(f => {
    const coords = f.geometry.coordinates
    const parts = []
    coords.forEach(poly => {
      poly.forEach(ring => {
        let d = ''
        normalizeRing(ring).forEach((pt, j) => {
          const { x, y } = projectGeoToView(pt[0], pt[1], center, span, VIEW_W, VIEW_H)
          d += (j === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
        })
        if (ring.length) d += 'Z'
        parts.push(d)
      })
    })
    paths.push({ name: f.properties.name, d: parts.join(' ') })
  })
  return paths
})

// ===== 中国缩略图 =====
const mini = computed(() => {
  const center = activeCenter.value
  const span = activeSpan.value
  const w = 116
  const h = Math.round(w * (51 / 62))
  const plane = chinaToPlane(center.lon, center.lat, w)
  let rect = null
  if (isGeo.value) {
    const x0 = chinaToPlane(center.lon - span / 2, 0, w).x
    const x1 = chinaToPlane(center.lon + span / 2, 0, w).x
    const latSpanV = span * (h / w)
    const y0 = chinaToPlane(0, center.lat + latSpanV / 2, w).y
    const y1 = chinaToPlane(0, center.lat - latSpanV / 2, w).y
    rect = { x0, y0, x1, y1 }
  }
  return { w, h, cx: plane.x, cy: plane.y, rect }
})

const miniPaths = computed(() => {
  const w = mini.value.w
  const paths = []
  CHINA_GEOJSON.features.forEach(f => {
    const coords = f.geometry.coordinates
    const parts = []
    coords.forEach(poly => {
      poly.forEach(ring => {
        let d = ''
        normalizeRing(ring).forEach((pt, j) => {
          const { x, y } = chinaToPlane(pt[0], pt[1], w)
          d += (j === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
        })
        if (ring.length) d += 'Z'
        parts.push(d)
      })
    })
    paths.push({ name: f.properties.name, d: parts.join(' ') })
  })
  return paths
})

// ===== 交互 =====
let drag = null

function onCanvasClick(evt) {
  const p = svgPoint(evt)
  if (props.tool === 'add-marker') {
    addMarkerAt(p)
  } else if (props.tool === 'draw-polygon') {
    drawingPoints.value.push(p)
  } else {
    store.selectedMarker = null
    selectedPolyId.value = null
    emit('select-polygon', null)
  }
}

function onPolyClick(evt, poly) {
  selectedPolyId.value = poly.id
  emit('select-polygon', poly)
}

function onMarkerClick(evt, marker) {
  store.selectMarker(marker.id)
}

function addMarkerAt(p) {
  const map = store.activeMap
  let pos
  if (isGeo.value) {
    const g = unprojectViewToGeo(p.x, p.y, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
    pos = { lon: g.lon, lat: g.lat }
  } else {
    const l = viewToLocal(p.x, p.y, VIEW_W, VIEW_H)
    pos = { x: clamp(l.x, 0, 100), y: clamp(l.y, 0, 100) }
  }
  store.addMarker({
    ...pos,
    type: 'poi',
    name: '新点位',
    icon: store.dictIcon('poi') || '📍',
    color: store.typeColor('poi'),
    label: '',
    location: '',
    status: '正常',
    note: '',
  })
  const created = store.markers[store.markers.length - 1]
  store.selectMarker(created)
}

function onMarkerDown(evt, marker) {
  evt.stopPropagation()
  const p = svgPoint(evt)
  const mv = markerView(marker)
  drag = { type: 'marker', marker, dx: p.x - mv.x, dy: p.y - mv.y }
  store.selectMarker(marker)
}

function onPolyDown(evt, poly) {
  evt.stopPropagation()
  if (props.tool === 'select') {
    selectedPolyId.value = poly.id
    emit('select-polygon', poly)
  }
}

function onVertexDown(evt, poly, index) {
  evt.stopPropagation()
  const p = svgPoint(evt)
  drag = { type: 'vertex', poly, index }
}

function onMove(evt) {
  if (!drag) return
  const p = svgPoint(evt)
  if (drag.type === 'marker') {
    const nx = p.x - drag.dx
    const ny = p.y - drag.dy
    if (isGeo.value) {
      const g = unprojectViewToGeo(nx, ny, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
      store.updateMarker(drag.marker.id, {
        lon: clamp(g.lon, 73, 135),
        lat: clamp(g.lat, 3, 54),
      })
    } else {
      const l = viewToLocal(nx, ny, VIEW_W, VIEW_H)
      store.updateMarker(drag.marker.id, {
        x: clamp(l.x, 0, 100),
        y: clamp(l.y, 0, 100),
      })
    }
  } else if (drag.type === 'vertex') {
    const map = store.activeMap
    const pt = drag.poly.points[drag.index]
    let updated
    if (isGeo.value) {
      const g = unprojectViewToGeo(p.x, p.y, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
      updated = { lon: clamp(g.lon, 73, 135), lat: clamp(g.lat, 3, 54) }
    } else {
      const l = viewToLocal(p.x, p.y, VIEW_W, VIEW_H)
      updated = { x: clamp(l.x, 0, 100), y: clamp(l.y, 0, 100) }
    }
    drag.poly.points.splice(drag.index, 1, updated)
  }
}

function onUp() {
  drag = null
}

function onDblClick() {
  if (props.tool === 'draw-polygon' && drawingPoints.value.length >= 3) {
    const map = store.activeMap
    const points = drawingPoints.value.map(p => {
      if (isGeo.value) {
        const g = unprojectViewToGeo(p.x, p.y, activeCenter.value, activeSpan.value, VIEW_W, VIEW_H)
        return { lon: g.lon, lat: g.lat }
      }
      const l = viewToLocal(p.x, p.y, VIEW_W, VIEW_H)
      return { x: clamp(l.x, 0, 100), y: clamp(l.y, 0, 100) }
    })
    store.addPolygon({
      name: '轮廓' + (store.polygons.length + 1),
      points,
      color: POLY_COLORS[store.polygons.length % POLY_COLORS.length],
    })
    drawingPoints.value = []
  }
}

function undoDrawPoint() {
  drawingPoints.value.pop()
}
</script>

<style scoped>
.map-2d-editor {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
  user-select: none;
}

.marker-circle {
  cursor: move;
}

.marker-circle.selected {
  stroke: #409eff;
  stroke-width: 3;
}

.marker-text {
  font-size: 12px;
  fill: #303133;
  pointer-events: none;
}

.poly-name {
  font-size: 12px;
  fill: #606266;
  pointer-events: none;
}

.hint {
  font-size: 13px;
  fill: #909399;
  pointer-events: none;
}

.mini-map {
  pointer-events: none;
  opacity: 0.92;
}
</style>
