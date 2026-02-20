import axios from 'axios'
import { ElMessage } from 'element-plus'
import store from '@/store'
import router from '@/router'

// 创建 axios 实例
const baseURL = import.meta.env.VITE_APP_BASE_API || '/api'
console.log('Request baseURL:', baseURL)
const service = axios.create({
  // 从环境变量获取 baseURL
  baseURL: baseURL, 
  timeout: 10000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 直接检查token是否存在，确保每次请求都带上token
    const token = store.state.token
    // 确保 token 存在再添加 header，避免 Bearer undefined
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
      console.log('Request - Adding token:', token.substring(0, 20) + '...')
      console.log('Request headers:', config.headers)
    } else {
      console.log('Request - No token found')
    }
    console.log('Request URL:', config.url)
    console.log('Request full URL:', config.baseURL + config.url)
    console.log('Token:', store.state.token)
    return config
  },
  error => {
    console.log('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果返回的是二进制数据（如文件流），直接返回
    if (response.config.responseType === 'blob') {
      return res
    }

    // 约定：code 为 200 表示成功
    if (res.code && res.code !== 200) {
      // 忽略部分特定的业务状态码（如果需要）
      
      // 401: 未登录或 Token 过期
      if (res.code === 401) {
        console.log('Response 401 error - URL:', response.config.url)
        console.log('Response 401 error - Token:', store.state.token)
        // ElMessage.error('登录状态已过期，请重新登录')
        store.dispatch('logout')
        // 使用 location.reload 可能会导致体验不好，建议路由跳转
        // 但这里为了简单重置状态，刷新也是一种选择
        // location.reload() 
        // 更好的方式是抛出错误让组件处理，或者重定向
      } else {
        console.log('Response error - Code:', res.code, 'Message:', res.msg)
        ElMessage.error(res.msg || '系统错误')
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    } else {
      console.log('Response success - URL:', response.config.url)
      return res
    }
  },
  error => {
    console.log('err' + error)
    let message = error.message
    if (error.response) {
        if (error.response.status === 401) {
            // 检查是否是登录接口本身返回的401，或者是其他接口
            const url = error.response.config.url
            console.log('401 error URL:', url)
            // 检查响应体是否存在，避免后端返回401但没有响应体的情况
            const hasResponseBody = error.response.data && Object.keys(error.response.data).length > 0
            console.log('401 error has response body:', hasResponseBody)
            // 如果是登录接口返回的401，说明用户名或密码错误，不需要登出
            if (url.includes('/login')) {
                message = '登录失败，请检查账号和密码'
            } else {
                // 其他接口返回401，说明token过期或无效，需要登出
                message = '登录已过期，请重新登录'
                store.dispatch('logout')
                // 跳转到登录页面
                router.push('/login')
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
    
    // ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
