import api from './api.ts'
import { API_BASE_URL } from '@/utils/media'

export const Auth = {
  async Register(email: string, password: string, fullName: string) {
    const data = {
      email: email,
      password: password,
      role: 'CUSTOMER',
      isActive: true,
      profile: {
        fullName: fullName,
        phone: null,
        address: null,
        gender: null,
        dob: null,
      },
    }
    const response = await api.post('auth/register', data)
    return response.data
  },

  async Login(email: string, password: string) {
    const data = {
      email: email,
      password: password,
    }
    const response = await api.post('auth/login', data)
    return response.data
  },

  async LoginGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`
  },

  saveToken(token: string) {
    localStorage.setItem('token', token)
  },

  async logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },
}

export default Auth
