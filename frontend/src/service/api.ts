import axios from 'axios'
import { API_BASE_URL } from '@/utils/media'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// THÊM ĐOẠN NÀY: Interceptor giúp tự động đính Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('user-updated'))
    }
    return Promise.reject(error)
  },
)

export default api
