import { defineStore } from 'pinia'

// 系统配置存储 key
const CONFIG_KEY = 'work-maps.config.v1'

function deepClone(v) {
  return JSON.parse(JSON.stringify(v))
}

// 默认配置（与驾驶舱现有显示一致；颜色为空字符串表示使用组件默认渐变/样式）
export const DEFAULT_CONFIG = {
  dashboard: {
    // 驾驶舱大标题与副标题
    title: '普洛斯武汉新洲物流仓',
    subTitle: 'INTELLIGENT PARK MANAGEMENT CENTER',
    // 标题颜色：空 = 默认蓝白渐变
    titleColor: '',
    subTitleColor: '#c4f3fe',
    // 左右两侧卡片标题（4 + 4）
    leftCardTitles: ['大宗商品销售额', '年度经济增长点', '近年经济情况', '各区经济收益'],
    rightCardTitles: ['专项资金用途', '人群消费占比', '用电情况', '各季度增长情况'],
    // 卡片标题颜色：空 = 默认蓝白渐变
    cardTitleColor: '',
    // 时间显示
    timeEnabled: true,
    timeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeColor: '#c4f3fe',
    // 天气显示
    weatherEnabled: true,
    weatherText: '🌧️ 小雨 27°C',
    weatherColor: '#c4f3fe',
  },
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.dashboard) {
        // 与默认结构合并，缺失字段自动补齐（保证升级兼容）
        const merged = deepClone(DEFAULT_CONFIG)
        Object.keys(merged.dashboard).forEach(k => {
          if (parsed.dashboard[k] !== undefined) merged.dashboard[k] = parsed.dashboard[k]
        })
        return merged
      }
    }
  } catch (e) {
    // 配置损坏时回退默认
  }
  return deepClone(DEFAULT_CONFIG)
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: loadConfig(),
  }),
  getters: {
    // 驾驶舱配置
    dashboard(state) {
      return state.config.dashboard
    },
  },
  actions: {
    // 局部更新驾驶舱配置（实时生效并持久化）
    updateDashboard(patch) {
      Object.assign(this.config.dashboard, patch)
      this.persist()
    },
    // 恢复默认配置
    restoreDefaults() {
      this.config = deepClone(DEFAULT_CONFIG)
      this.persist()
    },
    // 持久化到 localStorage
    persist() {
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config))
      } catch (e) {
        // 存储失败仅影响刷新后的持久化
      }
    },
  },
})
