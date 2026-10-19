<template>
  <div ref="containerRef" class="map-3d-editor">
    <div class="hint-bar">
      <span v-if="tool === 'add-box'">单击地面放置建筑盒子，拖动盒子调整位置</span>
      <span v-else>拖拽盒子调整位置，滚轮缩放，右键旋转视角</span>
      <span class="coord-info">{{ coordLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useMainStore } from '../../store'
import { CHINA_GEOJSON } from '../../data/chinaGeo'
import { geoToScene, sceneToGeo, localToScene, sceneToLocal, normalizeRing } from './geoProjection'

const props = defineProps({
  tool: { type: String, default: 'select' },
})

const store = useMainStore()
const containerRef = ref(null)

const coordLabel = computed(() => {
  const map = store.activeMap
  return map.coordType === 'geo'
    ? `坐标模式：经纬度 · 中心 ${map.center.lon.toFixed(3)}, ${map.center.lat.toFixed(3)}`
    : '坐标模式：园区逻辑坐标 (0-100)'
})

const isGeo = computed(() => store.coordType === 'geo')
const BOX_SIZE_SCALE = computed(() => (isGeo.value ? 6 : 1))

// ===== three.js 场景 =====
let scene, camera, renderer, controls, raycaster, groundMesh
let chinaGroup = null
const boxMeshes = new Map()   // boxId -> mesh
const markerGroups = new Map() // markerId -> group
let draggingBox = null
let animationId = null

const PROVINCE_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#36a3f7']

function provinceColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return PROVINCE_COLORS[Math.abs(hash) % PROVINCE_COLORS.length]
}

function polyArea(pts) {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    area += a.x * b.y - b.x * a.y
  }
  return Math.abs(area) / 2
}

// 中国省级 3D 台面
function buildChina() {
  if (chinaGroup) {
    scene.remove(chinaGroup)
    chinaGroup.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
    chinaGroup = null
  }
  if (!isGeo.value) return
  chinaGroup = new THREE.Group()
  const areas = []
  CHINA_GEOJSON.features.forEach(f => {
    let area = 0
    f.geometry.coordinates.forEach(poly => {
      const pts = normalizeRing(poly[0]).map(pt => geoToScene(pt[0], pt[1]))
      area += polyArea(pts)
    })
    areas.push({ name: f.properties.name, area })
  })
  const maxArea = Math.max(...areas.map(a => a.area), 1)
  CHINA_GEOJSON.features.forEach((f, idx) => {
    const name = f.properties.name
    const baseH = Math.max(0.8, Math.sqrt(areas[idx].area / maxArea) * 9)
    f.geometry.coordinates.forEach(poly => {
      const outer = normalizeRing(poly[0])
      if (outer.length < 3) return
      const shape = new THREE.Shape()
      outer.forEach((pt, i) => {
        const { x, z } = geoToScene(pt[0], pt[1])
        if (i === 0) shape.moveTo(x, z)
        else shape.lineTo(x, z)
      })
      for (let r = 1; r < poly.length; r++) {
        const hole = new THREE.Path()
        normalizeRing(poly[r]).forEach((pt, i) => {
          const { x, z } = geoToScene(pt[0], pt[1])
          if (i === 0) hole.moveTo(x, z)
          else hole.lineTo(x, z)
        })
        shape.holes.push(hole)
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: baseH, bevelEnabled: false })
      const color = provinceColor(name)
      const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = 0
      mesh.userData.province = name
      chinaGroup.add(mesh)
    })
  })
  scene.add(chinaGroup)
}

