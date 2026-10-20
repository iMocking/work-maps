<template>
  <div class="system-config">
    <!-- 顶部操作条 -->
    <div class="config-toolbar">
      <div class="toolbar-tip">配置修改后实时生效并自动保存，驾驶舱打开/刷新后立即应用。</div>
      <button class="btn-default" @click="confirmReset">↺ 恢复默认配置</button>
    </div>

    <!-- 驾驶舱标题 -->
    <div class="config-section">
      <div class="section-title">驾驶舱标题</div>
      <div class="section-grid">
        <div class="form-item">
          <label class="form-label">大标题</label>
          <input v-model="dash.title" type="text" class="form-input" placeholder="如 普洛斯武汉新洲物流仓" />
        </div>
        <div class="form-item">
          <label class="form-label">大标题颜色</label>
          <div class="color-row">
            <input v-model="dash.titleColor" type="color" class="color-input" />
            <input v-model="dash.titleColor" type="text" class="form-input color-text" placeholder="留空 = 默认蓝白渐变" />
            <button class="btn-clear" @click="dash.titleColor = ''">清除</button>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">副标题</label>
          <input v-model="dash.subTitle" type="text" class="form-input" placeholder="如 INTELLIGENT PARK MANAGEMENT CENTER" />
        </div>
        <div class="form-item">
          <label class="form-label">副标题颜色</label>
          <div class="color-row">
            <input v-model="dash.subTitleColor" type="color" class="color-input" />
            <input v-model="dash.subTitleColor" type="text" class="form-input color-text" placeholder="#c4f3fe" />
          </div>
        </div>
      </div>
      <div class="live-preview">
        <span class="preview-label">实时预览：</span>
        <span class="preview-title" :style="titlePreviewStyle">{{ dash.title || '（未设置）' }}</span>
        <span class="preview-sub" :style="subPreviewStyle">{{ dash.subTitle }}</span>
      </div>
    </div>

    <!-- 两侧卡片标题 -->
    <div class="config-section">
      <div class="section-title">
        两侧卡片标题
        <span class="section-desc">驾驶舱左/右面板各 4 张卡片的标题，逐张配置</span>
      </div>
      <div class="card-titles-grid">
        <div class="card-titles-col">
          <div class="col-head">左侧面板</div>
          <div v-for="(t, i) in dash.leftCardTitles" :key="'l' + i" class="form-item">
            <label class="form-label">左卡片 {{ i + 1 }}</label>
            <input v-model="dash.leftCardTitles[i]" type="text" class="form-input" />
          </div>
        </div>
        <div class="card-titles-col">
          <div class="col-head">右侧面板</div>
          <div v-for="(t, i) in dash.rightCardTitles" :key="'r' + i" class="form-item">
            <label class="form-label">右卡片 {{ i + 1 }}</label>
            <input v-model="dash.rightCardTitles[i]" type="text" class="form-input" />
          </div>
        </div>
      </div>
      <div class="form-item form-item-row">
        <label class="form-label">卡片标题颜色</label>
        <div class="color-row">
          <input v-model="dash.cardTitleColor" type="color" class="color-input" />
          <input v-model="dash.cardTitleColor" type="text" class="form-input color-text" placeholder="留空 = 默认蓝白渐变" />
          <button class="btn-clear" @click="dash.cardTitleColor = ''">清除</button>
        </div>
      </div>
    </div>

    <!-- 时间显示 -->
    <div class="config-section">
      <div class="section-title">
        时间显示
        <span class="section-desc">驾驶舱右上角实时时间</span>
      </div>
      <div class="section-grid">
        <div class="form-item">
          <label class="form-label">显示开关</label>
          <label class="switch">
            <input v-model="dash.timeEnabled" type="checkbox" />
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="form-item">
          <label class="form-label">时间格式</label>
          <select v-model="timeFormatSelect" class="form-input" @change="onTimeFormatChange">
            <option v-for="opt in timeFormatOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div v-if="timeFormatSelect === '__custom__'" class="form-item">
          <label class="form-label">自定义格式</label>
          <input v-model="dash.timeFormat" type="text" class="form-input" placeholder="支持 YYYY MM DD HH mm ss" />
        </div>
        <div class="form-item">
          <label class="form-label">颜色</label>
          <div class="color-row">
            <input v-model="dash.timeColor" type="color" class="color-input" />
            <input v-model="dash.timeColor" type="text" class="form-input color-text" placeholder="#c4f3fe" />
          </div>
        </div>
      </div>
      <div class="live-preview">
        <span class="preview-label">实时预览：</span>
        <span class="preview-mono" :style="{ color: dash.timeColor }">{{ previewTime }}</span>
      </div>
    </div>

    <!-- 天气显示 -->
    <div class="config-section">
      <div class="section-title">
        天气显示
        <span class="section-desc">驾驶舱左上角天气信息</span>
      </div>
      <div class="section-grid">
        <div class="form-item">
          <label class="form-label">显示开关</label>
          <label class="switch">
            <input v-model="dash.weatherEnabled" type="checkbox" />
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="form-item">
          <label class="form-label">天气文本</label>
          <input v-model="dash.weatherText" type="text" class="form-input" placeholder="如 🌧️ 小雨 27°C" />
        </div>
        <div class="form-item">
          <label class="form-label">颜色</label>
          <div class="color-row">
            <input v-model="dash.weatherColor" type="color" class="color-input" />
            <input v-model="dash.weatherColor" type="text" class="form-input color-text" placeholder="#c4f3fe" />
          </div>
        </div>
      </div>
      <div class="live-preview">
        <span class="preview-label">实时预览：</span>
        <span class="preview-mono" :style="{ color: dash.weatherColor }">{{ dash.weatherText }}</span>
      </div>
    </div>

    <!-- 恢复默认确认弹窗 -->
    <div v-if="resetVisible" class="modal-overlay" @click.self="resetVisible = false">
      <div class="modal-card modal-sm">
        <div class="modal-header">
          <span class="modal-title">恢复默认配置</span>
          <button class="modal-close" @click="resetVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="delete-text">确定将驾驶舱相关配置全部恢复为默认值吗？此操作不可撤销。</p>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="resetVisible = false">取消</button>
          <button class="btn-danger-solid" @click="doReset">恢复默认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useConfigStore } from '../../store/config'

