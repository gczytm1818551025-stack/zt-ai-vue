import { createStore } from 'vuex'
import { login } from '@/api/user'

const safeParse = (str) => {
  try {
    if (!str || str === 'undefined' || str === 'null') return {}
    return JSON.parse(str)
  } catch (e) {
    return {}
  }
}

const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false
    return payload.exp * 1000 < Date.now()
  } catch (e) {
    return true
  }
}

const initToken = (() => {
  const token = localStorage.getItem('token') || ''
  if (isTokenExpired(token)) {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    return ''
  }
  return token
})()

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
      } else {
        localStorage.removeItem('token')
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
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  },
  actions: {
    async login({ commit }, loginForm) {
      const res = await login(loginForm)
      if (res.code === 200) {
        const { token, nickName } = res.data
        commit('SET_TOKEN', token)
        commit('SET_USER_INFO', { nickName: nickName || '用户' })
        return res
      }
      throw new Error(res.msg || '登录失败')
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
    isLoggedIn: state => !!state.token,
    currentTheme: state => state.theme
  }
})
