import { createStore } from 'vuex'
import { login } from '@/api/user'

// 安全解析 JSON
const safeParse = (str) => {
  try {
    if (!str || str === 'undefined' || str === 'null') return {}
    return JSON.parse(str)
  } catch (e) {
    console.error('Parse userInfo error:', e)
    return {}
  }
}

// 初始化store状态时，从localStorage中读取token和主题
const initToken = localStorage.getItem('token') || ''
const initUserInfo = safeParse(localStorage.getItem('userInfo'))
const initTheme = localStorage.getItem('theme') || 'light'

export default createStore({
  state: {
    token: initToken,
    userInfo: initUserInfo,
    theme: initTheme
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token || ''
      if (token) {
        localStorage.setItem('token', token)
        console.log('Token stored in localStorage:', token.substring(0, 20) + '...')
      } else {
        localStorage.removeItem('token')
        console.log('Token removed from localStorage')
      }
    },
    SET_USER_INFO(state, userInfo) {
      state.userInfo = userInfo || {}
      if (userInfo && Object.keys(userInfo).length > 0) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
      } else {
        localStorage.removeItem('userInfo')
      }
    },
    LOGOUT(state) {
      state.token = ''
      state.userInfo = {}
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    },
    SET_THEME(state, theme) {
      state.theme = theme || 'light'
      localStorage.setItem('theme', theme)
      // 应用主题到文档
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    TOGGLE_THEME(state) {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      state.theme = newTheme
      localStorage.setItem('theme', newTheme)
      // 应用主题到文档
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  },
  actions: {
    async login({ commit }, loginForm) {
      try {
        const res = await login(loginForm)
        console.log('Login response:', res)
        console.log('Login response data:', res.data)
        console.log('Login response data has token:', 'token' in res.data)
        if (res.code === 200) {
            const { token, nickName } = res.data
            console.log('Login token:', token)
            console.log('Login token type:', typeof token)
            console.log('Login token length:', token ? token.length : 0)
            commit('SET_TOKEN', token)
            // 确保 userInfo 是有效的对象
            commit('SET_USER_INFO', { nickName: nickName || '用户' })
            console.log('Login success - token stored:', localStorage.getItem('token'))
            return res
        }
      } catch (error) {
        console.log('Login error:', error)
        throw error
      }
    },
    logout({ commit }) {
      commit('LOGOUT')
    },
    setTheme({ commit }, theme) {
      commit('SET_THEME', theme)
    },
    toggleTheme({ commit }) {
      commit('TOGGLE_THEME')
    }
  },
  getters: {
    isLoggedIn: state => {
      console.log('Store getter isLoggedIn called - token:', state.token)
      console.log('Store getter isLoggedIn called - token length:', state.token.length)
      return !!state.token
    },
    currentTheme: state => {
      return state.theme
    }
  }
})