const store = useConfigStore()
// 驾驶舱配置（getter 实时读取 store，v-model 直接修改其属性；deep watch 负责实时持久化）
const dash = computed({
  get: () => store.dashboard,
  set: () => {},
})
watch(dash, () => store.persist(), { deep: true })

// 时间格式选项
const timeFormatOptions = [
  { value: 'YYYY-MM-DD HH:mm:ss', label: '2026-10-20 10:30:00（年月日 时分秒）' },
  { value: 'YYYY-MM-DD HH:mm', label: '2026-10-20 10:30（年月日 时分）' },
  { value: 'YYYY/MM/DD HH:mm:ss', label: '2026/10/20 10:30:00（斜杠）' },
  { value: 'MM-DD HH:mm', label: '10-20 10:30（月日 时分）' },
  { value: 'HH:mm:ss', label: '10:30:00（仅时分秒）' },
  { value: 'HH:mm', label: '10:30（仅时分）' },
  { value: '__custom__', label: '自定义…' },
]

const timeFormatSelect = ref(
  timeFormatOptions.some(o => o.value === store.dashboard.timeFormat)
    ? store.dashboard.timeFormat
    : '__custom__'
)

function onTimeFormatChange() {
  if (timeFormatSelect.value !== '__custom__') {
    store.updateDashboard({ timeFormat: timeFormatSelect.value })
  }
}

// 实时预览时间（每秒刷新）
const previewTime = ref('')
let timer = null
function tick() {
  previewTime.value = formatTime(new Date(), store.dashboard.timeFormat)
}
function formatTime(date, fmt) {
  const pad = (n) => String(n).padStart(2, '0')
  return (fmt || 'YYYY-MM-DD HH:mm:ss')
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}
tick()
timer = setInterval(tick, 1000)

// 标题预览样式（颜色为空时保留默认渐变效果）
const titlePreviewStyle = computed(() => {
  const c = dash.value.titleColor
  return c
    ? { color: c, background: 'none', WebkitTextFillColor: c }
    : { background: 'linear-gradient(rgba(117,232,255,1), rgba(255,255,255,1))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
})
const subPreviewStyle = computed(() => ({ color: dash.value.subTitleColor }))

// 恢复默认
const resetVisible = ref(false)
function confirmReset() {
  resetVisible.value = true
}
function doReset() {
  store.restoreDefaults()
  timeFormatSelect.value = store.dashboard.timeFormat
  resetVisible.value = false
}

// 清理定时器
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.system-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1100px;
}

.config-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 14px 20px;
}

.toolbar-tip {
  color: #909399;
  font-size: 13px;
}

.config-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.section-desc {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 24px;
}

.card-titles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
}

.card-titles-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.col-head {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item-row {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.form-item-row .form-label {
  min-width: 110px;
}

.form-label {
  font-size: 13px;
  color: #606266;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  color: #303133;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 40px;
  height: 34px;
  padding: 2px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.color-text {
  flex: 1;
  min-width: 0;
}

.btn-clear {
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #909399;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-clear:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: #dcdfe6;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: all 0.3s;
}

.switch input:checked + .switch-slider {
  background: #409eff;
}

.switch input:checked + .switch-slider::before {
  transform: translateX(20px);
}

/* 实时预览 */
.live-preview {
  margin-top: 16px;
  padding: 12px 16px;
  background: #0a1e33;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}

.preview-label {
  color: rgba(196, 243, 254, 0.6);
  font-size: 12px;
}

.preview-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

.preview-sub {
  font-size: 12px;
  letter-spacing: 2px;
  opacity: 0.8;
}

.preview-mono {
  font-family: 'D-DIN', Consolas, monospace;
  font-size: 15px;
  letter-spacing: 1px;
}

/* 按钮（与其它管理页一致） */
.btn-default {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}

.btn-default:hover {
  border-color: #409eff;
  color: #409eff;
}

.btn-danger-solid {
  padding: 8px 16px;
  background: #f56c6c;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-danger-solid:hover {
  background: #f78989;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  width: 460px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-sm {
  width: 380px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.modal-close {
  background: none;
  border: none;
  color: #909399;
  font-size: 15px;
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #606266;
}

.modal-body {
  padding: 20px;
}

.delete-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #ebeef5;
}
</style>
