// ===== 通用地图投影工具 =====
// 支持两种坐标系：
//  - local：园区/示意图模式，逻辑坐标 x/y ∈ [0, 100]
//  - geo：真实经纬度模式（旅游景点、烈士陵园、名胜古迹等），使用 lon/lat
// 2D 画布与 3D 场景共用同一套投影规则。

// 中国范围（经纬度）
export const CHINA_BOUNDS = { minLon: 73, maxLon: 135, minLat: 3, maxLat: 54 }
export const CHINA_LON_SPAN = CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon // 62
export const CHINA_LAT_SPAN = CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat // 51

// 归一化 GeoJSON 环形坐标：兼容嵌套 [[lon,lat],...] 与扁平 [lon,lat,lon,lat,...] 两种格式
export function normalizeRing(ring) {
  if (ring && ring.length && typeof ring[0] === 'number') {
    const pts = []
    for (let i = 0; i + 1 < ring.length; i += 2) pts.push([ring[i], ring[i + 1]])
    return pts
  }
  return ring || []
}

// ===== 2D 视图投影 =====

// local：逻辑坐标 (0-100) → 画布坐标
export function localToView(x, y, vw, vh) {
  return { x: (x / 100) * vw, y: (y / 100) * vh }
}

// local：画布坐标 → 逻辑坐标
export function viewToLocal(vx, vy, vw, vh) {
  return { x: (vx / vw) * 100, y: (vy / vh) * 100 }
}

// geo：经纬度 → 画布坐标（以 center 为中心、span 为经度跨度的窗口，纵轴按画布比例自适应）
export function projectGeoToView(lon, lat, center, span, vw, vh) {
  const latSpan = span * (vh / vw)
  const lon0 = center.lon - span / 2
  const lat1 = center.lat + latSpan / 2
  const x = ((lon - lon0) / span) * vw
  const y = vh - ((lat - lat1) / latSpan) * vh
  return { x, y }
}

// geo：画布坐标 → 经纬度
export function unprojectViewToGeo(vx, vy, center, span, vw, vh) {
  const latSpan = span * (vh / vw)
  const lon = center.lon - span / 2 + (vx / vw) * span
  const lat = center.lat + latSpan / 2 - (vy / vh) * latSpan
  return { lon, lat }
}

// 中国全图归一化平面（用于缩略图等）
export function chinaToPlane(lon, lat, targetW = 1000) {
  const h = targetW * (CHINA_LAT_SPAN / CHINA_LON_SPAN)
  const x = ((lon - CHINA_BOUNDS.minLon) / CHINA_LON_SPAN) * targetW
  const y = h - ((lat - CHINA_BOUNDS.minLat) / CHINA_LAT_SPAN) * h
  return { x, y, width: targetW, height: h }
}

// ===== 3D 场景投影 =====
// 场景单位：约 1 单位 ≈ 1 逻辑单位（local）或 1/62 中国跨度（geo）

// geo：经纬度 → 3D 场景平面坐标（中国范围归一化到 ±500）
export function geoToScene(lon, lat, scale = 1) {
  const sx = ((lon - CHINA_BOUNDS.minLon) / CHINA_LON_SPAN) * 1000 - 500
  const sz = (CHINA_BOUNDS.maxLat - lat) / CHINA_LAT_SPAN * 1000 - 500
  return { x: sx * scale, z: sz * scale }
}

// geo：3D 场景平面坐标 → 经纬度
export function sceneToGeo(sx, sz, scale = 1) {
  const x = sx / scale
  const z = sz / scale
  const lon = CHINA_BOUNDS.minLon + ((x + 500) / 1000) * CHINA_LON_SPAN
  const lat = CHINA_BOUNDS.maxLat - ((z + 500) / 1000) * CHINA_LAT_SPAN
  return { lon, lat }
}

// local：逻辑坐标 (0-100) → 3D 场景平面坐标（space 为每逻辑单位的场景单位数）
export function localToScene(x, y, space = 3) {
  return { x: (x - 50) * space, z: (y - 50) * space }
}

// local：3D 场景平面坐标 → 逻辑坐标
export function sceneToLocal(sx, sz, space = 3) {
  return { x: sx / space + 50, y: sz / space + 50 }
}

// 根据地图坐标系取点位平面位置（3D 场景坐标）
export function markerScenePos(marker, space) {
  if (marker.lon != null) return geoToScene(marker.lon, marker.lat)
  return localToScene(marker.x, marker.y, space)
}

// 根据地图坐标系取点位 2D 画布位置
export function markerViewPos(marker, center, span, vw, vh) {
  if (marker.lon != null) return projectGeoToView(marker.lon, marker.lat, center, span, vw, vh)
  return localToView(marker.x, marker.y, vw, vh)
}
