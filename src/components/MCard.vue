<template>
  <div class="m-card" :style="{ width: width + 'px', height: height + 'px' }">
    <!-- 标题栏 -->
    <div class="m-card-hd">
      <div class="m-card-hd-bg">
        <svg :width="width" height="36" :viewBox="`0 0 ${width} 36`" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="34.5" :width="width" height="1" fill="url(#paint0_linear)" />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            :d="`M10 0.5H165L175 10.5H${width}V34.5H0V10.5L10 0.5Z`"
            fill="url(#paint1_linear)"
          />
          <path d="M0 0.5H6L0 6.5V0.5Z" fill="#30DCFF" />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M170 0.5H398V7.5H177L170 0.5Z"
            fill="url(#paint2_linear)"
          />
          <defs>
            <linearGradient
              id="paint0_linear"
              :x1="width"
              y1="35.5021"
              x2="0"
              y2="35.5021"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#35A8EB" stop-opacity="0.1" />
              <stop offset="1" stop-color="#30DCFF" />
            </linearGradient>
            <linearGradient
              id="paint1_linear"
              :x1="width"
              y1="17.5"
              x2="7.94819"
              y2="17.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.0364889" stop-color="#35A8EB" stop-opacity="0.11" />
              <stop offset="1" stop-color="#30C1FF" stop-opacity="0.27" />
            </linearGradient>
            <linearGradient
              id="paint2_linear"
              x1="567.258"
              y1="5.49999"
              x2="177.933"
              y2="5.49993"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.429792" stop-color="#35A8EB" stop-opacity="0" />
              <stop offset="1" stop-color="#30C1FF" stop-opacity="0.27" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <img class="m-card-hd-zs1" src="../assets/images/m-card/title-zs1.svg" alt="" />
      <div class="saoguang">
        <img src="../assets/images/m-card/saoguang.svg" alt="" />
      </div>
      <div class="m-card-hd-title" :style="titleStyle">{{ title }}</div>
    </div>

    <!-- 内容区域 -->
    <div class="m-card-bd" :style="{ width: width + 'px', height: height + 'px' }">
      <div class="m-card-bd-bg" :style="{ width: width + 'px', height: height + 'px' }">
        <svg
          :width="width"
          :height="height"
          :viewBox="`0 0 ${width} ${height}`"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.8">
            <path :d="bdPath" fill="rgba(10, 30, 50, 0.7)" />
            <path :d="bdPath" stroke="url(#bdStroke)" />
          </g>
          <defs>
            <linearGradient
              id="bdStroke"
              x1="199"
              y1="203.499"
              x2="199"
              y2="0.499359"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#4FC5DD" />
              <stop offset="1" stop-color="#05839D" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <img class="m-card-bd-bottom-left-arrow" src="../assets/images/m-card/content-bottom-left-arrow.svg" alt="" />
        <img class="m-card-bd-bottom-right-arrow" src="../assets/images/m-card/content-bottom-right-arrow.svg" alt="" />
        <img class="m-card-bd-middle-left-line" src="../assets/images/m-card/content-middle-line.svg" alt="" />
        <img class="m-card-bd-middle-right-line" src="../assets/images/m-card/content-middle-line.svg" alt="" />
      </div>
      <div class="m-card-bd-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: {
    type: Number,
    default: 360,
  },
  height: {
    type: Number,
    default: 180,
  },
  title: {
    type: String,
    default: '标题',
  },
  // 标题颜色：为空时使用默认蓝白渐变
  titleColor: {
    type: String,
    default: '',
  },
})

// 标题样式（配置了颜色时纯色填充，否则保留默认渐变）
const titleStyle = computed(() => {
  const c = props.titleColor
  return c
    ? { color: c, background: 'none', WebkitTextFillColor: c }
    : {}
})

// bd的路径
const bdPath = computed(() => {
  const minHeight = 156
  let diff = props.height - minHeight
  let width = props.width
  return `M3.485 ${46.0565 + diff / 2}
  V${45.8735 + diff / 2}
  L3.36682 ${45.7337 + diff / 2}
  L0.5 ${42.343 + diff / 2}
  V1
  H${width - 0.5}
  V${42.3431 + diff / 2}
  L${width - 3.367} ${45.7337 + diff / 2}
  L${width - 3.485} ${45.8735 + diff / 2}
  V${46.0565 + diff / 2}
  L${width - 3.367} ${88.745 + diff / 2}
  L${width - 0.5} ${92.135 + diff / 2}
  V${155 + diff}
  H0.5
  V${92.135 + diff / 2}
  L3.36682 ${88.745 + diff / 2}
  L3.485 ${88.605 + diff / 2}
  V${88.422 + diff / 2}
  V${46.0565 + diff / 2}Z`
})
</script>

<style scoped>
.m-card {
  position: relative;
}

.m-card-hd {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 2;
}

.m-card-hd-bg {
  position: absolute;
  left: 0;
  top: 0;
}

.m-card-hd-zs1 {
  position: absolute;
  right: 12px;
  top: 10px;
  width: 120px;
  height: 11px;
}

.m-card-hd-title {
  position: absolute;
  left: 22px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1.6px;
  height: 36px;
  line-height: 32px;
  background: linear-gradient(rgba(219, 249, 255, 1), rgba(169, 240, 255, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.m-card-hd .saoguang {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 36px;
  overflow: hidden;
  pointer-events: none;
}

.m-card-hd .saoguang img {
  width: 89px;
  height: 36px;
  animation: saoguangMove 6s linear infinite;
}

.m-card-bd {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
}

.m-card-bd-bg {
  position: absolute;
  left: 0;
  top: 0;
}

.m-card-bd-bottom-left-arrow {
  position: absolute;
  left: 4px;
  bottom: 4px;
}

.m-card-bd-bottom-right-arrow {
  position: absolute;
  right: 4px;
  bottom: 4px;
}

.m-card-bd-middle-left-line {
  position: absolute;
  left: 0;
  top: 50%;
  margin-top: -35px;
}

.m-card-bd-middle-right-line {
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -35px;
}

.m-card-bd-content {
  position: absolute;
  left: 0;
  top: 36px;
  right: 0;
  bottom: 0;
  padding: 12px 16px;
  overflow: hidden;
}
</style>
