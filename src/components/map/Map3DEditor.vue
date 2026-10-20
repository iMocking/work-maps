<template>
  <div ref="containerRef" class="map-3d-editor">
    <div class="hint-bar">
      <span v-if="tool === 'add-box'">单击地面放置建筑盒子，拖动盒子调整位置</span>
      <span v-else-if="tool === 'add-wall'">单击地面添加墙体顶点，双击完成墙体，右键撤销顶点</span>
      <span v-else-if="tool === 'add-marker'">单击地面放置点位</span>
      <span v-else>拖拽建筑调整位置，滚轮缩放，右键旋转视角，点击墙体/建筑/点位可选中</span>
      <span class="coord-info">{{ coordLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useMainStore } from '../../store'
import { defaultScene } from '../../utils/mapSchema'
import { CHINA_GEOJSON } from '../../data/chinaGeo'
import { geoToScene, sceneToGeo, localToScene, sceneToLocal, normalizeRing } from './geoProjection'

const props = defineProps({
  tool: { type: String, default: 'select' },
})

const store = useMainStore()
const containerRef = ref(null)

const coordLabel = computed(() => {
  const map = store.activeMap
  const d = map?.data
  return d?.coordType === 'geo'
    ? `坐标模式：经纬度 · 中心 ${d.center.lon.toFixed(3)}, ${d.center.lat.toFixed(3)}`
    : '坐标模式：园区逻辑坐标 (0-100)'
})

const isGeo = computed(() => store.coordType === 'geo')
const BOX_SIZE_SCALE = computed(() => (isGeo.value ? 6 : 1))
// 园区模式：1 逻辑单位 = 3 场景单位（与 localToScene 的 space 一致）
const LOCAL_SPACE = 3

// ===== three.js 场景 =====
let scene, camera, renderer, controls, raycaster, groundMesh
let chinaGroup = null
let lightObjects = []
const boxMeshes = new Map()   // boxId -> mesh
const markerGroups = new Map() // markerId -> group
const wallGroups = new Map()  // wallId -> group(segments)
const pathMeshes = new Map()  // pathId -> line
const labelSprites = new Map() // labelId -> sprite
const wallPreview = { points: [], line: null, dotMeshes: [] }
let draggingBox = null
let animationId = null

// 科技蓝系配色（geo 省份/要素区分用深浅蓝）
const PROVINCE_COLORS = ['#2f6fde', '#3a7bfd', '#26a6d9', '#4fc3f7', '#1e88e5', '#2b5fd9', '#64b5f6', '#30DCFF', '#1a4fb0', '#7fb3ff']

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
    area += a.x * b.z - b.x * a.z
  }
  return Math.abs(area) / 2
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// 读取当前地图 scene 配置（协议 data.scene）
function sceneConfig() {
  return store.activeMap?.data?.scene || defaultScene(store.activeMap?.data?.coordType === 'geo' ? 'geo' : 'local')
}

