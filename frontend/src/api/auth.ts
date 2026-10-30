import type {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  User,
} from '../types/api'
import api from './client'

export async function registerAccount(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>('/register', payload)
  return data
}

export async function loginAccount(
  payload: LoginPayload,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/login', {
    email: payload.email,
    password: payload.password,
  })
  return data
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const { data } = await api.get<User>('/users/me', { signal })
  return data
}
