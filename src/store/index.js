import { defineStore } from 'pinia'
import {
  SCHEMA_VERSION,
  defaultScene,
  defaultRange,
  formatNow,
  genId,
  mapToJson,
  jsonToMapData,
  validateMapJson,
  deepClone,
} from '../utils/mapSchema'
import { warehouseSeedMap } from '../data/warehouseMap'

// ===== 字典数据（与字典管理页共用同一存储 key）=====
const DICT_STORAGE_KEY = 'work-maps.dict-list.v1'
// ===== 地图数据存储（v2：标准 JSON 协议结构，单一事实来源）=====
const MAPS_STORAGE_KEY = 'work-maps.maps.v2'
// ===== 旧版存储 key（仅用于一次性迁移，迁移完成后删除，不留兼容分支）=====
const LEGACY_MAPS_KEY = 'work-maps.maps.v1'
// ===== 静态文件权威数据源（dev/preview 中间件提供 GET/POST）=====
// 地图数据以 public/data/maps.json 为单一事实来源，localStorage 仅作同端口缓存，
// 切换端口/域名后数据仍从文件恢复，不受 origin 隔离影响
const MAPS_API = '/api/maps'
let fileSaveTimer = null

function writeMapsFile(payload) {
  fetch(MAPS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // 纯静态托管（无 Node 写接口）时忽略；localStorage 缓存仍可用
  })
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function daysAgo(n, h = 9, m = 30) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return formatDate(d)
}

// 仅取日期部分（YYYY-MM-DD），用于巡检等日期字段
function dateOnly(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d).slice(0, 10)
}

// ===== 默认字典映射 =====
// 科技蓝统一配色（搭配驾驶舱深蓝 UI）
const TECH_BLUE = {
  wall: '#2f6fde',       // 墙体
  building: '#2f6fde',   // 建筑
  polygon: '#30DCFF',    // 轮廓
  path: '#3a7bfd',       // 道路
  label: '#dbf9ff',      // 标签文字
  camera: '#30DCFF',     // 摄像头
  fire: '#4fc3f7',       // 消防
  water: '#64b5f6',      // 水井
  electric: '#7fb3ff',   // 电井
  poi: '#2f6fde',        // 景点
}

const seedDicts = [
  { id: 'camera', label: '摄像头', icon: '📹', createdAt: daysAgo(30) },
  { id: 'fire', label: '消防栓', icon: '🧯', createdAt: daysAgo(12) },
  { id: 'water', label: '水井', icon: '💧', createdAt: daysAgo(3) },
  { id: 'electric', label: '电井房', icon: '⚡', createdAt: daysAgo(1, 14) },
  { id: 'poi', label: '景点', icon: '📍', createdAt: daysAgo(0, 8) },
]