// ===== 场景构建（数据驱动：背景/光照/地面/网格/相机）=====
function rebuildSceneConfig() {
  const sc = sceneConfig()
  scene.background = new THREE.Color(sc.background || '#eef4fb')
  lightObjects.forEach(l => scene.remove(l))
  lightObjects = []
  ;(sc.lights || []).forEach(l => {
    let light
    if (l.type === 'ambient') {
      light = new THREE.AmbientLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 0.7)
    } else if (l.type === 'directional') {
      light = new THREE.DirectionalLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 0.9)
      if (Array.isArray(l.position) && l.position.length === 3) {
        light.position.set(l.position[0], l.position[1], l.position[2])
      }
    } else if (l.type === 'point') {
      light = new THREE.PointLight(new THREE.Color(l.color || '#ffffff'), l.intensity ?? 1)
      if (Array.isArray(l.position) && l.position.length === 3) {
        light.position.set(l.position[0], l.position[1], l.position[2])
      }
    }
    if (light) {
      lightObjects.push(light)
      scene.add(light)
    }
  })
  // 至少保证一盏环境光，避免场景全黑
  if (!lightObjects.length) {
    const fallback = new THREE.AmbientLight(0xffffff, 0.7)
    lightObjects.push(fallback)
    scene.add(fallback)
  }
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
  // 删除旧网格辅助
  scene.children.filter(c => c.name === 'grid-helper').forEach(c => scene.remove(c))
  const sc = sceneConfig()
  const isGeoMode = isGeo.value
  const size = sc.ground?.size || (isGeoMode ? 1100 : 320)
  const geo = new THREE.PlaneGeometry(size, size)
  const mat = new THREE.MeshBasicMaterial({
    color: sc.ground?.color || '#0f2440',
    transparent: true,
    opacity: sc.ground?.opacity ?? 0.55,
    side: THREE.DoubleSide,
  })
  groundMesh = new THREE.Mesh(geo, mat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = -0.05
  groundMesh.userData.ground = true
  scene.add(groundMesh)

  const gridCfg = sc.grid
  if (gridCfg && gridCfg.show !== false) {
    const gridSize = gridCfg.size || (isGeoMode ? 100 : 20)
    const gridDiv = gridCfg.divisions || (isGeoMode ? 100 : 10)
    const grid = new THREE.GridHelper(gridSize, gridDiv, gridCfg.color || 0x93b5dd, gridCfg.color || 0xd5e2f2)
    grid.position.y = 0.01
    grid.name = 'grid-helper'
    scene.add(grid)
  }
}

// ===== 点位标记 =====
function makeTextSprite(text, color = '#303133', fontSize = 34, bgColor = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
  const tw = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillRect(8, 12, tw + 32, 120)
  ctx.strokeStyle = bgColor
  ctx.lineWidth = 5
  ctx.strokeRect(8, 12, tw + 32, 120)
  ctx.fillStyle = color
  ctx.fillText(text, 24, 100)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  const scale = (tw + 40) / 120
  sprite.scale.set(scale, scale * 0.32, 1)
  return sprite
}

function makeLabelSprite(text, bgColor) {
  return makeTextSprite(text, '#303133', 34, bgColor)
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
  return localToScene(marker.x, marker.y, LOCAL_SPACE)
}

// ===== 建筑盒子 =====
function syncBoxes() {
  const ids = new Set()
  store.buildings.forEach(box => {
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
    const selected = store.selectedBuildingId === box.id
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
  return localToScene(box.x, box.y, LOCAL_SPACE)
}

// ===== 墙体（数据驱动：位置/颜色/尺寸）=====
// points: [[x,y],...]（园区逻辑坐标）或 [[lon,lat],...]（经纬度）
function wallScenePoints(wall) {
  return (wall.points || []).map(p => {
    if (Array.isArray(p)) {
      if (isGeo.value) return geoToScene(p[0], p[1])
      return localToScene(p[0], p[1], LOCAL_SPACE)
    }
    if (p && p.lon != null) return geoToScene(p.lon, p.lat)
    return localToScene(p.x, p.y, LOCAL_SPACE)
  })
}

// 将墙体顶点按段生成立体墙（Box 拉伸）
function buildWallSegments(wall, selected) {
  const pts = wallScenePoints(wall)
  const s = BOX_SIZE_SCALE.value
  const h = Math.max(0.1, (wall.height || 4) * s)
  const t = Math.max(0.05, (wall.thickness || 0.5) * s)
  const group = new THREE.Group()
  group.userData.wallId = wall.id
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const dx = p1.x - p0.x
    const dz = p1.z - p0.z
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 1e-6) continue
    const mat = new THREE.MeshLambertMaterial({
      color: wall.color || '#2f6fde',
      transparent: true,
      opacity: wall.opacity ?? 0.95,
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), mat)
    mesh.position.set((p0.x + p1.x) / 2, h / 2, (p0.z + p1.z) / 2)
    mesh.rotation.y = Math.atan2(dx, dz)
    mesh.userData.wallId = wall.id
    group.add(mesh)
  }
  // 选中高亮：整个墙体线框发光
  if (selected) {
    const box = new THREE.Box3().setFromObject(group)
    if (!box.isEmpty()) {
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
      ))
      const edgeMat = new THREE.LineBasicMaterial({ color: '#409eff', transparent: true, opacity: 0.9 })
      const edgeLine = new THREE.LineSegments(edges, edgeMat)
      edgeLine.position.set(
        (box.max.x + box.min.x) / 2,
        (box.max.y + box.min.y) / 2,
        (box.max.z + box.min.z) / 2
      )
      group.add(edgeLine)
    }
  }
  return group
}

