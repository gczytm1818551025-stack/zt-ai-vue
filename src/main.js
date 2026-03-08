import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import store from './store'

import './assets/main.css'
import 'highlight.js/styles/atom-one-dark.css'

const app = createApp(App)

app.use(ElementPlus)
app.use(router)
app.use(store)

// 初始化主题
const initTheme = localStorage.getItem('theme') || 'light'
if (initTheme === 'dark') {
  document.documentElement.classList.add('dark')
}

// Register Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
