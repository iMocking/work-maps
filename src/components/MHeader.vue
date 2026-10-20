<template>
  <div class="m-header">
    <div class="m-header-wrap">
      <div class="m-header-title" :style="titleStyle">{{ title }}</div>
      <div class="m-header-subtext" :style="subTextStyle">{{ subText }}</div>
    </div>
    <div class="m-header-left">
      <slot name="left"></slot>
    </div>
    <div class="m-header-right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '数据可视化大屏',
  },
  subText: {
    type: String,
    default: 'Visualization Platform',
  },
  // 大标题颜色：为空时使用默认蓝白渐变
  titleColor: {
    type: String,
    default: '',
  },
  // 副标题颜色：为空时使用默认青色
  subTextColor: {
    type: String,
    default: '',
  },
})

const titleStyle = computed(() => {
  const c = props.titleColor
  return c
    ? { color: c, background: 'none', WebkitTextFillColor: c }
    : {}
})

const subTextStyle = computed(() => {
  const c = props.subTextColor
  return c ? { color: c } : {}
})
</script>

<style scoped>
.m-header {
  position: relative;
  left: 0;
  top: 0;
  right: 0;
  width: 100%;
  height: 90px;
  z-index: 2;
}

.m-header-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 1920px;
  height: 90px;
  margin: 0 auto;
  background: url('../assets/images/common/header-bg.png') no-repeat;
  background-size: 100%;
  text-align: center;
  box-sizing: border-box;
  padding-top: 6px;
}

.m-header-title {
  color: #fff;
  font-size: 42px;
  letter-spacing: 4px;
  font-weight: 700;
  background: linear-gradient(rgba(117, 232, 255, 1), rgba(255, 255, 255, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.m-header-subtext {
  opacity: 0.64;
  font-size: 12px;
  letter-spacing: 3px;
  font-weight: 300;
  line-height: 14.4px;
  color: rgba(196, 243, 254, 1);
  margin-top: 4px;
}

.m-header-left {
  color: #fff;
  position: absolute;
  top: 47px;
  left: 32px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.m-header-right {
  color: #fff;
  position: absolute;
  top: 47px;
  right: 32px;
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