function syncWalls() {
  const ids = new Set()
  store.walls.forEach(wall => {
    ids.add(wall.id)
    let g = wallGroups.get(wall.id)
    const selected = store.selectedWallId === wall.id
    if (!g) {
      g = buildWallSegments(wall, selected)
      wallGroups.set(wall.id, g)
      scene.add(g)
    } else {
      // 更新位置/颜色/尺寸/选中态
      scene.remove(g)
      g.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      g = buildWallSegments(wall, selected)
      wallGroups.set(wall.id, g)
      scene.add(g)
    }
  })
  wallGroups.forEach((g, id) => {
    if (!ids.has(id)) {
      scene.remove(g)
      g.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      wallGroups.delete(id)
    }
  })
}

// ===== 道路/连线 =====
function syncPaths() {
  const ids = new Set()
  store.paths.forEach(path => {
    ids.add(path.id)
    let line = pathMeshes.get(path.id)
    const pts = (path.points || []).map(pt => {
      const pos = pt.lon != null ? geoToScene(pt.lon, pt.lat) : localToScene(pt.x, pt.y, LOCAL_SPACE)
      return new THREE.Vector3(pos.x, 0.06, pos.z)
    })
    if (!pts.length) return
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const color = new THREE.Color(path.color || '#909399')
    const mat = path.dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 2.5, linewidth: 1 })
      : new THREE.LineBasicMaterial({ color })
    line = new THREE.Line(geo, mat)
    if (path.dashed) line.computeLineDistances()
    line.userData.pathId = path.id
    pathMeshes.set(path.id, line)
    scene.add(line)
  })
  pathMeshes.forEach((line, id) => {
    if (!ids.has(id)) {
      scene.remove(line)
      line.geometry.dispose()
      line.material.dispose()
      pathMeshes.delete(id)
    }
  })
}

// ===== 文字标签 =====
function syncLabels() {
  const ids = new Set()
  store.labels.forEach(label => {
    ids.add(label.id)
    let sprite = labelSprites.get(label.id)
    if (!sprite) {
      sprite = makeTextSprite(label.text || label.name || '', label.color || '#303133', 40, label.color || '#409eff')
      labelSprites.set(label.id, sprite)
      scene.add(sprite)
    }
    const pos = localToScene(label.x, label.y, LOCAL_SPACE)
    const z = label.z || 0
    sprite.position.set(pos.x, 8 + z, pos.z)
  })
  labelSprites.forEach((sprite, id) => {
    if (!ids.has(id)) {
      scene.remove(sprite)
      sprite.material.dispose()
      labelSprites.delete(id)
    }
  })
}

// ===== 墙体绘制预览 =====
function renderWallPreview() {
  clearWallPreview()
  if (wallPreview.points.length === 0) return
  if (wallPreview.points.length >= 2) {
    const geo = new THREE.BufferGeometry().setFromPoints(wallPreview.points)
    const mat = new THREE.LineBasicMaterial({ color: '#409eff', transparent: true, opacity: 0.8 })
    wallPreview.line = new THREE.Line(geo, mat)
    scene.add(wallPreview.line)
  }
  wallPreview.points.forEach(p => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#409eff' })
    )
    dot.position.copy(p)
    scene.add(dot)
    wallPreview.dotMeshes.push(dot)
  })
}

