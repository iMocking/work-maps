// ============================================================
// 地图 JSON 数据协议（Smart Factory 概念）
// ------------------------------------------------------------
// 一张园区/物联网地图 = 一个 JSON 文件，可完整重建 2D + 3D 场景。
// 顶层固定结构（用户指定）：
//   {
//     mapName:     "",   // 地图名称
//     description: "",   // 描述
//     createdAt:   "",   // 创建时间
//     remark:      "",   // 备注
//     data: { ... }      // 渲染数据：记录地图渲染所需的全部数据
//   }
//
// data 内部按要素分层组织，渲染端完全由数据驱动：
//   scene      3D 场景配置（背景/地面/网格/光照/相机初始位）
//   walls      墙体（3D 渲染：位置、颜色、尺寸）
//   buildings  建筑体块（2D 平面 + 3D 拉伸）
//   markers    点位（设备/POI，2D 图标 + 3D 标记）
//   polygons   底图轮廓（区域/水域/围墙线面）
//   paths      道路/连线（路径线）
//   labels     文字标签
//   meta       扩展元信息（author/version/tags/extensions 开放字段）
//
// 坐标体系：
//   local —— 园区逻辑坐标，x/y ∈ [0,100]，z 为高度（逻辑单位）
//   geo   —— 真实经纬度，center/span 定义视图窗口
// ============================================================

export const SCHEMA_VERSION = '1.0'

// ===== 默认 3D 场景配置（按坐标模式区分）=====
// 科技蓝统一配色：深蓝底 + 蓝色网格 + 冷色光，与驾驶舱深蓝 UI 一致
export function defaultScene(coordType = 'local') {
  const isGeo = coordType === 'geo'
  return {
    background: '#0a1929',
    ground: { color: '#0f2440', opacity: 0.85, size: isGeo ? 1100 : 320 },
    grid: { show: true, size: isGeo ? 1100 : 320, divisions: isGeo ? 100 : 20, color: '#1e4d8f' },
    lights: [
      { type: 'ambient', color: '#cfe8ff', intensity: 0.75 },
      { type: 'directional', color: '#9fd8ff', intensity: 0.9, position: [300, 600, 200] },
    ],
    camera: { fov: 50, position: isGeo ? [0, 720, 860] : [0, 320, 380], target: [0, 0, 0] },
  }
}

export function defaultRange(coordType = 'local') {
  return coordType === 'geo'
    ? { x: [73, 135], y: [3, 54], z: [0, 100] }
    : { x: [0, 100], y: [0, 100], z: [0, 50] }
}