function buildGround() {
  if (groundMesh) {
    scene.remove(groundMesh)
    groundMesh.geometry.dispose()
    groundMesh.material.dispose()
  }
  const size = isGeo.value ? 1100 : 320
  const geo = new THREE.PlaneGeometry(size, size)
  const mat = new THREE.MeshBasicMaterial({ color: '#f0f4fa', transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  groundMesh = new THREE.Mesh(geo, mat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = -0.05
  groundMesh.userData.ground = true
  scene.add(groundMesh)

  // 网格辅助
  const gridSize = isGeo.value ? 100 : 20
  const gridDiv = isGeo.value ? 100 : 10
  const grid = new THREE.GridHelper(gridSize, gridDiv, 0x93b5dd, 0xd5e2f2)
  grid.position.y = 0
  grid.name = 'grid-helper'
  scene.add(grid)
}

// ===== 点位标记 =====
function makeLabelSprite(text, bgColor) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  const fontSize = 34
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
  const tw = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillRect(8, 12, tw + 32, 72)
  ctx.strokeStyle = bgColor
  ctx.lineWidth = 4
  ctx.strokeRect(8, 12, tw + 32, 72)
  ctx.fillStyle = '#303133'
  ctx.fillText(text, 24, 62)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  const scale = (tw + 40) / 120
  sprite.scale.set(scale, scale * 0.35, 1)
  return sprite
}

function syncMarkers() {
  const ids = new Set()
  store.markers.forEach(marker => {
    ids.add(marker.id)
    let g = markerGroups.get(marker.id)
    if (!g) {
      g = new THREE.Group()
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshLambertMaterial({ color: marker.color })
      )
      sphere.userData.markerId = marker.id
      g.sphere = sphere
      g.add(sphere)
      g.label = makeLabelSprite(marker.name, marker.color)
      g.label.position.y = 4
      g.add(g.label)
      markerGroups.set(marker.id, g)
      scene.add(g)
    }
    const pos = markerScenePos(marker)
    const r = isGeo.value ? 5 : 3
    g.position.set(pos.x, r, pos.z)
    g.sphere.scale.setScalar(r)
    const selected = store.selectedMarker?.id === marker.id
    g.sphere.material.emissive = selected ? new THREE.Color('#409eff') : new THREE.Color(0x000000)
    g.label.material.opacity = selected ? 1 : 0.7
  })
  // 清理已删除
  markerGroups.forEach((g, id) => {
    if (!ids.has(id)) {
      scene.remove(g)
      g.sphere.geometry.dispose()
      g.sphere.material.dispose()
      g.label.material.dispose()
      markerGroups.delete(id)
    }
  })
}

function markerScenePos(marker) {
  if (marker.lon != null) return geoToScene(marker.lon, marker.lat)
  return localToScene(marker.x, marker.y, 3)
}

// ===== 建筑盒子 =====
function syncBoxes() {
  const ids = new Set()
  store.boxes.forEach(box => {
    ids.add(box.id)
    let mesh = boxMeshes.get(box.id)
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshLambertMaterial({ color: box.color })
      )
      mesh.userData.boxId = box.id
      boxMeshes.set(box.id, mesh)
      scene.add(mesh)
    }
    const s = BOX_SIZE_SCALE.value
    mesh.scale.set(box.width * s, box.height * s, box.depth * s)
    const pos = boxScenePos(box)
    mesh.position.set(pos.x, (box.height * s) / 2, pos.z)
    const selected = store.selectedBoxId === box.id
    mesh.material.emissive = selected ? new THREE.Color('#409eff') : new THREE.Color(0x000000)
  })
  boxMeshes.forEach((mesh, id) => {
    if (!ids.has(id)) {
      scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
      boxMeshes.delete(id)
    }
  })
}

function boxScenePos(box) {
  if (box.lon != null) return geoToScene(box.lon, box.lat)
  return localToScene(box.x, box.y, 3)
}

// ===== 相机 =====
function resetCamera() {
  if (isGeo.value) {
    camera.position.set(0, 720, 860)
    controls.target.set(0, 0, 0)
  } else {
    camera.position.set(0, 320, 380)
    controls.target.set(0, 0, 0)
  }
  controls.update()
}

