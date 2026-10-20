// ===== 物流仓地图：真实 warehouseConfig 数据 → 标准 JSON 协议 =====
// 将原物流仓 3D 模型数据（warehouseConfig）按地图数据协议还原为一张完整地图：
//   - 外围围墙 + 内部隔断   → walls（2D 投影 polyline / 3D 按段拉伸）
//   - 场地轮廓             → polygons（2D 填充描边 / 3D 半透明台面）
//   - 内部通道线           → paths（道路）
//   - 货架 + 附属建筑      → buildings（2D 俯视矩形 / 3D 体块）
// 一个 JSON 配置一个工厂：该数据可直接编辑、导出、导入，2D/3D 同源渲染。

import warehouseConfig from './warehouseConfig.js'
import { SCHEMA_VERSION, defaultScene, defaultRange, formatNow } from '../utils/mapSchema.js'

// 模型坐标（x ∈ [-20, 20]，z ∈ [-14, 14]）→ 园区逻辑坐标（0-100）
const MODEL_W = 40 // warehouseConfig.size.width
const MODEL_D = 28 // warehouseConfig.size.depth
const toLx = x => ((x + MODEL_W / 2) / MODEL_W) * 100
const toLy = z => ((z + MODEL_D / 2) / MODEL_D) * 100
const toLw = w => (w / MODEL_W) * 100
const toLd = d => (d / MODEL_D) * 100

// three.js 数字色（0x2f6fde）→ 协议 #rrggbb
function hex(color) {
  if (typeof color === 'string') return color
  const n = Number(color) >>> 0
  return '#' + n.toString(16).padStart(6, '0')
}

