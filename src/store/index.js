import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    // 地图点位数据
    markers: [
      { id: 1, type: 'camera', name: '东南3摄像头', icon: '📹', x: 65, y: 35, color: '#30DCFF', label: '📹 东南3', location: '东南门东侧建筑外墙', status: '在线', note: '正常运行' },
      { id: 2, type: 'camera', name: '西北2摄像头', icon: '📹', x: 30, y: 30, color: '#30DCFF', label: '', location: '西北角办公楼顶层', status: '在线', note: '正常运行' },
      { id: 3, type: 'fire', name: '东门消防栓', icon: '🧯', x: 75, y: 60, color: '#ff6b6b', label: '', location: '东门外道路南侧', status: '正常', note: '水压正常' },
      { id: 4, type: 'fire', name: '西门消防栓', icon: '🧯', x: 25, y: 55, color: '#ff6b6b', label: '', location: '西门内广场西侧', status: '正常', note: '水压正常' },
      { id: 5, type: 'water', name: '北区水井', icon: '💧', x: 45, y: 25, color: '#64b5f6', label: '', location: '北厂区绿化带内', status: '正常', note: '水质合格' },
      { id: 6, type: 'electric', name: '中心电井房', icon: '⚡', x: 55, y: 45, color: '#ffd54f', label: '⚠ 温度异常', location: '中央配电室', status: '异常', note: '温度偏高38°C' },
      { id: 7, type: 'electric', name: '南区电井房', icon: '⚡', x: 40, y: 70, color: '#ffd54f', label: '', location: '南办公楼地下一层', status: '正常', note: '温度28°C' },
    ],
    // 当前选中的点位
    selectedMarker: null,
    // 当前激活的菜单
    activeMenu: 'dashboard',
  }),
  getters: {
    // 按类型筛选点位
    markersByType: (state) => (type) => {
      return state.markers.filter(m => m.type === type)
    },
    // 统计各类型数量
    deviceCount: (state) => {
      const counts = { camera: 0, fire: 0, water: 0, electric: 0 }
      state.markers.forEach(m => {
        if (counts[m.type] !== undefined) counts[m.type]++
      })
      return counts
    },
    // 异常设备数量
    abnormalCount: (state) => {
      return state.markers.filter(m => m.status === '异常').length
    },
  },
  actions: {
    // 添加点位
    addMarker(marker) {
      this.markers.push({ ...marker, id: Date.now() })
    },
    // 更新点位
    updateMarker(id, data) {
      const index = this.markers.findIndex(m => m.id === id)
      if (index !== -1) {
        this.markers[index] = { ...this.markers[index], ...data }
      }
    },
    // 删除点位
    removeMarker(id) {
      this.markers = this.markers.filter(m => m.id !== id)
    },
    // 选中点位
    selectMarker(marker) {
      this.selectedMarker = marker
    },
    // 设置激活菜单
    setActiveMenu(menu) {
      this.activeMenu = menu
    },
  },
})