// ===== 初始化 =====
function initScene() {
  const container = containerRef.value
  const width = container.clientWidth || 900
  const height = container.clientHeight || 600
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef4fb')
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000)
  camera.position.set(0, 320, 380)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(300, 600, 200)
  scene.add(dir)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.12
  controls.maxPolarAngle = Math.PI / 2.05

  raycaster = new THREE.Raycaster()

  const resize = () => {
    const w = container.clientWidth || 900
    const h = container.clientHeight || 600
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', resize)

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  buildGround()
  buildChina()
  syncMarkers()
  syncBoxes()
  resetCamera()

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()
}

// ===== 交互 =====
function getNdc(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
  }
}

function onPointerDown(e) {
  const ndc = getNdc(e)
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera)
  const boxHits = raycaster.intersectObjects([...boxMeshes.values()], false)
  if (boxHits.length) {
    const mesh = boxHits[0].object
    const box = store.boxes.find(b => b.id === mesh.userData.boxId)
    if (box) {
      store.selectBox(box.id)
      draggingBox = box
      controls.enabled = false
      renderer.domElement.style.cursor = 'grabbing'
    }
    return
  }
  const markerHits = raycaster.intersectObjects(
    [...markerGroups.values()].map(g => g.sphere),
    false
  )
  if (markerHits.length) {
    const marker = store.markers.find(m => m.id === markerHits[0].object.userData.markerId)
    if (marker) store.selectMarker(marker)
    return
  }
  // 空白处：add-box 工具放置盒子
  if (props.tool === 'add-box') {
    const groundHits = raycaster.intersectObject(groundMesh, false)
    if (groundHits.length) {
      placeBox(groundHits[0].point)
    }
  }
}

function placeBox(point) {
  let pos
  if (isGeo.value) {
    pos = sceneToGeo(point.x, point.z)
  } else {
    pos = sceneToLocal(point.x, point.z, 3)
  }
  const box = {
    name: '建筑' + (store.boxes.length + 1),
    color: PROVINCE_COLORS[store.boxes.length % PROVINCE_COLORS.length],
    width: isGeo.value ? 10 : 10,
    height: 8,
    depth: isGeo.value ? 10 : 8,
  }
  if (isGeo.value) {
    store.addBox({ ...box, lon: pos.lon, lat: pos.lat })
  } else {
    store.addBox({ ...box, x: pos.x, y: pos.y })
  }
  store.selectBox(store.boxes[store.boxes.length - 1].id)
}

function onPointerMove(e) {
  if (!draggingBox) return
  const ndc = getNdc(e)
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera)
  const hits = raycaster.intersectObject(groundMesh, false)
  if (!hits.length) return
  const p = hits[0].point
  if (isGeo.value) {
    const g = sceneToGeo(p.x, p.z)
    store.updateBox(draggingBox.id, { lon: g.lon, lat: g.lat })
  } else {
    const l = sceneToLocal(p.x, p.z, 3)
    store.updateBox(draggingBox.id, { x: Math.min(100, Math.max(0, l.x)), y: Math.min(100, Math.max(0, l.y)) })
  }
}

function onPointerUp() {
  if (draggingBox) {
    draggingBox = null
    controls.enabled = true
    renderer.domElement.style.cursor = 'default'
  }
}

// ===== 响应式同步 =====
watch(() => store.activeMap.id, () => {
  draggingBox = null
  buildGround()
  buildChina()
  syncMarkers()
  syncBoxes()
  resetCamera()
})

watch(() => store.boxes, syncBoxes, { deep: true })
watch(() => store.markers, syncMarkers, { deep: true })
watch(() => store.selectedBoxId, () => syncBoxes())
watch(() => store.selectedMarker, () => syncMarkers(), { deep: true })

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', null)
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
})
</script>

<style scoped>
.map-3d-editor {
  position: relative;
  width: 100%;
  height: 100%;
  background: #eef4fb;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.hint-bar {
  position: absolute;
  top: 10px;
  left: 12px;
  z-index: 5;
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  pointer-events: none;
}

.coord-info {
  color: #909399;
}
</style>
