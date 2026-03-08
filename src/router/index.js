import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'
import Chat from '@/views/chat/index.vue'
import Login from '@/views/Login.vue'

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !store.getters.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router