function loadDicts() {
  try {
    const raw = localStorage.getItem(DICT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    // 本地数据损坏时回退到默认数据
  }
  return seedDicts.map(s => ({ ...s }))
}

// ===== 种子点位（科技蓝配色）=====
const parkMarkers = [
  { id: 1, type: 'camera', name: '东南3摄像头', icon: '📹', x: 65, y: 35, color: TECH_BLUE.camera, label: '📹 东南3', location: '东南门东侧建筑外墙', status: '在线', note: '正常运行' },
  { id: 2, type: 'camera', name: '西北2摄像头', icon: '📹', x: 30, y: 30, color: TECH_BLUE.camera, label: '', location: '西北角办公楼顶层', status: '在线', note: '正常运行' },
  { id: 3, type: 'fire', name: '东门消防栓', icon: '🧯', x: 75, y: 60, color: TECH_BLUE.fire, label: '', location: '东门外道路南侧', status: '正常', note: '水压正常', waterPressure: '正常', lastInspection: dateOnly(8) },
  { id: 4, type: 'fire', name: '西门消防栓', icon: '🧯', x: 25, y: 55, color: TECH_BLUE.fire, label: '', location: '西门内广场西侧', status: '异常', note: '压力略低，待巡检', waterPressure: '偏低', lastInspection: dateOnly(26) },
  { id: 5, type: 'water', name: '北区水井', icon: '💧', x: 45, y: 25, color: TECH_BLUE.water, label: '', location: '北厂区绿化带内', status: '正常', note: '水质合格' },
  { id: 6, type: 'electric', name: '中心电井房', icon: '⚡', x: 55, y: 45, color: TECH_BLUE.electric, label: '⚠ 温度异常', location: '中央配电室', status: '异常', note: '温度偏高38°C' },
  { id: 7, type: 'electric', name: '南区电井房', icon: '⚡', x: 40, y: 70, color: TECH_BLUE.electric, label: '', location: '南办公楼地下一层', status: '正常', note: '温度28°C' },
]

// 武汉人文景观示例（真实经纬度，可在编辑中微调；科技蓝配色）
const wuhanMarkers = [
  { id: 1, type: 'poi', name: '黄鹤楼', icon: '🏛️', lon: 114.3095, lat: 30.5483, color: TECH_BLUE.poi, label: '', location: '武昌区蛇山', status: '正常', note: 'AAAAA级景区，江南三大名楼' },
  { id: 2, type: 'poi', name: '武汉长江大桥', icon: '🌉', lon: 114.301, lat: 30.549, color: '#26a6d9', label: '', location: '武昌-汉阳', status: '正常', note: '万里长江第一桥' },
  { id: 3, type: 'poi', name: '东湖风景区', icon: '🌊', lon: 114.42, lat: 30.57, color: '#3a7bfd', label: '', location: '武昌东部', status: '正常', note: '中国最大城中湖' },
  { id: 4, type: 'poi', name: '施洋烈士陵园', icon: '🪦', lon: 114.323, lat: 30.535, color: '#4fc3f7', label: '', location: '武昌区', status: '正常', note: '纪念"二七"大罢工烈士' },
  { id: 5, type: 'poi', name: '辛亥首义公园', icon: '🏟️', lon: 114.31, lat: 30.545, color: '#64b5f6', label: '', location: '武昌蛇山', status: '正常', note: '辛亥革命纪念地' },
  { id: 6, type: 'poi', name: '归元禅寺', icon: '⛩️', lon: 114.252, lat: 30.552, color: '#2b5fd9', label: '', location: '汉阳区翠微路', status: '正常', note: '武汉著名古刹' },
  { id: 7, type: 'poi', name: '汉口江滩', icon: '🌅', lon: 114.312, lat: 30.602, color: '#1e88e5', label: '', location: '江岸区沿江大道', status: '正常', note: '滨江景观带' },
]

// ===== 种子地图（标准协议结构：mapName/description/createdAt/remark/data）=====
const seedMaps = [
  {
    id: 'map-park',
    mapName: '园区地图',
    description: '园区物联网数字孪生地图，Smart Factory JSON 协议示例',
    remark: '',
    createdAt: daysAgo(30),
    data: {
      schemaVersion: SCHEMA_VERSION,
      coordType: 'local',
      baseMap: 'grid',
      center: { lon: 114.30, lat: 30.55 },
      span: 0.1,
      range: defaultRange('local'),
      scene: defaultScene('local'),
      walls: [
        { id: 'wall-north', name: '北围墙', points: [[15, 15], [85, 15]], height: 4, thickness: 0.6, color: TECH_BLUE.wall, opacity: 0.95, visible: true, note: '' },
        { id: 'wall-east', name: '东围墙', points: [[85, 15], [85, 85]], height: 4, thickness: 0.6, color: TECH_BLUE.wall, opacity: 0.95, visible: true, note: '' },
        { id: 'wall-south', name: '南围墙', points: [[85, 85], [15, 85]], height: 4, thickness: 0.6, color: TECH_BLUE.wall, opacity: 0.95, visible: true, note: '' },
        { id: 'wall-west', name: '西围墙', points: [[15, 85], [15, 15]], height: 4, thickness: 0.6, color: TECH_BLUE.wall, opacity: 0.95, visible: true, note: '' },
      ],
      buildings: [
        { id: 'b1', name: '办公楼A', x: 48, y: 38, width: 12, height: 9, depth: 8, color: TECH_BLUE.building, opacity: 1, visible: true, note: '' },
        { id: 'b2', name: '生产车间', x: 42, y: 62, width: 16, height: 7, depth: 10, color: '#3a7bfd', opacity: 1, visible: true, note: '' },
        { id: 'b3', name: '仓库', x: 62, y: 66, width: 10, height: 5, depth: 8, color: '#1e88e5', opacity: 1, visible: true, note: '' },
      ],
      markers: parkMarkers,
      polygons: [
        { id: 'p1', name: '园区围墙', points: [{ x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 }], color: TECH_BLUE.polygon, fillOpacity: 0.22, visible: true, note: '' },
        { id: 'p2', name: '主路轮廓', points: [{ x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }], color: '#2b5fd9', fillOpacity: 0.22, visible: true, note: '' },
      ],
      paths: [
        { id: 'path-main', name: '主干道', points: [{ x: 20, y: 50 }, { x: 80, y: 50 }], color: TECH_BLUE.path, width: 2.5, dashed: false, flow: false, visible: true, note: '' },
      ],
      labels: [
        { id: 'label-park', name: '园区名称', text: '园区地图', x: 50, y: 8, z: 0, color: TECH_BLUE.label, fontSize: 24, visible: true, note: '' },
      ],
      meta: { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
    },
  },
  {
    id: 'map-geo-wuhan',
    mapName: '武汉人文景观',
    description: '武汉人文景观（经纬度模式，中国 GIS 底图）',
    remark: '',
    createdAt: daysAgo(2),
    data: {
      schemaVersion: SCHEMA_VERSION,
      coordType: 'geo',
      baseMap: 'china',
      center: { lon: 114.35, lat: 30.575 },
      span: 0.45,
      range: defaultRange('geo'),
      scene: defaultScene('geo'),
      walls: [],
      buildings: [
        { id: 'gb1', name: '黄鹤楼主楼', lon: 114.3095, lat: 30.5483, width: 10, height: 14, depth: 10, color: TECH_BLUE.building, opacity: 1, visible: true, note: '' },
      ],
      markers: wuhanMarkers,
      polygons: [
        { id: 'gp1', name: '东湖水域示意', points: [{ lon: 114.40, lat: 30.58 }, { lon: 114.44, lat: 30.57 }, { lon: 114.43, lat: 30.54 }, { lon: 114.38, lat: 30.55 }], color: '#3a7bfd', fillOpacity: 0.22, visible: true, note: '' },
      ],
      paths: [],
      labels: [],
      meta: { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
    },
  },
  warehouseSeedMap,
]

function cloneSeed(m) {
  return {
    id: m.id,
    mapName: m.mapName,
    description: m.description,
    remark: m.remark,
    createdAt: m.createdAt,
    data: deepClone(m.data),
  }
}

// ===== v1 → v2 一次性迁移 =====
// 旧结构：{ list: [{id,name,coordType,center,span,baseMap,createdAt,...}], data: { id: {markers,boxes,polygons,walls,paths,labels,scene} }, activeMapId }
// 新结构：{ maps: [{mapName,description,createdAt,remark,data}], activeMapId }
// 迁移完成即删除旧 key，不留兼容分支。
let migrationResult = null

function migrateV1() {
  let raw = null
  try {
    raw = localStorage.getItem(LEGACY_MAPS_KEY)
  } catch (e) {
    return null
  }
  if (!raw) return null
  let parsed
  try {
    parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.list) || !parsed.data) return null
  } catch (e) {
    return null
  }
  const seedById = Object.fromEntries(seedMaps.map(m => [m.id, m]))
  const maps = parsed.list.map(meta => {
    const d = parsed.data[meta.id] || {}
    const ct = meta.coordType === 'geo' ? 'geo' : 'local'
    const seed = seedById[meta.id] || null
    const emptyArr = (key) => Array.isArray(d[key]) && d[key].length === 0
    // 旧版本无墙体/道路/标签功能：空数组视为"未定义"，用种子默认补齐
    const take = (key) => {
      if (d[key] != null && !emptyArr(key)) return d[key]
      return seed ? deepClone(seed.data[key]) : []
    }
    return {
      id: meta.id || genId('map'),
      mapName: meta.name || '未命名地图',
      description: meta.description || (seed ? seed.description : ''),
      createdAt: meta.createdAt || formatNow(),
      remark: meta.remark || '',
      data: {
        schemaVersion: SCHEMA_VERSION,
        coordType: ct,
        baseMap: meta.baseMap || (ct === 'geo' ? 'china' : 'grid'),
        center: meta.center || { lon: 114.3, lat: 30.55 },
        span: typeof meta.span === 'number' ? meta.span : (ct === 'geo' ? 0.45 : 0.1),
        range: defaultRange(ct),
        scene: meta.scene || (seed ? deepClone(seed.data.scene) : defaultScene(ct)),
        walls: take('walls'),
        buildings: (d.boxes != null && !(Array.isArray(d.boxes) && d.boxes.length === 0)) ? d.boxes : (seed ? deepClone(seed.data.buildings) : []),
        markers: (d.markers != null && !(Array.isArray(d.markers) && d.markers.length === 0)) ? d.markers : (seed ? deepClone(seed.data.markers) : []),
        polygons: d.polygons || (seed ? deepClone(seed.data.polygons) : []),
        paths: take('paths'),
        labels: take('labels'),
        meta: meta.meta || { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
      },
    }
  })
  if (!maps.length) return null
  let activeMapId = null
  try {
    if (parsed.activeMapId && maps.some(m => m.id === parsed.activeMapId)) {
      activeMapId = parsed.activeMapId
    }
  } catch (e) { /* 忽略 */ }
  activeMapId = activeMapId || maps[0].id
  const payload = { maps: maps.map(m => ({ ...m })), activeMapId, dashboardMapId: activeMapId }
  try {
    localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(payload))
    localStorage.removeItem(LEGACY_MAPS_KEY)
  } catch (e) {
    // 迁移结果仍返回内存使用；持久化失败不影响本次会话
  }
  return { maps, activeMapId }
}

function loadMaps() {
  // 1) 新结构（标准协议；本地持久化含运行时 id，导出 JSON 时才剔除）
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.maps) && parsed.maps.length) {
        let maps = parsed.maps.map(m => {
          if (m.id) return { id: m.id, ...m }
          // 旧格式无 id：分配稳定 id（本地持久化统一带 id）
          const id = 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
          return { id, ...m }
        })
        // 默认配色迁移：旧浅色 scene（v2 早期默认）→ 科技蓝场景
        let sceneDirty = false
        maps = maps.map(m => {
          const d = m.data
          if (d && d.scene && (d.scene.background === '#eef4fb' || (d.scene.ground && d.scene.ground.color === '#f0f4fa'))) {
            d.scene = defaultScene(d.coordType === 'geo' ? 'geo' : 'local')
            sceneDirty = true
          }
          return m
        })
        // 修正 activeMapId / dashboardMapId 失配（无 id 旧数据修复后）
        let dirty = sceneDirty
        if (!maps.some(m => m.id === parsed.activeMapId)) { parsed.activeMapId = maps[0].id; dirty = true }
        if (!maps.some(m => m.id === parsed.dashboardMapId)) { parsed.dashboardMapId = maps[0].id; dirty = true }
        if (dirty) {
          try {
            localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify({
              maps: maps.map(m => ({ ...m })),
              activeMapId: parsed.activeMapId,
              dashboardMapId: parsed.dashboardMapId,
            }))
          } catch (e) { /* 忽略 */ }
        }
        return maps
      }
    }
  } catch (e) {
    // 新结构损坏时走迁移/种子
  }
  // 2) 一次性迁移旧结构（迁移后旧 key 即删除）
  migrationResult = migrateV1()
  if (migrationResult) return migrationResult.maps
  // 3) 全新环境：种子地图
  return seedMaps.map(cloneSeed)
}

