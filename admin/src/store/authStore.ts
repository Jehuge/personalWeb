import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../utils/api'

interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchUserInfo: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)

        const response = await api.post('/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        const { access_token } = response.data
        set({ token: access_token, isAuthenticated: true })
        
        // 设置axios默认token
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        
        // 获取用户信息
        await get().fetchUserInfo()
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },

      fetchUserInfo: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data })
        } catch (error) {
          console.error('获取用户信息失败:', error)
          get().logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          state.fetchUserInfo()
        }
      },
    }
  )
)

