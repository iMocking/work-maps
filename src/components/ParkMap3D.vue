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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { useMainStore } from '../store'

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
let markerGroup
let animationId = null
let cameraAngle = 0
let cameraHeight = 18
let isDragging = false
let previousMouse = { x: 0, y: 0 }

onMounted(() => {
  initScene()
  createGround()
  createBuildings()
  createMarkers()
  setupEvents()
  animate()
})

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
})

watch(() => store.markers, () => {
  rebuildMarkers()
}, { deep: true })

function initScene() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  // 场景
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0a1929, 15, 60)
  scene.background = new THREE.Color(0x0a1929)

  // 相机
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  updateCameraPosition()

  // 渲染器
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  scene.add(directionalLight)

  // 射线拾取
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // 标记组
  markerGroup = new THREE.Group()
  scene.add(markerGroup)
}

function updateCameraPosition() {
  const radius = 25
  camera.position.x = Math.sin(cameraAngle) * radius
  camera.position.z = Math.cos(cameraAngle) * radius
  camera.position.y = cameraHeight
  camera.lookAt(0, 0, 0)
}

function createGround() {
  // 地面
  const groundGeo = new THREE.PlaneGeometry(50, 50)
  const groundMat = new THREE.MeshBasicMaterial({
    color: 0x0d2137,
    transparent: true,
    opacity: 0.8,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // 网格
  const gridHelper = new THREE.GridHelper(50, 50, 0x1a4a6a, 0x143a52)
  gridHelper.position.y = 0.01
  scene.add(gridHelper)
}

function createBuildings() {
  const buildings = [
    { x: -8, z: -5, w: 6, d: 5, h: 4, color: 0x1e5a8a },
    { x: 2, z: -6, w: 5, d: 4, h: 3, color: 0x1a4a7a },
    { x: 8, z: -3, w: 4, d: 6, h: 5, color: 0x2a6a9a },
    { x: -5, z: 5, w: 5, d: 5, h: 3.5, color: 0x1e5a8a },
    { x: 5, z: 6, w: 6, d: 4, h: 4.5, color: 0x1a4a7a },
    { x: 0, z: 0, w: 4, d: 3, h: 2.5, color: 0x2a6a9a },
  ]

  buildings.forEach(b => {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d)
    const mat = new THREE.MeshStandardMaterial({
      color: b.color,
      transparent: true,
      opacity: 0.9,
      metalness: 0.3,
      roughness: 0.7,
    })
    const building = new THREE.Mesh(geo, mat)
    building.position.set(b.x, b.h / 2, b.z)
    scene.add(building)

    // 发光边框
    const edges = new THREE.EdgesGeometry(geo)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x30DCFF, transparent: true, opacity: 0.6 })
    const wireframe = new THREE.LineSegments(edges, lineMat)
    wireframe.position.copy(building.position)
    scene.add(wireframe)
  })
}

function createMarkers() {
  store.markers.forEach(marker => {
    const x = (marker.x - 50) * 0.4
    const z = (marker.y - 50) * 0.4

    // 光柱
    const pillarGeo = new THREE.CylinderGeometry(0.05, 0.1, 3, 8)
    const pillarMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(marker.color),
      transparent: true,
      opacity: 0.7,
    })
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(x, 1.5, z)
    pillar.userData = { marker, type: 'marker' }
    markerGroup.add(pillar)

    // 顶部光点
    const dotGeo = new THREE.SphereGeometry(0.2, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(marker.color),
    })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(x, 3, z)
    dot.userData = { marker, type: 'marker' }
    markerGroup.add(dot)
  })
}

function rebuildMarkers() {
  // 清除旧标记
  while (markerGroup.children.length > 0) {
    markerGroup.remove(markerGroup.children[0])
  }
  createMarkers()
}

function setupEvents() {
  const canvas = canvasRef.value

  canvas.addEventListener('click', onClick)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mouseleave', onMouseUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  window.addEventListener('resize', onResize)
}

function onClick(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(markerGroup.children)

  if (intersects.length > 0) {
    const marker = intersects[0].object.userData.marker
    if (marker) {
      emit('marker-click', marker)
    }
  }
}

function onMouseMove(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(markerGroup.children)

  if (intersects.length > 0) {
    hoverMarker.value = intersects[0].object.userData.marker
    canvasRef.value.style.cursor = 'pointer'
  } else {
    hoverMarker.value = null
    canvasRef.value.style.cursor = isDragging ? 'grabbing' : 'grab'
  }

  // 拖动旋转
  if (isDragging) {
    const deltaX = event.clientX - previousMouse.x
    cameraAngle += deltaX * 0.005
    updateCameraPosition()
  }

  previousMouse = { x: event.clientX, y: event.clientY }
}

function onMouseDown(event) {
  isDragging = true
  previousMouse = { x: event.clientX, y: event.clientY }
  canvasRef.value.style.cursor = 'grabbing'
}

function onMouseUp() {
  isDragging = false
  canvasRef.value.style.cursor = 'grab'
}

function onWheel(event) {
  event.preventDefault()
  cameraHeight = Math.max(10, Math.min(40, cameraHeight + event.deltaY * 0.02))
  updateCameraPosition()
}

function onResize() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
</script>

<style scoped>
.park-map-3d {
  position: absolute;
  inset: 0;
  background: #0a1929;
}

.park-map-3d canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}

.map-tooltip {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 12px 16px;
  background: rgba(5, 25, 45, 0.95);
  border: 1px solid rgba(48, 220, 255, 0.5);
  z-index: 100;
  pointer-events: none;
}

.tooltip-title {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tooltip-desc {
  color: rgba(128, 222, 234, 0.8);
  font-size: 12px;
}
</style>