function loadActiveMapId() {
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.activeMapId) return parsed.activeMapId
    }
  } catch (e) {
    // 忽略，回退默认
  }
  if (migrationResult) return migrationResult.activeMapId
  return 'map-park'
}

// 驾驶舱展示地图 id：默认跟随激活地图；持久化于 v2 payload 的 dashboardMapId
function loadDashboardMapId() {
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.dashboardMapId) return parsed.dashboardMapId
    }
  } catch (e) {
    // 忽略，回退默认
  }
  if (migrationResult) return migrationResult.dashboardMapId || migrationResult.activeMapId
  return 'map-park'
}

export const useMainStore = defineStore('main', {
  state: () => ({
    // 地图列表：每项即一个标准 JSON（{id(运行时), mapName, description, createdAt, remark, data}）
    maps: loadMaps(),
    // 当前激活地图 id
    activeMapId: loadActiveMapId(),
    // 驾驶舱展示地图 id（编辑界面可切换；驾驶舱实时读取该地图数据）
    dashboardMapId: loadDashboardMapId(),
    // 当前选中的点位（state 字段，兼容直接赋值 null 的用法）
    selectedMarker: null,
    // 当前选中的建筑 id
    selectedBuildingId: null,
    // 当前选中的墙体 id
    selectedWallId: null,
    // 当前激活的菜单
    activeMenu: 'dashboard',
    // 字典映射（id → label/icon），与字典管理页共享
    dicts: loadDicts(),
  }),
  getters: {
    // 当前激活地图（标准 JSON 对象）
    activeMap(state) {
      return state.maps.find(m => m.id === state.activeMapId) || state.maps[0]
    },
    // 驾驶舱展示地图（编辑界面"设为驾驶舱展示"切换；不存在时回退激活地图）
    dashboardMap(state) {
      return state.maps.find(m => m.id === state.dashboardMapId) || state.activeMap
    },
    // 当前地图坐标模式
    coordType() {
      return this.activeMap?.data?.coordType
    },
    // 当前地图的点位（兼容旧引用：store.markers）
    markers() {
      return this.activeMap?.data?.markers || []
    },
    // 当前地图的建筑（协议字段 buildings）
    buildings() {
      return this.activeMap?.data?.buildings || []
    },
    // 当前地图的墙体（3D 数据驱动渲染：位置/颜色/尺寸）
    walls() {
      return this.activeMap?.data?.walls || []
    },
    // 当前地图的道路/连线
    paths() {
      return this.activeMap?.data?.paths || []
    },
    // 当前地图的文字标签
    labels() {
      return this.activeMap?.data?.labels || []
    },
    // 当前地图的底图轮廓
    polygons() {
      return this.activeMap?.data?.polygons || []
    },
    // 按类型筛选点位
    markersByType() {
      return (type) => {
        return this.markers.filter(m => m.type === type)
      }
    },
    // 统计各类型数量
    deviceCount() {
      const counts = {}
      this.markers.forEach(m => {
        if (counts[m.type] === undefined) counts[m.type] = 0
        counts[m.type]++
      })
      return counts
    },
    // 异常设备数量
    abnormalCount() {
      return this.markers.filter(m => m.status === '异常').length
    },
    // 根据字典编码取标签（未配置时回退为编码本身）
    dictLabel() {
      return (id) => {
        const d = this.dicts.find(x => x.id === id)
        return d ? d.label : id
      }
    },
    // 根据字典编码取图标
    dictIcon() {
      return (id) => {
        const d = this.dicts.find(x => x.id === id)
        return d ? d.icon : ''
      }
    },
    // 设备类型默认颜色（新增点位时使用；统一科技蓝系深浅区分）
    typeColor() {
      return (type) => TECH_BLUE[type] || '#30DCFF'
    },
  },
  actions: {
    // ===== 地图管理 =====
    // 新建地图
    addMap({ name, coordType = 'local', center, span, baseMap }) {
      const id = 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const ct = coordType === 'geo' ? 'geo' : 'local'
      const map = {
        id,
        mapName: name || '未命名地图',
        description: '',
        remark: '',
        createdAt: formatNow(),
        data: {
          schemaVersion: SCHEMA_VERSION,
          coordType: ct,
          baseMap: baseMap || (ct === 'geo' ? 'china' : 'grid'),
          center: center || { lon: 114.30, lat: 30.55 },
          span: span || (ct === 'geo' ? 0.45 : 0.1),
          range: defaultRange(ct),
          scene: defaultScene(ct),
          walls: [],
          buildings: [],
          markers: [],
          polygons: [],
          paths: [],
          labels: [],
          meta: { author: '', version: SCHEMA_VERSION, tags: [], extensions: {} },
        },
      }
      this.maps.push(map)
      this.persistMaps()
      return id
    },
    // 重命名地图
    renameMap(id, mapName) {
      const map = this.maps.find(m => m.id === id)
      if (map) {
        map.mapName = mapName
        this.persistMaps()
      }
    },
    // 删除地图（保留至少一张）
    removeMap(id) {
      if (this.maps.length <= 1) return false
      const idx = this.maps.findIndex(m => m.id === id)
      if (idx === -1) return false
      this.maps.splice(idx, 1)
      if (this.activeMapId === id) {
        this.activeMapId = this.maps[0].id
        this.selectedMarker = null
        this.selectedBuildingId = null
        this.selectedWallId = null
      }
      if (this.dashboardMapId === id) {
        this.dashboardMapId = this.maps[0].id
      }
      this.persistMaps()
      return true
    },
    // 切换当前编辑地图
    switchMap(id) {
      if (this.maps.some(m => m.id === id)) {
        this.activeMapId = id
        this.selectedMarker = null
        this.selectedBuildingId = null
        this.selectedWallId = null
        this.persistMaps()
      }
    },
    // 设置驾驶舱展示地图（驾驶舱实时读取该地图的点位等数据）
    setDashboardMap(id) {
      if (this.maps.some(m => m.id === id)) {
        this.dashboardMapId = id
        this.persistMaps()
      }
    },
    // 更新当前地图视图设置（baseMap/center/span 位于 data 层）
    setBaseMap(settings) {
      const map = this.activeMap
      if (map) {
        Object.assign(map.data, settings)
        this.persistMaps()
      }
    },
    // 持久化所有地图（标准协议结构 + 运行时 id；导出 JSON 时才剔除 id）
    // localStorage 同步缓存 + 静态文件权威源防抖写入（编辑时实时更新，切换端口数据不丢）
    persistMaps() {
      const payload = {
        maps: this.maps.map(m => ({ ...m })),
        activeMapId: this.activeMapId,
        dashboardMapId: this.dashboardMapId,
      }
      try {
        localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(payload))
      } catch (e) {
        // 存储失败时忽略，仅影响刷新后的持久化
      }
      if (fileSaveTimer) clearTimeout(fileSaveTimer)
      fileSaveTimer = setTimeout(() => writeMapsFile(payload), 400)
    },
    // 启动时从静态文件（权威源）加载地图数据；文件不存在时把当前内存数据（种子/迁移结果）写盘
    // 与 localStorage 数据无关：切换域名/端口后仍从文件恢复，保证数据一致
    async hydrateFromFile() {
      try {
        const res = await fetch(MAPS_API)
        if (!res.ok) {
          this.persistMaps()
          return
        }
        const parsed = await res.json()
        if (!parsed || !Array.isArray(parsed.maps) || !parsed.maps.length) {
          this.persistMaps()
          return
        }
        let maps = parsed.maps.map(m => {
          if (m.id) return { id: m.id, ...m }
          // 旧格式无 id：分配稳定 id
          return { id: 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...m }
        })
        // 默认配色迁移：旧浅色 scene → 科技蓝（与 loadMaps 一致，一次性修复）
        maps = maps.map(m => {
          const d = m.data
          if (d && d.scene && (d.scene.background === '#eef4fb' || (d.scene.ground && d.scene.ground.color === '#f0f4fa'))) {
            d.scene = defaultScene(d.coordType === 'geo' ? 'geo' : 'local')
          }
          return m
        })
        const activeMapId = parsed.activeMapId && maps.some(m => m.id === parsed.activeMapId)
          ? parsed.activeMapId
          : maps[0].id
        const dashboardMapId = parsed.dashboardMapId && maps.some(m => m.id === parsed.dashboardMapId)
          ? parsed.dashboardMapId
          : activeMapId
        this.maps = maps
        this.activeMapId = activeMapId
        this.dashboardMapId = dashboardMapId
        try {
          localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify({
            maps: maps.map(m => ({ ...m })),
            activeMapId,
            dashboardMapId,
          }))
        } catch (e) { /* 忽略 */ }
      } catch (e) {
        // 后端不可用（纯静态托管）：保持内存种子数据
      }
    },
    // ===== 点位操作（作用于当前地图 data.markers）=====
    // 添加点位（返回新建点位的 id）
    addMarker(marker) {
      const id = Date.now()
      this.markers.push({ ...marker, id })
      this.persistMaps()
      return id
    },
    // 更新点位
    updateMarker(id, data) {
      const index = this.markers.findIndex(m => m.id === id)
      if (index !== -1) {
        this.markers[index] = { ...this.markers[index], ...data }
        this.persistMaps()
      }
    },
    // 删除点位
    removeMarker(id) {
      const map = this.activeMap
      map.data.markers = map.data.markers.filter(m => m.id !== id)
      if (this.selectedMarker?.id === id) this.selectedMarker = null
      this.persistMaps()
    },
    // 选中点位（兼容两种用法：传点位对象或点位 id）
    selectMarker(marker) {
      if (marker && typeof marker === 'object') {
        this.selectedMarker = marker
      } else {
        this.selectedMarker = this.markers.find(m => m.id === marker) || null
      }
    },
    // ===== 建筑操作（协议字段 buildings）=====
    addBuilding(building) {
      this.buildings.push({ ...building, id: building.id || genId('b') })
      this.persistMaps()
    },
    updateBuilding(id, data) {
      const index = this.buildings.findIndex(b => b.id === id)
      if (index !== -1) {
        this.buildings[index] = { ...this.buildings[index], ...data }
        this.persistMaps()
      }
    },
    removeBuilding(id) {
      const map = this.activeMap
      map.data.buildings = map.data.buildings.filter(b => b.id !== id)
      if (this.selectedBuildingId === id) this.selectedBuildingId = null
      this.persistMaps()
    },
    selectBuilding(id) {
      this.selectedBuildingId = id
    },
    // ===== 墙体操作（3D 数据驱动：位置/颜色/尺寸）=====
    // 添加墙体（points: [[x,y],...]，园区逻辑坐标或经纬度）
    addWall(wall) {
      this.walls.push({ ...wall, id: wall.id || genId('wall') })
      this.persistMaps()
      return this.walls[this.walls.length - 1].id
    },
    // 更新墙体
    updateWall(id, data) {
      const index = this.walls.findIndex(w => w.id === id)
      if (index !== -1) {
        this.walls[index] = { ...this.walls[index], ...data }
        this.persistMaps()
      }
    },
    // 删除墙体
    removeWall(id) {
      const map = this.activeMap
      map.data.walls = map.data.walls.filter(w => w.id !== id)
      if (this.selectedWallId === id) this.selectedWallId = null
      this.persistMaps()
    },
    // 选中墙体
    selectWall(id) {
      this.selectedWallId = id
    },
    // ===== 底图轮廓操作 =====
    addPolygon(poly) {
      this.polygons.push({ ...poly, id: poly.id || genId('p') })
      this.persistMaps()
    },
    updatePolygon(id, data) {
      const index = this.polygons.findIndex(p => p.id === id)
      if (index !== -1) {
        this.polygons[index] = { ...this.polygons[index], ...data }
        this.persistMaps()
      }
    },
    removePolygon(id) {
      const map = this.activeMap
      map.data.polygons = map.data.polygons.filter(p => p.id !== id)
      this.persistMaps()
    },
    // 更新当前选中点位（供属性面板直接 v-model）
    updateSelectedMarker(data) {
      if (this.selectedMarker) {
        Object.assign(this.selectedMarker, data)
        this.persistMaps()
      }
    },
    // ===== 地图 JSON 导入导出（Smart Factory 协议）=====
    // 导出：当前地图 → 标准 JSON 对象（{mapName, description, createdAt, remark, data}）
    exportMapJson(id) {
      const map = this.maps.find(m => m.id === id) || this.activeMap
      if (!map) return null
      return mapToJson(map)
    },
    // 导入：标准 JSON 文本/对象 → 新地图（校验失败时不产生任何修改）
    importMapFromJson(text) {
      let json
      try {
        json = typeof text === 'string' ? JSON.parse(text) : text
      } catch (e) {
        return { ok: false, errors: ['文件内容不是有效的 JSON：' + e.message], warnings: [] }
      }
      const v = validateMapJson(json)
      if (!v.ok) return v
      const data = jsonToMapData(json)
      const id = 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      this.maps.push({ id, ...data })
      this.activeMapId = id
      this.selectedMarker = null
      this.selectedBuildingId = null
      this.selectedWallId = null
      this.persistMaps()
      return { ok: true, id, mapName: data.mapName, warnings: v.warnings }
    },
    // 更新当前地图的元信息（description/remark/mapName）
    updateMapInfo(info) {
      const map = this.activeMap
      if (map) {
        Object.assign(map, info)
        this.persistMaps()
      }
    },
    // ===== 字典操作 =====
    // 新增字典条目
    addDict(data) {
      this.dicts.push({ ...data })
      this.persistDicts()
    },
    // 更新字典条目（id 不可变）
    updateDict(id, data) {
      const index = this.dicts.findIndex(d => d.id === id)
      if (index !== -1) {
        this.dicts[index] = { ...this.dicts[index], ...data }
        this.persistDicts()
      }
    },
    // 删除字典条目
    removeDict(id) {
      this.dicts = this.dicts.filter(d => d.id !== id)
      this.persistDicts()
    },
    // 持久化字典到 localStorage
    persistDicts() {
      try {
        localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(this.dicts))
      } catch (e) {
        // 存储失败时忽略，仅影响刷新后的持久化
      }
    },
    // 设置激活菜单
    setActiveMenu(menu) {
      this.activeMenu = menu
    },
  },
})
