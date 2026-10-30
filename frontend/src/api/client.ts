import axios from 'axios'

import {
  clearStoredToken,
  getStoredToken,
} from '../utils/tokenStorage'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

export const AUTH_UNAUTHORIZED_EVENT = 'anviksha:unauthorized'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const currentToken = getStoredToken()
      const requestHeaders = error.config?.headers
      const requestAuthorization =
        typeof requestHeaders?.get === 'function'
          ? requestHeaders.get('Authorization')
          : requestHeaders?.Authorization
      const requestToken =
        typeof requestAuthorization === 'string' &&
        requestAuthorization.toLowerCase().startsWith('bearer ')
          ? requestAuthorization.slice(7).trim()
          : null

      // Ignore a late 401 from a request that used a token which has since
      // been replaced. Otherwise an old hydration request can sign out a
      // freshly authenticated session.
      if (currentToken && requestToken === currentToken) {
        clearStoredToken()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
