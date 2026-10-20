# 地图 JSON 数据协议设计（Smart Factory 概念）

> 园区物联网地图编辑 · 数据驱动视图 · 高开放度 · 高可编辑
> 设计日期：2026-10-20 · 协议版本：1.0

## 1. 设计目标

与 Smart Factory 的核心理念一致：**一张园区/工厂地图 = 一个 JSON 文件**。
该 JSON 完整记录地图渲染所需的全部数据（含 3D 模式下每个墙体的位置、颜色、尺寸），
任何支持本协议的渲染器都可以用它重建 2D/3D 场景，不依赖特定编辑器的内部状态。

三条设计原则：

1. **数据驱动视图**：渲染层（2D SVG / 3D three.js）只读 `data`，编辑层只改 `data`，JSON 是唯一事实来源。
2. **高开放度**：协议只约定必填骨架与已知要素，`meta.extensions` 保留任意扩展；未知字段导入时保留、导出时不丢失。
3. **高可编辑**：所有要素（墙体/建筑/点位/轮廓/道路/标签）均可通过编辑器增删改，修改即时反映到 2D/3D 视图并持久化。

## 2. 顶层结构

用户指定的固定外壳：

```json
{
  "mapName": "园区地图",
  "description": "园区物联网数字孪生地图",
  "createdAt": "2026-10-20 10:30:00",
  "remark": "v1.0 · 维护人：admin",
  "data": {
    "schemaVersion": "1.0",
    "coordType": "local",
    "baseMap": "grid",
    "center": { "lon": 114.3, "lat": 30.55 },
    "span": 0.1,
    "range": { "x": [0, 100], "y": [0, 100], "z": [0, 50] },
    "scene": { ... },
    "walls": [ ... ],
    "buildings": [ ... ],
    "markers": [ ... ],
    "polygons": [ ... ],
    "paths": [ ... ],
    "labels": [ ... ],
    "meta": { ... }
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| mapName | string | 地图名称（必填，导入校验） |
| description | string | 地图描述，编辑器「地图信息」可维护 |
| createdAt | string | 创建时间 |
| remark | string | 备注（版本、维护人、协议说明等） |
| data | object | 渲染数据（必填） |

## 3. data 分层说明

### 3.1 坐标体系

- `coordType: "local"` —— 园区/工厂逻辑坐标，x/y ∈ [0,100]，z 为高度（逻辑单位），2D/3D 共用同一投影规则。
- `coordType: "geo"` —— 真实经纬度，`center` + `span` 定义视图窗口（中国 GIS 底图模式）。

### 3.2 scene —— 3D 场景配置（数据驱动场景）

```json
"scene": {
  "background": "#eef4fb",
  "ground": { "color": "#f0f4fa", "opacity": 0.55, "size": 320 },
  "grid": { "show": true, "size": 320, "divisions": 20, "color": "#93b5dd" },
  "lights": [
    { "type": "ambient", "color": "#ffffff", "intensity": 0.75 },
    { "type": "directional", "color": "#ffffff", "intensity": 0.9, "position": [300, 600, 200] }
  ],
  "camera": { "fov": 50, "position": [0, 320, 380], "target": [0, 0, 0] }
}
```

渲染端（`Map3DEditor`）初始化时逐项读取：背景色、地面色/透明度/尺寸、网格显隐/颜色、灯光组、相机初始位。

### 3.3 walls —— 墙体（3D 渲染核心要素）

每面墙体由折线顶点 + 尺寸 + 外观构成，3D 中按段拉伸为立体墙：

```json
{
  "id": "wall-north",
  "name": "北围墙",
  "points": [[12, 12], [88, 12]],
  "height": 5,
  "thickness": 0.6,
  "color": "#5470c6",
  "opacity": 0.95,
  "visible": true,
  "note": "厂区北侧边界"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| points | [[number,number], ...] | 折线顶点（local 为 [x,y]，geo 为 [lon,lat]），至少 2 个 |
| height | number | 墙高（逻辑单位，3D 中按坐标模式缩放） |
| thickness | number | 墙厚 |
| color / opacity | string / number | 外观 |
| visible | boolean | 显隐控制（导入保留） |

3D 渲染算法：相邻顶点成段，每段生成 `BoxGeometry(thickness, height, len)`，绕 Y 轴旋转 `atan2(dx, dz)` 对齐方向，材质透明度取 `opacity`。

编辑器能力：3D 中「添加墙体」工具单击加顶点、双击成墙、右键撤销；2D 中选中后可拖动顶点；属性面板可改名称/高/厚/颜色/透明度/可见/备注。

### 3.4 buildings —— 建筑体块

```json
{ "id": "b-office", "name": "办公楼", "x": 48, "y": 28, "width": 20, "height": 9, "depth": 12, "color": "#5470c6", "opacity": 1, "visible": true, "note": "" }
```

2D 显示为矩形投影，3D 拉伸为 Box；`x/y`（local）或 `lon/lat`（geo）定位。

### 3.5 markers —— 点位（设备 / POI）

```json
{ "id": 1, "type": "camera", "name": "大门摄像头", "icon": "📹", "x": 50, "y": 12, "color": "#30DCFF", "label": "📹 大门", "location": "园区大门门柱", "status": "在线", "note": "" }
```

`type` 与字典（设备管理）联动；`attrs` 可选承载设备扩展属性（如绑定 IoT 设备 id）。

### 3.6 polygons / paths / labels

- `polygons`：底图轮廓/区域（园区围墙、水域示意），2D 填充、3D 投影。
- `paths`：道路/连线，3D 渲染为 Line（`dashed: true` 时虚线）。
- `labels`：文字标签，2D 文本、3D 精灵（Sprite），`fontSize/color` 控制外观。

### 3.7 meta —— 开放扩展

```json
"meta": {
  "author": "work-maps",
  "version": "1.0",
  "tags": ["smart-factory", "iot", "demo"],
  "extensions": { "iotGateway": "mqtt://factory-broker:1883", "deviceBinding": { "camera": ["cam-001"] } }
}
```

`extensions` 为开放对象，协议不校验其内部结构——物联网绑定、业务标签等均可落入此处，导入导出原样保留。

## 4. 数据驱动渲染

```
JSON (data) ──► Pinia store（内部模型 = 协议模型） ──► 2D SVG 渲染 ──► 3D three.js 渲染
                      ▲                                      │
                      └──────── 编辑操作（增删改）──────────────┘
```

- **内部模型 = 协议模型（v2 定稿）**：一个地图在 store 中就是 `{ id(运行时), mapName, description, createdAt, remark, data }`，其中 `id` 仅用于应用内地图切换与持久化索引，不属于协议字段。
- **导出** = 内部模型 → 协议 JSON（仅剔除运行时 `id`，其余字段原样序列化，不做逐字段转换）。
- **导入** = 协议 JSON → 校验 → 归一化（缺失字段补默认值，未知字段保留于 meta.extensions）→ 分配运行时 `id` 加入 store。

## 5. 存储与一次性迁移（v2，无兼容分支）

### 5.1 持久化结构

- 存储 key：`work-maps.maps.v2`，值即协议结构（不含运行时 `id`）：
  `{ "maps": [ {mapName, description, createdAt, remark, data}, ... ], "activeMapId": "map-xxx" }`
- 字典 key 不变：`work-maps.dict-list.v1`。

### 5.2 v1 → v2 一次性迁移

旧 key `work-maps.maps.v1`（`{ list, data, activeMapId }` 拆分结构）**只用于一次迁移**：

| 旧字段 | 新位置 |
|---|---|
| list[].name | data 层 `mapName` |
| list[].coordType / baseMap / center / span | data 层 `data.coordType / baseMap / center / span` |
| data[id].boxes | `data.buildings`（boxes → buildings 统一命名） |
| data[id].markers / polygons | 原样落入 `data.markers / polygons` |
| data[id].walls / paths / labels（旧版本无此功能，空数组视为未定义） | 按同名种子地图（map-park / map-geo-wuhan）默认补齐 |
| 缺失的 scene / range | `defaultScene(coordType)` / `defaultRange(coordType)` |
| activeMapId | 保留（仍存在时） |

迁移成功即写入 `work-maps.maps.v2` 并 **删除旧 key**，此后代码中不存在任何 v1 兼容分支。

### 5.3 数据规则（定稿）

- 地图列表永不空：删除地图时至少保留一张。
- 所有编辑动作（增删改点位/建筑/墙体/轮廓/道路/标签、改 mapName/description/remark、底图设置）最终都落到 `data` 并即时持久化。
- 要素数组均为可选：空数组合法；导入缺字段时补默认值。

## 6. 导入 / 导出

- **导出**：工具栏「📤 导出 JSON」→ 下载 `<mapName>.factory.json`（UTF-8、2 空格缩进、人类可读可再编辑）。
- **导入**：工具栏「📥 导入 JSON」→ 选择/拖拽文件 → 校验（必填 mapName、data、coordType 合法、墙体≥2 顶点、要素位置完整）→ 预览（名称/坐标模式/六类要素计数）→ 确认导入为新地图。
- 校验失败不产生任何数据变更。
- 示例文件：`examples/smart-factory-demo.factory.json`（同时发布在 `/examples/`，导入弹窗可一键下载体验）。

## 7. 兼容与演进

- 协议版本号 `schemaVersion`：导入时版本不一致给出 warning 并按当前协议归一化处理。
- 历史数据迁移：仅支持 v1 → v2 一次性迁移（见 5.2），不接受老结构运行时兼容——标准即当前结构，不留技术债务。
- 新增要素类型时：协议加数组、渲染器加渲染函数、编辑器加工具，三步即可扩展，不破坏既有数据。
- `meta.extensions` 为开放对象：物联网绑定、业务标签等均可落入此处，导入导出原样保留。
