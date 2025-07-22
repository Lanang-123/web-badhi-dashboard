// src/store/useAuthStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'

// fallback in-memory untuk SSR
const memoryStorage: StateStorage = {
  getItem: (_) => null,
  setItem: () => {},
  removeItem: () => {},
}

// wrapper localStorage untuk StateStorage
enum StorageKey {
  Auth = 'auth-storage',
}
const browserStorage: StateStorage = {
  getItem: (name) => window.localStorage.getItem(name),
  setItem: (name, value) => window.localStorage.setItem(name, value!),
  removeItem: (name) => window.localStorage.removeItem(name),
}

interface User {
  id:number
  name: string
  role: string
  avatar?: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      // Async handler untuk login, termasuk fetch user details
      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          // 1. Login untuk dapatkan token
          const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          const data = await res.json()
          if (!res.ok) {
            set({ loading: false, error: data.error || data.message || 'Login failed' })
            return false
          }
          const token = data.access_token

          // 2. Fetch user details dengan token
          const detailRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/details`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          })
          const userData = await detailRes.json()
          
          
          if (!detailRes.ok) {
            set({ loading: false, error: userData.error || 'Failed to fetch user details' })
            return false
          }

          // 3. Set token & user ke state
          const user: User = {
            id: userData.datas.id,
            name: userData.datas.name,
            role: 'Researcher',
            avatar: userData.datas.avatar,
          }
          set({ token, user, loading: false })
          return true
        } catch (err: any) {
          set({ loading: false, error: err.message || 'Network error' })
          return false
        }
      },

      // Async handler untuk logout
      logout: async () => {
        const { token } = get()
        if (token) {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            })
            await response.json()
          } catch (err) {
            console.error('Logout API error:', err)
          }
        }
        // Clear state
        set({ token: null, user: null })
        // Remove persisted storage (token and user)
        browserStorage.removeItem(StorageKey.Auth)
      },
    }),
    {
      name: StorageKey.Auth,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? browserStorage : memoryStorage
      ),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

export default useAuthStore
