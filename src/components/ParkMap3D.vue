<template>
  <div class="park-map-3d" ref="containerRef">
    <canvas ref="canvasRef"></canvas>
    <div v-if="hoverMarker" class="map-tooltip">
      <div class="tooltip-title">{{ hoverMarker.icon }} {{ hoverMarker.name }}</div>
      <div class="tooltip-desc">{{ hoverMarker.location }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { useMainStore } from '../store'
import { localToScene } from './map/geoProjection'
import { defaultScene } from '../utils/mapSchema'

const props = defineProps({
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['marker-click'])

const store = useMainStore()
const containerRef = ref(null)
const canvasRef = ref(null)
const hoverMarker = ref(null)

let scene, camera, renderer, raycaster, mouse
let dataGroup, markerGroup
let animationId = null
let cameraAngle = 0
let cameraHeight = 160
let isDragging = false
let previousMouse = { x: 0, y: 0 }

// 园区逻辑坐标 → 3D 场景（与地图编辑器同一套投影；z 翻转使驾驶舱 3D 俯视与 2D 画布 y 轴方向一致）
const LOCAL_SPACE = 3
function scenePos(x, y) {
  const p = localToScene(x, y, LOCAL_SPACE)
  return { x: p.x, z: -p.z }
}

onMounted(() => {
  initScene()
  rebuildDataScene()
  rebuildMarkers()
  setupEvents()
  animate()
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})

// ===== 数据源：驾驶舱展示地图（2D / 3D 同源，一个 JSON 配置一个工厂）=====
// 仅渲染园区逻辑坐标（x/y）数据；经纬度数据不在驾驶舱 2D/3D 显示
const dashMapData = computed(() => store.dashboardMap?.data || null)
const dashMarkers = computed(() => (dashMapData.value?.markers || [])
  .filter(m => typeof m.x === 'number' && typeof m.y === 'number'))
const dashBuildings = computed(() => (dashMapData.value?.buildings || [])
  .filter(b => b.visible !== false && typeof b.x === 'number' && b.width > 0))
const dashWalls = computed(() => (dashMapData.value?.walls || [])
  .filter(w => w.visible !== false && Array.isArray(w.points) && w.points.length >= 2))
const dashPaths = computed(() => (dashMapData.value?.paths || [])
  .filter(p => p.visible !== false && Array.isArray(p.points) && p.points.length >= 2))
const dashPolygons = computed(() => (dashMapData.value?.polygons || [])
  .filter(p => p.visible !== false && Array.isArray(p.points) && p.points.length >= 2))

// 数据变化（编辑/切换展示地图）→ 全量重建（数据驱动视图）
watch(dashMapData, () => {
  rebuildDataScene()
  rebuildMarkers()
}, { deep: true })

function initScene() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0a1929, 160, 520)
  scene.background = new THREE.Color(0x0a1929)

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000)
  updateCameraPosition()

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  dataGroup = new THREE.Group()
  scene.add(dataGroup)

  markerGroup = new THREE.Group()
  scene.add(markerGroup)
}

function updateCameraPosition() {
  const radius = 220
  camera.position.x = Math.sin(cameraAngle) * radius
  camera.position.z = Math.cos(cameraAngle) * radius
  camera.position.y = cameraHeight
  camera.lookAt(0, 0, 0)
}

// ===== 数据驱动场景构建（与 2D 数据地图同源）=====
function rebuildDataScene() {
  // 清理旧灯光与数据组
  scene.children.filter(c => c.isLight).forEach(l => scene.remove(l))
  while (dataGroup.children.length > 0) {
    const c = dataGroup.children[0]
    dataGroup.remove(c)
    if (c.geometry) c.geometry.dispose()
    if (c.material) {
      const mats = Array.isArray(c.material) ? c.material : [c.material]
      mats.forEach(m => m && m.dispose && m.dispose())
    }
  }
  buildSceneConfig()
  buildPolygons()
  buildPaths()
  buildWalls()
  buildBuildings()
}

