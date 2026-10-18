<template>
  <div class="m-menu">
    <div
      v-for="item in items"
      :key="item.index"
      class="m-menu-item"
      :class="{ 'is-active': activeIndex === item.index }"
      @click="handleSelect(item.index)"
    >
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  defaultActive: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['select'])

const activeIndex = ref(props.defaultActive)

const handleSelect = (index) => {
  activeIndex.value = index
  emit('select', index)
}
</script>

<style scoped>
.m-menu {
  display: flex;
}

.m-menu-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 32px;
  background-image: url('../assets/images/common/menu-btn.png');
  background-size: 100%;
  background-repeat: no-repeat;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  margin: 0 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.m-menu-item span {
  display: block;
  width: 100%;
  height: 100%;
  line-height: 30px;
  text-align: center;
  letter-spacing: 1.6px;
}

.m-menu-item:hover,
.m-menu-item.is-active {
  color: rgba(255, 255, 255, 1);
  background-image: url('../assets/images/common/menu-btn-hover.png');
}

.m-menu-item.is-active::after {
  display: block;
  width: 100px;
  height: 32px;
  background-size: 100%;
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  margin-left: -50px;
  margin-top: -16px;
  z-index: -1;
  opacity: 1;
  background: rgba(0, 170, 255, 0.55);
  border-radius: 32px;
  animation: menuActiveScale 1s infinite;
}
</style>
