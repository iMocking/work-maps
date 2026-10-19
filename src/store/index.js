import { defineStore } from 'pinia'

// ===== 字典数据（与字典管理页共用同一存储 key）=====
const DICT_STORAGE_KEY = 'work-maps.dict-list.v1'
// ===== 地图数据存储 =====
const MAPS_STORAGE_KEY = 'work-maps.maps.v1'

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

// ===== 种子地图 =====
const parkMarkers = [
  { id: 1, type: 'camera', name: '东南3摄像头', icon: '📹', x: 65, y: 35, color: '#30DCFF', label: '📹 东南3', location: '东南门东侧建筑外墙', status: '在线', note: '正常运行' },
  { id: 2, type: 'camera', name: '西北2摄像头', icon: '📹', x: 30, y: 30, color: '#30DCFF', label: '', location: '西北角办公楼顶层', status: '在线', note: '正常运行' },
  { id: 3, type: 'fire', name: '东门消防栓', icon: '🧯', x: 75, y: 60, color: '#ff6b6b', label: '', location: '东门外道路南侧', status: '正常', note: '水压正常', waterPressure: '正常', lastInspection: dateOnly(8) },
  { id: 4, type: 'fire', name: '西门消防栓', icon: '🧯', x: 25, y: 55, color: '#ff6b6b', label: '', location: '西门内广场西侧', status: '异常', note: '压力略低，待巡检', waterPressure: '偏低', lastInspection: dateOnly(26) },
  { id: 5, type: 'water', name: '北区水井', icon: '💧', x: 45, y: 25, color: '#64b5f6', label: '', location: '北厂区绿化带内', status: '正常', note: '水质合格' },
  { id: 6, type: 'electric', name: '中心电井房', icon: '⚡', x: 55, y: 45, color: '#ffd54f', label: '⚠ 温度异常', location: '中央配电室', status: '异常', note: '温度偏高38°C' },
  { id: 7, type: 'electric', name: '南区电井房', icon: '⚡', x: 40, y: 70, color: '#ffd54f', label: '', location: '南办公楼地下一层', status: '正常', note: '温度28°C' },
]

// 武汉人文景观示例（真实经纬度，可在编辑中微调）
const wuhanMarkers = [
  { id: 1, type: 'poi', name: '黄鹤楼', icon: '🏛️', lon: 114.3095, lat: 30.5483, color: '#5470c6', label: '', location: '武昌区蛇山', status: '正常', note: 'AAAAA级景区，江南三大名楼' },
  { id: 2, type: 'poi', name: '武汉长江大桥', icon: '🌉', lon: 114.301, lat: 30.549, color: '#91cc75', label: '', location: '武昌-汉阳', status: '正常', note: '万里长江第一桥' },
  { id: 3, type: 'poi', name: '东湖风景区', icon: '🌊', lon: 114.42, lat: 30.57, color: '#36a3f7', label: '', location: '武昌东部', status: '正常', note: '中国最大城中湖' },
  { id: 4, type: 'poi', name: '施洋烈士陵园', icon: '🪦', lon: 114.323, lat: 30.535, color: '#fac858', label: '', location: '武昌区', status: '正常', note: '纪念"二七"大罢工烈士' },
  { id: 5, type: 'poi', name: '辛亥首义公园', icon: '🏟️', lon: 114.31, lat: 30.545, color: '#ee6666', label: '', location: '武昌蛇山', status: '正常', note: '辛亥革命纪念地' },
  { id: 6, type: 'poi', name: '归元禅寺', icon: '⛩️', lon: 114.252, lat: 30.552, color: '#73c0de', label: '', location: '汉阳区翠微路', status: '正常', note: '武汉著名古刹' },
  { id: 7, type: 'poi', name: '汉口江滩', icon: '🌅', lon: 114.312, lat: 30.602, color: '#d48265', label: '', location: '江岸区沿江大道', status: '正常', note: '滨江景观带' },
]

const seedMaps = [
  {
    id: 'map-park',
    name: '园区地图',
    coordType: 'local',
    center: { lon: 114.30, lat: 30.55 },
    span: 0.1,
    baseMap: 'grid', // grid=建筑结构底图 china=中国GIS底图 none=空白
    createdAt: daysAgo(30),
    markers: parkMarkers,
    boxes: [
      { id: 'b1', name: '办公楼A', x: 48, y: 38, width: 12, height: 9, depth: 8, color: '#5470c6', createdAt: daysAgo(20) },
      { id: 'b2', name: '生产车间', x: 42, y: 62, width: 16, height: 7, depth: 10, color: '#91cc75', createdAt: daysAgo(18) },
      { id: 'b3', name: '仓库', x: 62, y: 66, width: 10, height: 5, depth: 8, color: '#fac858', createdAt: daysAgo(15) },
    ],
    polygons: [
      { id: 'p1', name: '园区围墙', points: [{ x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 }], color: '#ff6b6b', createdAt: daysAgo(28) },
      { id: 'p2', name: '主路轮廓', points: [{ x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }], color: '#909399', createdAt: daysAgo(26) },
    ],
  },
  {
    id: 'map-geo-wuhan',
    name: '武汉人文景观',
    coordType: 'geo',
    center: { lon: 114.35, lat: 30.575 },
    span: 0.45,
    baseMap: 'china',
    createdAt: daysAgo(2),
    markers: wuhanMarkers,
    boxes: [
      { id: 'gb1', name: '黄鹤楼主楼', lon: 114.3095, lat: 30.5483, width: 10, height: 14, depth: 10, color: '#5470c6', createdAt: daysAgo(2) },
    ],
    polygons: [
      { id: 'gp1', name: '东湖水域示意', points: [{ lon: 114.40, lat: 30.58 }, { lon: 114.44, lat: 30.57 }, { lon: 114.43, lat: 30.54 }, { lon: 114.38, lat: 30.55 }], color: '#36a3f7', createdAt: daysAgo(2) },
    ],
  },
]