// ===== 空标准 JSON（新建/导出兜底）=====
export function emptyMapJson(coordType = 'local') {
  const now = formatNow()
  return {
    mapName: '',
    description: '',
    createdAt: now,
    remark: '',
    data: {
      schemaVersion: SCHEMA_VERSION,
      coordType,
      baseMap: coordType === 'geo' ? 'china' : 'grid',
      center: { lon: 114.3, lat: 30.55 },
      span: coordType === 'geo' ? 0.45 : 0.1,
      range: defaultRange(coordType),
      scene: defaultScene(coordType),
      walls: [],
      buildings: [],
      markers: [],
      polygons: [],
      paths: [],
      labels: [],
      meta: { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
    },
  }
}

// ===== 基础工具 =====
export function formatNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function genId(prefix = 'el') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// 深拷贝（避免导入数据与外部引用共享）
export function deepClone(v) {
  if (v === undefined || v === null) return v
  return JSON.parse(JSON.stringify(v))
}

// ===== 内部模型 ↔ 标准 JSON =====
// 内部模型与协议模型已统一：一个地图 = { id(运行时), mapName, description, createdAt, remark, data }
// id 仅用于应用内地图切换/持久化索引，不属于协议字段。

// 导出：内部 map → 标准 JSON（仅剔除运行时 id，其余即协议结构）
export function mapToJson(map) {
  if (!map) return null
  const { id, ...rest } = map
  return JSON.parse(JSON.stringify(rest))
}

// 导入：标准 JSON → 内部 map 数据（校验通过后调用；缺失字段补默认值，id 由 store 生成）
export function jsonToMapData(json) {
  const d = json.data || {}
  const coordType = d.coordType === 'geo' ? 'geo' : 'local'
  return {
    mapName: json.mapName || '导入地图',
    description: json.description || '',
    createdAt: json.createdAt || formatNow(),
    remark: json.remark || '',
    data: {
      schemaVersion: SCHEMA_VERSION,
      coordType,
      baseMap: d.baseMap || (coordType === 'geo' ? 'china' : 'grid'),
      center: (d.center && typeof d.center.lon === 'number')
        ? { lon: d.center.lon, lat: d.center.lat }
        : { lon: 114.3, lat: 30.55 },
      span: typeof d.span === 'number' ? d.span : (coordType === 'geo' ? 0.45 : 0.1),
      range: d.range || defaultRange(coordType),
      scene: mergeScene(coordType, d.scene),
      walls: (d.walls || []).map(w => normalizeWall(w)),
      buildings: (d.buildings || []).map(b => normalizeBuilding(b)),
      markers: (d.markers || []).map(m => normalizeMarker(m)),
      polygons: (d.polygons || []).map(p => normalizePolygon(p)),
      paths: (d.paths || []).map(p => normalizePath(p)),
      labels: (d.labels || []).map(l => normalizeLabel(l)),
      meta: d.meta ? deepClone(d.meta) : { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
    },
  }
}

function mergeScene(coordType, scene) {
  const def = defaultScene(coordType)
  const s = { ...def, ...(scene || {}) }
  s.ground = { ...def.ground, ...(s.ground || {}) }
  s.grid = { ...def.grid, ...(s.grid || {}) }
  s.camera = { ...def.camera, ...(s.camera || {}) }
  if (!Array.isArray(s.lights) || !s.lights.length) s.lights = def.lights
  return s
}

// ===== 要素归一化（保证导出结构一致）=====

// 墙体：points 统一为 [[x,y]|x,y] 或 [[lon,lat],...]，含颜色/尺寸/可见性
function normalizeWall(w) {
  return {
    id: w.id || genId('wall'),
    name: w.name || '墙体',
    points: (w.points || []).map(p => Array.isArray(p) ? [+p[0], +p[1]] : [+p.x, +p.y]),
    height: num(w.height, 4),
    thickness: num(w.thickness, 0.5),
    color: w.color || '#2f6fde',
    opacity: num(w.opacity, 0.95, 0, 1),
    visible: w.visible !== false,
    note: w.note || '',
  }
}

// 建筑体块
function normalizeBuilding(b) {
  const out = {
    id: b.id || genId('b'),
    name: b.name || '建筑',
    width: num(b.width, 10),
    height: num(b.height, 8),
    depth: num(b.depth, 8),
    color: b.color || '#2f6fde',
    opacity: num(b.opacity, 1, 0, 1),
    visible: b.visible !== false,
    note: b.note || '',
  }
  if (b.lon != null) { out.lon = num(b.lon); out.lat = num(b.lat) }
  else { out.x = num(b.x, 50); out.y = num(b.y, 50) }
  return out
}

// 点位
function normalizeMarker(m) {
  const out = {
    id: m.id,
    type: m.type || 'poi',
    name: m.name || '点位',
    icon: m.icon || '📍',
    color: m.color || '#30DCFF',
    label: m.label || '',
    location: m.location || '',
    status: m.status || '正常',
    note: m.note || '',
  }
  if (m.lon != null) { out.lon = num(m.lon); out.lat = num(m.lat) }
  else { out.x = num(m.x, 50); out.y = num(m.y, 50) }
  if (m.z != null) out.z = num(m.z)
  if (m.attrs && typeof m.attrs === 'object') out.attrs = deepClone(m.attrs)
  return out
}

// 底图轮廓
function normalizePolygon(p) {
  return {
    id: p.id || genId('poly'),
    name: p.name || '轮廓',
    points: (p.points || []).map(pt => pt.lon != null ? { lon: +pt.lon, lat: +pt.lat } : { x: +pt.x, y: +pt.y }),
    color: p.color || '#30DCFF',
    fillOpacity: num(p.fillOpacity, 0.22, 0, 1),
    visible: p.visible !== false,
    note: p.note || '',
  }
}

// 道路/连线
function normalizePath(p) {
  return {
    id: p.id || genId('path'),
    name: p.name || '道路',
    points: (p.points || []).map(pt => pt.lon != null ? { lon: +pt.lon, lat: +pt.lat } : { x: +pt.x, y: +pt.y }),
    color: p.color || '#3a7bfd',
    width: num(p.width, 2),
    dashed: !!p.dashed,
    flow: !!p.flow,
    visible: p.visible !== false,
    note: p.note || '',
  }
}

// 文字标签
function normalizeLabel(l) {
  return {
    id: l.id || genId('label'),
    name: l.name || '标签',
    text: l.text || '',
    x: num(l.x, 50),
    y: num(l.y, 50),
    z: num(l.z, 0),
    color: l.color || '#dbf9ff',
    fontSize: num(l.fontSize, 24),
    visible: l.visible !== false,
    note: l.note || '',
  }
}

function num(v, fallback = 0, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  if (min != null) return Math.max(min, n)
  if (max != null) return Math.min(max, n)
  return n
}

// ===== 校验 =====
// 返回 { ok, errors: [], warnings: [] }，errors 非空时不允许导入
export function validateMapJson(json) {
  const errors = []
  const warnings = []
  if (!json || typeof json !== 'object') {
    return { ok: false, errors: ['文件内容不是有效的 JSON 对象'], warnings }
  }
  if (typeof json.mapName !== 'string' || !json.mapName.trim()) {
    errors.push('缺少必填字段 mapName（地图名称）')
  }
  const d = json.data
  if (!d || typeof d !== 'object') {
    errors.push('缺少必填字段 data（地图渲染数据）')
    return { ok: false, errors, warnings }
  }
  if (d.coordType && d.coordType !== 'local' && d.coordType !== 'geo') {
    errors.push(`data.coordType 取值无效：${d.coordType}（仅支持 local / geo）`)
  }
  const arrays = [
    ['walls', '墙体'], ['buildings', '建筑'], ['markers', '点位'],
    ['polygons', '轮廓'], ['paths', '道路'], ['labels', '标签'],
  ]
  arrays.forEach(([key, label]) => {
    if (d[key] != null && !Array.isArray(d[key])) {
      errors.push(`data.${key}（${label}）必须是数组`)
    }
  })
  // 墙体专项校验：至少两个点，坐标为数字对
  if (Array.isArray(d.walls)) {
    d.walls.forEach((w, i) => {
      if (!w || !Array.isArray(w.points) || w.points.length < 2) {
        errors.push(`墙体[${i}]（${w?.name || '未命名'}）：points 至少需要 2 个顶点`)
        return
      }
      w.points.forEach((p, j) => {
        const ok = Array.isArray(p) && p.length >= 2 && p.every(v => typeof v === 'number')
        if (!ok) errors.push(`墙体[${i}] 第 ${j + 1} 个顶点坐标无效（应为 [x, y] 数字对）`)
      })
    })
  }
  // 点位/建筑位置校验
  const checkPos = (key, label, items) => {
    if (!Array.isArray(items)) return
    items.forEach((it, i) => {
      if (!it) return
      const hasLocal = typeof it.x === 'number' && typeof it.y === 'number'
      const hasGeo = typeof it.lon === 'number' && typeof it.lat === 'number'
      if (!hasLocal && !hasGeo) {
        errors.push(`${label}[${i}]（${it.name || '未命名'}）：缺少位置（x/y 或 lon/lat）`)
      }
    })
  }
  checkPos('markers', '点位', d.markers)
  checkPos('buildings', '建筑', d.buildings)
  // 附加提示
  if (d.schemaVersion && d.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(`schemaVersion 为 ${d.schemaVersion}，当前协议版本 ${SCHEMA_VERSION}，已按兼容方式导入`)
  }
  return { ok: errors.length === 0, errors, warnings }
}

// ===== 文件辅助 =====
export function parseJsonFileText(text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

export function jsonToPrettyString(json) {
  return JSON.stringify(json, null, 2)
}

// 生成下载文件名：<mapName>.factory.json
export function mapFileName(mapName) {
  const base = (mapName || 'map').replace(/[\\/:*?"<>|]/g, '_').trim()
  return `${base || 'map'}.factory.json`
}

// 浏览器触发下载
export function downloadTextFile(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
