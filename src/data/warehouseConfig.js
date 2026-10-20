// 物流转运仓 3D 建筑数据配置
// 数据驱动视图：所有 mesh 都通过数据定义，支持编辑和扩展

export const warehouseConfig = {
  // 仓库整体尺寸
  size: {
    width: 40,
    depth: 28,
    wallHeight: 1.2,
    wallThickness: 0.3,
  },

  // 地面配置
  ground: {
    color: 0x0f2440,
    roughness: 0.9,
    metalness: 0.1,
  },

  // 围墙配置
  walls: {
    color: 0x2f6fde,
    roughness: 0.8,
    metalness: 0.2,
  },

  // 内部隔断墙
  dividers: [
    // 纵向隔断 - 分成4列
    { x: -10, z: 0, width: 0.25, depth: 26, height: 1 },
    { x: 0, z: 0, width: 0.25, depth: 26, height: 1 },
    { x: 10, z: 0, width: 0.25, depth: 26, height: 1 },
    // 横向隔断 - 上排/中排之间
    { x: 0, z: -5, width: 38, depth: 0.25, height: 0.8 },
    // 横向隔断 - 中排/下排之间
    { x: 0, z: 4, width: 38, depth: 0.25, height: 0.8 },
  ],

  // 内部通道线（科技蓝）
  greenLines: [
    { x: 0, z: -13, width: 38, depth: 0.5, color: 0x3a7bfd },
    { x: 0, z: 13, width: 38, depth: 0.5, color: 0x3a7bfd },
  ],

  // 货架配置
  shelves: {
    color: 0x4fc3f7,
    roughness: 0.6,
    metalness: 0.3,
    items: [],
  },

  // 附属建筑
  buildings: [
    // 水电房 - 右下角
    {
      id: 'utility-room',
      name: '水电房',
      x: 17,
      z: 11,
      width: 2,
      depth: 1.5,
      height: 1,
      color: 0x2f6fde,
    },
    // 员工签室 - 左下角
    {
      id: 'office',
      name: '员工签室',
      x: -17,
      z: 11,
      width: 3,
      depth: 2,
      height: 1,
      color: 0x26a6d9,
    },
  ],

  // 发光边框
  edges: {
    color: 0x30DCFF,
    opacity: 0.5,
  },
}

// 生成货架数据 - 上排（北排）4个区域，每个区域5排货架
for (let col = 0; col < 4; col++) {
  const baseX = -15 + col * 10
  for (let row = 0; row < 5; row++) {
    warehouseConfig.shelves.items.push({
      x: baseX + row * 0.9,
      z: -10,
      width: 0.4,
      depth: 3,
      height: 0.3,
    })
  }
}

// 中排货架
for (let col = 0; col < 4; col++) {
  const baseX = -15 + col * 10
  for (let row = 0; row < 4; row++) {
    warehouseConfig.shelves.items.push({
      x: baseX + row * 0.9,
      z: -0.5,
      width: 0.4,
      depth: 4,
      height: 0.3,
    })
  }
}

// 下排右侧货架
for (let row = 0; row < 4; row++) {
  warehouseConfig.shelves.items.push({
    x: 13 + row * 0.9,
    z: 8,
    width: 0.4,
    depth: 4,
    height: 0.3,
  })
}

export default warehouseConfig