function buildSceneConfig() {
  const sc = dashMapData.value?.scene || defaultScene('local')
  scene.background = new THREE.Color(sc.background || '#0a1929')
  if (scene.fog) scene.fog.color.copy(scene.background)

  // 灯光（数据驱动）
  ;(sc.lights || []).forEach(l => {
    let light
    if (l.type === 'ambient') {
      light = new THREE.AmbientLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 0.7)
    } else if (l.type === 'directional') {
      light = new THREE.DirectionalLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 0.9)
      if (Array.isArray(l.position) && l.position.length === 3) light.position.set(...l.position)
    } else if (l.type === 'point') {
      light = new THREE.PointLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 1)
      if (Array.isArray(l.position) && l.position.length === 3) light.position.set(...l.position)
    }
    if (light) scene.add(light)
  })
  if (!scene.children.some(c => c.isLight)) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  }

  // 地面
  const groundColor = sc.ground?.color || '#0f2440'
  const groundSize = sc.ground?.size || 320
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.9, metalness: 0.1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  dataGroup.add(ground)

  // 网格
  if (sc.grid && sc.grid.show !== false) {
    const gridColor = new THREE.Color(sc.grid.color || '#1e4d8f')
    const grid = new THREE.GridHelper(sc.grid.size || groundSize, sc.grid.divisions || 20, gridColor, gridColor)
    grid.position.y = 0.02
    grid.material.transparent = true
    grid.material.opacity = 0.45
    dataGroup.add(grid)
  }
}

// 底图轮廓：半透明填充 + 发光描边（与 2D 数据地图的 polygons 一致）
function buildPolygons() {
  dashPolygons.value.forEach(poly => {
    const pts = poly.points.filter(pt => typeof pt.x === 'number')
      .map(pt => scenePos(pt.x, pt.y))
    if (pts.length < 3) return
    const shape = new THREE.Shape()
    pts.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.z)
      else shape.lineTo(p.x, p.z)
    })
    const fill = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: poly.color || '#30DCFF',
        transparent: true,
        opacity: poly.fillOpacity ?? 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    fill.rotation.x = -Math.PI / 2
    fill.position.y = 0.04
    dataGroup.add(fill)
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, 0.06, p.z))),
      new THREE.LineBasicMaterial({ color: poly.color || '#30DCFF', transparent: true, opacity: 0.8 })
    )
    dataGroup.add(line)
  })
}

// 道路（数据驱动）
function buildPaths() {
  dashPaths.value.forEach(path => {
    const pts = path.points.filter(pt => typeof pt.x === 'number')
      .map(pt => scenePos(pt.x, pt.y))
    if (pts.length < 2) return
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, 0.05, p.z))),
      new THREE.LineBasicMaterial({ color: path.color || '#3a7bfd', transparent: true, opacity: 0.85 })
    )
    dataGroup.add(line)
  })
}

// 墙体（与 3D 编辑器一致：按段拉伸 Box，位置/颜色/尺寸来自数据）
function buildWalls() {
  dashWalls.value.forEach(wall => {
    const pts = wall.points.map(p => scenePos(p[0], p[1]))
    const s = LOCAL_SPACE
    const h = Math.max(0.1, (wall.height || 4) * s)
    const t = Math.max(0.05, (wall.thickness || 0.5) * s)
    for (let i = 0; i + 1 < pts.length; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const dx = p1.x - p0.x
      const dz = p1.z - p0.z
      const len = Math.sqrt(dx * dx + dz * dz)
      if (len < 1e-6) continue
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(t, h, len),
        new THREE.MeshStandardMaterial({
          color: wall.color || '#2f6fde',
          transparent: true,
          opacity: wall.opacity ?? 0.95,
          roughness: 0.8,
          metalness: 0.1,
        })
      )
      mesh.position.set((p0.x + p1.x) / 2, h / 2, (p0.z + p1.z) / 2)
      mesh.rotation.y = Math.atan2(dx, dz)
      dataGroup.add(mesh)
    }
  })
}