function loadMaps() {
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.list) && parsed.data) {
        // 数据完整性检查
        const list = parsed.list
        const data = parsed.data
        return list.map(meta => ({
          ...meta,
          markers: data[meta.id]?.markers || [],
          boxes: data[meta.id]?.boxes || [],
          polygons: data[meta.id]?.polygons || [],
        }))
      }
    }
  } catch (e) {
    // 本地数据损坏时回退到默认数据
  }
  return seedMaps.map(m => ({
    ...m,
    markers: m.markers.map(x => ({ ...x })),
    boxes: m.boxes.map(x => ({ ...x })),
    polygons: m.polygons.map(x => ({ ...x, points: x.points.map(p => ({ ...p })) })),
  }))
}

// 恢复上次激活的地图 id（未持久化或损坏时回退默认）
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
  return 'map-park'
}

export const useMainStore = defineStore('main', {
  state: () => ({
    // 地图列表（每张地图独立数据：点位/建筑盒子/底图轮廓）
    maps: loadMaps(),
    // 当前激活地图 id
    activeMapId: loadActiveMapId(),
    // 当前选中的点位（state 字段，兼容现有页面直接赋值 null 的用法）
    selectedMarker: null,
    // 当前选中的建筑盒子 id
    selectedBoxId: null,
    // 当前激活的菜单
    activeMenu: 'dashboard',
    // 字典映射（id → label/icon），与字典管理页共享
    dicts: loadDicts(),
  }),
  getters: {
    // 当前激活地图
    activeMap(state) {
      return state.maps.find(m => m.id === state.activeMapId) || state.maps[0]
    },
    // 当前地图坐标模式
    coordType() {
      return this.activeMap.coordType
    },
    // 当前地图的点位（兼容旧引用：store.markers）
    markers() {
      return this.activeMap.markers || []
    },
    // 当前地图的建筑盒子
    boxes() {
      return this.activeMap.boxes || []
    },
    // 当前地图的底图轮廓
    polygons() {
      return this.activeMap.polygons || []
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
    // 设备类型默认颜色（新增点位时使用，未知类型回退主色）
    typeColor() {
      return (type) => {
        const colors = { camera: '#30DCFF', fire: '#ff6b6b', water: '#64b5f6', electric: '#ffd54f', poi: '#5470c6' }
        return colors[type] || '#409eff'
      }
    },
  },
  actions: {
    // ===== 地图管理 =====
    // 新建地图
    addMap({ name, coordType = 'local', center, span, baseMap }) {
      const id = 'map-' + Date.now()
      const map = {
        id,
        name: name || '未命名地图',
        coordType,
        center: center || { lon: 114.30, lat: 30.55 },
        span: span || (coordType === 'geo' ? 0.45 : 0.1),
        baseMap: baseMap || (coordType === 'geo' ? 'china' : 'grid'),
        createdAt: formatDate(new Date()),
        markers: [],
        boxes: [],
        polygons: [],
      }
      this.maps.push(map)
      this.persistMaps()
      return id
    },
    // 重命名地图
    renameMap(id, name) {
      const map = this.maps.find(m => m.id === id)
      if (map) {
        map.name = name
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
        this.selectedBoxId = null
      }
      this.persistMaps()
      return true
    },
    // 切换当前编辑地图
    switchMap(id) {
      if (this.maps.some(m => m.id === id)) {
        this.activeMapId = id
        this.selectedMarker = null
        this.selectedBoxId = null
        this.persistMaps()
      }
    },
    // 更新当前地图视图设置（center/span/baseMap）
    setBaseMap(settings) {
      const map = this.activeMap
      if (map) {
        Object.assign(map, settings)
        this.persistMaps()
      }
    },
    // 持久化所有地图数据
    persistMaps() {
      try {
        const list = this.maps.map(({ markers, boxes, polygons, ...meta }) => meta)
        const data = {}
        this.maps.forEach(m => {
          data[m.id] = { markers: m.markers, boxes: m.boxes, polygons: m.polygons }
        })
        localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify({ list, data, activeMapId: this.activeMapId }))
      } catch (e) {
        // 存储失败时忽略，仅影响刷新后的持久化
      }
    },
    // ===== 点位操作（作用于当前地图） =====
    // 添加点位
    addMarker(marker) {
      this.markers.push({ ...marker, id: Date.now() })
      this.persistMaps()
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
      map.markers = map.markers.filter(m => m.id !== id)
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
    // ===== 建筑盒子操作 =====
    addBox(box) {
      this.boxes.push({ ...box, id: 'b' + Date.now() })
      this.persistMaps()
    },
    updateBox(id, data) {
      const index = this.boxes.findIndex(b => b.id === id)
      if (index !== -1) {
        this.boxes[index] = { ...this.boxes[index], ...data }
        this.persistMaps()
      }
    },
    removeBox(id) {
      const map = this.activeMap
      map.boxes = map.boxes.filter(b => b.id !== id)
      if (this.selectedBoxId === id) this.selectedBoxId = null
      this.persistMaps()
    },
    selectBox(id) {
      this.selectedBoxId = id
    },
    // ===== 底图轮廓操作 =====
    addPolygon(poly) {
      this.polygons.push({ ...poly, id: 'p' + Date.now() })
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
      map.polygons = map.polygons.filter(p => p.id !== id)
      this.persistMaps()
    },
    // 更新当前选中点位（供属性面板直接 v-model）
    updateSelectedMarker(data) {
      if (this.selectedMarker) {
        Object.assign(this.selectedMarker, data)
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
