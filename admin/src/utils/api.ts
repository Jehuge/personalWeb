import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 未授权，清除token并跳转到登录页
      import('../store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      })
    }
    return Promise.reject(error)
  }
)

export default api




