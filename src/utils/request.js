import axios from 'axios'
import { ElMessage } from 'element-plus'
import store from '@/store'
import router from '@/router'

const baseURL = import.meta.env.VITE_APP_BASE_API || '/api'
const service = axios.create({
  baseURL: baseURL,
  timeout: 10000
})

service.interceptors.request.use(
  config => {
    const token = store.state.token
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    const res = response.data

    if (response.config.responseType === 'blob') {
      return res
    }

    if (res.code && res.code !== 200) {
      if (res.code === 401) {
        handleUnauthorized()
      } else {
        ElMessage.error(res.msg || '系统错误')
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    }
    return res
  },
  error => {
    let message = error.message
    if (error.response) {
      const status = error.response.status
      const url = error.response.config.url

      if (status === 401) {
        if (!url.includes('/login')) {
          handleUnauthorized()
        } else {
          message = '登录失败，请检查账号和密码'
        }
      } else if (error.response.data && error.response.data.msg) {
        message = error.response.data.msg
      } else {
        message = error.response.statusText
      }
    } else if (message.includes('timeout')) {
      message = '系统接口请求超时'
    } else if (message.includes('Network Error')) {
      message = '后端接口连接异常'
    }

    return Promise.reject(error)
  }
)

function handleUnauthorized() {
  ElMessage.error('登录已过期，请重新登录')
  store.dispatch('logout')
  router.push('/login')
}

export default service
