import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useMainStore } from './store'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

// 启动时从静态文件（public/data/maps.json）恢复地图数据，不受域名/端口影响
useMainStore(pinia).hydrateFromFile()

app.mount('#app')
