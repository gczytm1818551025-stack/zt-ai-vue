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
  console.log('Router beforeEach - to:', to.path)
  console.log('Router beforeEach - requiresAuth:', to.meta.requiresAuth)
  console.log('Router beforeEach - isLoggedIn:', store.getters.isLoggedIn)
  console.log('Router beforeEach - token:', store.state.token)
  if (to.meta.requiresAuth && !store.getters.isLoggedIn) {
    console.log('Router beforeEach - redirecting to login')
    next('/login')
  } else {
    console.log('Router beforeEach - allowing navigation')
    next()
  }
})

export default router