function clearWallPreview() {
  if (wallPreview.line) {
    scene.remove(wallPreview.line)
    wallPreview.line.geometry.dispose()
    wallPreview.line.material.dispose()
    wallPreview.line = null
  }
  wallPreview.dotMeshes.forEach(d => {
    scene.remove(d)
    d.geometry.dispose()
    d.material.dispose()
  })
  wallPreview.dotMeshes = []
}

function finishWallDraw() {
  if (wallPreview.points.length < 2) {
    clearWallPreview()
    return
  }
  const wall = {
    name: '墙体' + (store.walls.length + 1),
    points: wallPreview.points.map(p => {
      if (isGeo.value) {
        const g = sceneToGeo(p.x, p.z)
        return [clamp(g.lon, 73, 135), clamp(g.lat, 3, 54)]
      }
      const l = sceneToLocal(p.x, p.z, LOCAL_SPACE)
      return [clamp(l.x, 0, 100), clamp(l.y, 0, 100)]
    }),
    height: 4,
    thickness: 0.6,
    color: PROVINCE_COLORS[store.walls.length % PROVINCE_COLORS.length],
    opacity: 0.95,
    visible: true,
    note: '',
  }
  const id = store.addWall(wall)
  store.selectWall(id)
  clearWallPreview()
}

// ===== 相机 =====
function resetCamera() {
  const sc = sceneConfig()
  const cam = sc.camera || {}
  if (isGeo.value) {
    camera.position.set(...(cam.position || [0, 720, 860]))
    controls.target.set(...(cam.target || [0, 0, 0]))
  } else {
    camera.position.set(...(cam.position || [0, 320, 380]))
    controls.target.set(...(cam.target || [0, 0, 0]))
  }
  controls.update()
}

// ===== 初始化 =====
function initScene() {
  const container = containerRef.value
  const width = container.clientWidth || 900
  const height = container.clientHeight || 600
  const sc = sceneConfig()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(sc.background || '#eef4fb')
  camera = new THREE.PerspectiveCamera(sc.camera?.fov || 50, width / height, 0.1, 5000)
  camera.position.set(...(sc.camera?.position || [0, 320, 380]))
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  container.appendChild(renderer.domElement)

  rebuildSceneConfig()

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
  renderer.domElement.addEventListener('dblclick', onDblClick)
  renderer.domElement.addEventListener('contextmenu', onCtxMenu)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  buildGround()
  buildChina()
  syncMarkers()
  syncBoxes()
  syncWalls()
  syncPaths()
  syncLabels()
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

  // 绘制墙体时：只在地面加点，不触发选择
  if (props.tool === 'add-wall') {
    const groundHits = raycaster.intersectObject(groundMesh, false)
    if (groundHits.length) {
      wallPreview.points.push(groundHits[0].point.clone())
      renderWallPreview()
    }
    return
  }

  // 1) 建筑盒子（可拖动）
  const boxHits = raycaster.intersectObjects([...boxMeshes.values()], false)
  if (boxHits.length) {
    const mesh = boxHits[0].object
    const box = store.buildings.find(b => b.id === mesh.userData.boxId)
    if (box) {
      store.selectBuilding(box.id)
      store.selectedMarker = null
      store.selectedWallId = null
      draggingBox = box
      controls.enabled = false
      renderer.domElement.style.cursor = 'grabbing'
    }
    return
  }

  // 2) 墙体（选中）
  const wallMeshes = []
  wallGroups.forEach(g => g.traverse(obj => { if (obj.isMesh) wallMeshes.push(obj) }))
  const wallHits = raycaster.intersectObjects(wallMeshes, false)
  if (wallHits.length) {
    const wid = wallHits[0].object.userData.wallId
    if (wid != null) {
      store.selectWall(wid)
      store.selectedMarker = null
      store.selectedBuildingId = null
      return
    }
  }

  // 3) 点位
  const markerHits = raycaster.intersectObjects(
    [...markerGroups.values()].map(g => g.sphere),
    false
  )
  if (markerHits.length) {
    const marker = store.markers.find(m => m.id === markerHits[0].object.userData.markerId)
    if (marker) {
      store.selectMarker(marker)
      store.selectedBuildingId = null
      store.selectedWallId = null
    }
    return
  }

  // 4) 空白处：按当前工具处理
  if (props.tool === 'add-box') {
    const groundHits = raycaster.intersectObject(groundMesh, false)
    if (groundHits.length) placeBox(groundHits[0].point)
  } else if (props.tool === 'add-marker') {
    const groundHits = raycaster.intersectObject(groundMesh, false)
    if (groundHits.length) placeMarker(groundHits[0].point)
  }
}

