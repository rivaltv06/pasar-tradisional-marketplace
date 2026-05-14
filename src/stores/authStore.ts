import { create } from 'zustand'
import { apiSend } from '@/api/http'
import type { UserPublic, UserRole } from '@/api/types'

type AuthState = {
  token: string | null
  user: UserPublic | null
  hydrated: boolean
  hydrate: () => void
  login: (params: { identifier: string; password: string }) => Promise<void>
  register: (params: {
    role: Extract<UserRole, 'buyer' | 'seller'>
    name: string
    email?: string
    phone?: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const LS_TOKEN = 'pasar.token'
const LS_USER = 'pasar.user'

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const token = localStorage.getItem(LS_TOKEN)
    const userRaw = localStorage.getItem(LS_USER)
    const user = userRaw ? (JSON.parse(userRaw) as UserPublic) : null
    set({ token: token || null, user, hydrated: true })
  },
  login: async ({ identifier, password }) => {
    const data = await apiSend<{ token: string; user: UserPublic }>(
      '/api/auth/login',
      'POST',
      { identifier, password },
    )
    localStorage.setItem(LS_TOKEN, data.token)
    localStorage.setItem(LS_USER, JSON.stringify(data.user))
    set({ token: data.token, user: data.user })
  },
  register: async (params) => {
    const data = await apiSend<{ token: string; user: UserPublic }>(
      '/api/auth/register',
      'POST',
      params,
    )
    localStorage.setItem(LS_TOKEN, data.token)
    localStorage.setItem(LS_USER, JSON.stringify(data.user))
    set({ token: data.token, user: data.user })
  },
  logout: async () => {
    const token = get().token
    try {
      if (token) await apiSend('/api/auth/logout', 'POST', undefined, token)
    } finally {
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_USER)
      set({ token: null, user: null })
    }
  },
}))

