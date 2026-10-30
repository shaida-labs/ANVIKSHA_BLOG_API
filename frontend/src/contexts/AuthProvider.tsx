import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  getCurrentUser,
  loginAccount,
  registerAccount,
} from '../api/auth'
import {
  AUTH_UNAUTHORIZED_EVENT,
} from '../api/client'
import type { RegisterPayload, User } from '../types/api'
import {
  clearStoredToken,
  getStoredToken,
  storeToken,
} from '../utils/tokenStorage'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const authAttemptRef = useRef(0)

  useEffect(() => {
    const attempt = ++authAttemptRef.current
    const token = getStoredToken()
    if (!token) {
      setStatus('anonymous')
      return
    }

    const controller = new AbortController()
    let active = true

    getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (!active || attempt !== authAttemptRef.current) {
          return
        }
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active || attempt !== authAttemptRef.current) {
          return
        }
        clearStoredToken()
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setStatus('anonymous')
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginAccount({ email, password })
    authAttemptRef.current += 1
    storeToken(token.access_token)

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setStatus('authenticated')
    } catch (error) {
      clearStoredToken()
      setUser(null)
      setStatus('anonymous')
      throw error
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerAccount(payload)
    const token = await loginAccount({
      email: payload.email,
      password: payload.password,
    })
    authAttemptRef.current += 1
    storeToken(token.access_token)

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setStatus('authenticated')
    } catch (error) {
      clearStoredToken()
      setUser(null)
      setStatus('anonymous')
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    authAttemptRef.current += 1
    clearStoredToken()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, updateUser }),
    [user, status, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