export function buildWarehouseMapData() {
  const cfg = warehouseConfig
  const halfW = cfg.size.width / 2
  const halfD = cfg.size.depth / 2
  const wallColor = hex(cfg.walls.color)

  // ===== 墙体：外围围墙 4 段 + 内部隔断 5 条 =====
  // 高度/厚度取整为协议建议值（原模型 1.2/0.3 太矮太薄，3D 中体现不出墙体）
  const wallHeight = 4
  const wallThickness = 0.8
  const walls = [
    { id: 'wh-wall-north', name: '北围墙', points: [[toLx(-halfW), toLy(-halfD)], [toLx(halfW), toLy(-halfD)]], height: wallHeight, thickness: wallThickness, color: wallColor, opacity: 0.95, visible: true, note: '物流仓外围围墙' },
    { id: 'wh-wall-east', name: '东围墙', points: [[toLx(halfW), toLy(-halfD)], [toLx(halfW), toLy(halfD)]], height: wallHeight, thickness: wallThickness, color: wallColor, opacity: 0.95, visible: true, note: '物流仓外围围墙' },
    { id: 'wh-wall-south', name: '南围墙', points: [[toLx(halfW), toLy(halfD)], [toLx(-halfW), toLy(halfD)]], height: wallHeight, thickness: wallThickness, color: wallColor, opacity: 0.95, visible: true, note: '物流仓外围围墙' },
    { id: 'wh-wall-west', name: '西围墙', points: [[toLx(-halfW), toLy(halfD)], [toLx(-halfW), toLy(-halfD)]], height: wallHeight, thickness: wallThickness, color: wallColor, opacity: 0.95, visible: true, note: '物流仓外围围墙' },
  ]
  // 纵向隔断（沿 z 向延伸，width 为薄壁）保留：把横向空间（x 方向）分成四等分
  cfg.dividers
    .filter(d => d.depth >= d.width)
    .forEach((d, i) => {
      walls.push({
        id: 'wh-div-' + i,
        name: '纵向隔断' + (i + 1),
        // 隔断为长条形（width × depth），取两端点画线
        points: [
          [toLx(d.x - d.width / 2), toLy(d.z - d.depth / 2)],
          [toLx(d.x + d.width / 2), toLy(d.z + d.depth / 2)],
        ],
        height: 3.5,
        thickness: 0.6,
        color: wallColor,
        opacity: 0.85,
        visible: true,
        note: '',
      })
    })
  // 注意：物流仓没有横向墙体——货物经火车在月台卸货分拣、场内横向转运、对向月台发货，
  // 横向空间必须贯通；承重立柱全部贴合在纵向墙体上（见 buildings 立柱）

  // ===== 底图轮廓：场地矩形 =====
  const polygons = [{
    id: 'wh-poly-outline',
    name: '物流仓场地轮廓',
    points: [
      { x: toLx(-halfW), y: toLy(-halfD) },
      { x: toLx(halfW), y: toLy(-halfD) },
      { x: toLx(halfW), y: toLy(halfD) },
      { x: toLx(-halfW), y: toLy(halfD) },
    ],
    color: '#30DCFF',
    fillOpacity: 0.12,
    visible: true,
    note: '原 warehouseConfig 场地边界',
  }]

  // ===== 道路：内部通道线 =====
  const paths = cfg.greenLines.map((l, i) => ({
    id: 'wh-path-' + i,
    name: '内部通道' + (i + 1),
    points: [
      { x: toLx(l.x - l.width / 2), y: toLy(l.z) },
      { x: toLx(l.x + l.width / 2), y: toLy(l.z) },
    ],
    color: hex(l.color),
    width: toLd(l.depth),
    dashed: false,
    flow: false,
    visible: true,
    note: '',
  }))

  // ===== 建筑：附属建筑（水电房/员工签室）+ 承重立柱 + 全部货架排 =====
  // 承重立柱全部贴合在纵向墙体上（x=-10/0/10 三面纵向隔断），
  // 纵向四等分线 z=-7/0/7 处每面墙各嵌 1 根：3 面墙 × 3 排 = 9 根；
  // 截面 1.2×1.2 略厚于墙体（0.6）、与墙同高，呈现"立柱嵌入纵向墙体"的真实结构
  const columnSize = 1.2
  const columnHeight = wallHeight
  const pillarZs = [-7, 0, 7]
  const pillarXs = [-10, 0, 10]
  const columns = []
  pillarZs.forEach((z, zi) => {
    pillarXs.forEach((x, xi) => {
      columns.push({
        id: `wh-col-${zi}-${xi}`,
        name: `承重立柱${zi * pillarXs.length + xi + 1}`,
        x: toLx(x),
        y: toLy(z),
        width: toLw(columnSize),
        height: columnHeight,
        depth: toLd(columnSize),
        color: wallColor,
        opacity: 0.95,
        visible: true,
        note: '承重立柱（贴合于纵向隔断墙）',
      })
    })
  })

  const buildings = [
    ...columns,
    ...cfg.buildings.map(b => ({
      id: 'wh-b-' + b.id,
      name: b.name,
      x: toLx(b.x),
      y: toLy(b.z),
      width: toLw(b.width),
      height: 4,
      depth: toLd(b.depth),
      color: hex(b.color),
      opacity: 1,
      visible: true,
      note: '原附属建筑',
    })),
    ...cfg.shelves.items.map((s, i) => ({
      id: 'wh-shelf-' + i,
      name: '货架' + (i + 1),
      x: toLx(s.x),
      y: toLy(s.z),
      width: toLw(s.width),
      height: 1.2,
      depth: toLd(s.depth),
      color: hex(cfg.shelves.color),
      opacity: 0.9,
      visible: true,
      note: '',
    })),
  ]

  // ===== 点位（原模型无设备点位，保持真实还原：空数组）=====
  const markers = []

  // ===== 标签 =====
  const labels = [{
    id: 'wh-label',
    name: '物流仓名称',
    text: '智能物流仓',
    x: 50,
    y: 4,
    z: 0,
    color: '#dbf9ff',
    fontSize: 26,
    visible: true,
    note: '',
  }]

  return {
    schemaVersion: SCHEMA_VERSION,
    coordType: 'local',
    baseMap: 'grid',
    center: { lon: 114.3, lat: 30.55 },
    span: 0.1,
    range: defaultRange('local'),
    scene: defaultScene('local'),
    walls,
    buildings,
    markers,
    polygons,
    paths,
    labels,
    meta: {
      author: '',
      version: SCHEMA_VERSION,
      tags: ['物流仓'],
      extensions: { source: 'warehouseConfig' },
    },
  }
}

// 种子地图（id 供地图切换/持久化索引使用）
export const warehouseSeedMap = {
  id: 'map-warehouse',
  mapName: '智能物流仓',
  description: '真实物流仓数据还原（原 warehouseConfig 模型 → 标准 JSON 协议）',
  remark: '由原 3D 仓库模型按协议自动转换',
  createdAt: formatNow(),
  data: buildWarehouseMapData(),
}

export default warehouseSeedMap
