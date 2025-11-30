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
        
        // 获取用户信息（如果失败不影响登录）
        try {
          await get().fetchUserInfo()
        } catch (error) {
          console.warn('获取用户信息失败，但登录已成功:', error)
          // 如果 /me 端点不存在，创建一个临时用户对象
          set({ 
            user: {
              id: 0,
              username: username,
              email: '',
              is_active: true,
              is_superuser: false
            }
          })
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },

      fetchUserInfo: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data })
        } catch (error: any) {
          console.error('获取用户信息失败:', error)
          // 如果是 404，说明端点不存在，不退出登录
          if (error.response?.status === 404) {
            console.warn('/api/auth/me 端点不存在，请检查服务器代码是否已更新')
            // 不退出登录，保持登录状态
            return
          }
          // 其他错误（如 401）才退出登录
          if (error.response?.status === 401) {
            get().logout()
          }
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