function onDblClick() {
  if (props.tool === 'add-wall') {
    finishWallDraw()
  }
}

function onCtxMenu(e) {
  e.preventDefault()
  if (props.tool === 'add-wall' && wallPreview.points.length) {
    wallPreview.points.pop()
    renderWallPreview()
  }
}

function placeMarker(point) {
  let pos
  if (isGeo.value) {
    pos = sceneToGeo(point.x, point.z)
  } else {
    pos = sceneToLocal(point.x, point.z, LOCAL_SPACE)
  }
  const marker = {
    name: '新点位',
    type: 'poi',
    icon: store.dictIcon('poi') || '📍',
    color: store.typeColor('poi'),
    label: '',
    location: '',
    status: '正常',
    note: '',
  }
  let created
  if (isGeo.value) {
    created = store.addMarker({ ...marker, lon: pos.lon, lat: pos.lat })
  } else {
    created = store.addMarker({
      ...marker,
      x: clamp(pos.x, 0, 100),
      y: clamp(pos.y, 0, 100),
    })
  }
  store.selectMarker(created.id)
}

function placeBox(point) {
  let pos
  if (isGeo.value) {
    pos = sceneToGeo(point.x, point.z)
  } else {
    pos = sceneToLocal(point.x, point.z, LOCAL_SPACE)
  }
  const box = {
    name: '建筑' + (store.buildings.length + 1),
    color: PROVINCE_COLORS[store.buildings.length % PROVINCE_COLORS.length],
    width: isGeo.value ? 10 : 10,
    height: 8,
    depth: isGeo.value ? 10 : 8,
  }
  if (isGeo.value) {
    store.addBuilding({ ...box, lon: pos.lon, lat: pos.lat })
  } else {
    store.addBuilding({ ...box, x: pos.x, y: pos.y })
  }
  store.selectBuilding(store.buildings[store.buildings.length - 1].id)
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
    store.updateBuilding(draggingBox.id, { lon: g.lon, lat: g.lat })
  } else {
    const l = sceneToLocal(p.x, p.z, LOCAL_SPACE)
    store.updateBuilding(draggingBox.id, { x: clamp(l.x, 0, 100), y: clamp(l.y, 0, 100) })
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
  clearWallPreview()
  rebuildSceneConfig()
  buildGround()
  buildChina()
  syncMarkers()
  syncBoxes()
  syncWalls()
  syncPaths()
  syncLabels()
  resetCamera()
})

watch(() => store.buildings, syncBoxes, { deep: true })
watch(() => store.markers, syncMarkers, { deep: true })
watch(() => store.walls, syncWalls, { deep: true })
watch(() => store.paths, syncPaths, { deep: true })
watch(() => store.labels, syncLabels, { deep: true })
watch(() => store.selectedBuildingId, () => syncBoxes())
watch(() => store.selectedMarker, () => syncMarkers(), { deep: true })
watch(() => store.selectedWallId, () => syncWalls())

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', null)
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('dblclick', onDblClick)
    renderer.domElement.removeEventListener('contextmenu', onCtxMenu)
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