// 建筑体块（width × height × depth，与 2D 俯视 width × depth 一一对应）+ 发光边缘
function buildBuildings() {
  dashBuildings.value.forEach(b => {
    const s = LOCAL_SPACE
    const pos = scenePos(b.x, b.y)
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: b.color || '#2f6fde', roughness: 0.7, metalness: 0.15 })
    )
    mesh.scale.set(b.width * s, b.height * s, b.depth * s)
    mesh.position.set(pos.x, (b.height * s) / 2, pos.z)
    mesh.userData.buildingId = b.id
    dataGroup.add(mesh)
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(b.width * s, b.height * s, b.depth * s)),
      new THREE.LineBasicMaterial({ color: '#30DCFF', transparent: true, opacity: 0.55 })
    )
    edges.position.set(pos.x, (b.height * s) / 2, pos.z)
    dataGroup.add(edges)
  })
}

// 点位标记（数据驱动）
function createMarkerMesh(marker) {
  const pos = scenePos(marker.x, marker.y)
  const group = new THREE.Group()
  group.userData = { markerId: marker.id }

  const pillarGeo = new THREE.CylinderGeometry(0.45, 0.6, 8, 8)
  const pillarMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(marker.color),
    transparent: true,
    opacity: 0.7,
  })
  const pillar = new THREE.Mesh(pillarGeo, pillarMat)
  pillar.position.set(pos.x, 4, pos.z)
  group.add(pillar)

  const dotGeo = new THREE.SphereGeometry(0.8, 16, 16)
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(marker.color) })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.position.set(pos.x, 8.2, pos.z)
  group.add(dot)

  markerGroup.add(group)
}

function rebuildMarkers() {
  while (markerGroup.children.length > 0) {
    const c = markerGroup.children[0]
    markerGroup.remove(c)
    if (c.geometry) c.geometry.dispose()
    if (c.material) c.material.dispose()
    c.children && c.children.forEach(ch => {
      if (ch.geometry) ch.geometry.dispose()
      if (ch.material) ch.material.dispose()
    })
  }
  dashMarkers.value.forEach(marker => createMarkerMesh(marker))
}

// ===== 交互（拖拽旋转 / 滚轮缩放 / 悬停与点击点位）=====
function setupEvents() {
  const container = containerRef.value
  container.addEventListener('mousedown', onMouseDown)
  container.addEventListener('mousemove', onMouseMove)
  container.addEventListener('mouseup', onMouseUp)
  container.addEventListener('wheel', onWheel)
}

function onMouseDown(e) {
  isDragging = true
  previousMouse.x = e.clientX
  previousMouse.y = e.clientY
}

function onMouseMove(e) {
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  if (isDragging) {
    const dx = e.clientX - previousMouse.x
    cameraAngle -= dx * 0.005
    updateCameraPosition()
    previousMouse.x = e.clientX
    previousMouse.y = e.clientY
  }

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(markerGroup.children, true)
  if (intersects.length > 0) {
    let obj = intersects[0].object
    while (obj.parent && !obj.userData.markerId) {
      obj = obj.parent
    }
    if (obj.userData.markerId) {
      hoverMarker.value = dashMarkers.value.find(m => m.id === obj.userData.markerId)
      return
    }
  }
  hoverMarker.value = null
}

function onMouseUp(e) {
  if (isDragging) {
    const dx = Math.abs(e.movementX)
    const dy = Math.abs(e.movementY)
    if (dx < 3 && dy < 3) {
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(markerGroup.children, true)
      if (intersects.length > 0) {
        let obj = intersects[0].object
        while (obj.parent && !obj.userData.markerId) {
          obj = obj.parent
        }
        if (obj.userData.markerId) {
          emit('marker-click', dashMarkers.value.find(m => m.id === obj.userData.markerId))
        }
      }
    }
  }
  isDragging = false
}

function onWheel(e) {
  e.preventDefault()
  cameraHeight += e.deltaY * 0.04
  cameraHeight = Math.max(90, Math.min(340, cameraHeight))
  updateCameraPosition()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
</script>

<style scoped>
.park-map-3d {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.map-tooltip {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(5, 25, 45, 0.9);
  border: 1px solid rgba(48, 220, 255, 0.3);
  padding: 8px 12px;
  pointer-events: none;
}

.tooltip-title {
  color: #30DCFF;
  font-size: 13px;
  font-weight: 600;
}

.tooltip-desc {
  color: rgba(196, 243, 254, 0.7);
  font-size: 11px;
  margin-top: 2px;
}
</style>
