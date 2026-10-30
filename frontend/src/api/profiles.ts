import type {
  User,
  UserProfile,
  UserProfileUpdatePayload,
} from '../types/api'
import api from './client'

export async function getProfile(
  username: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(
    `/users/${encodeURIComponent(username)}`,
    { signal },
  )
  return data
}

export async function updateProfile(
  payload: UserProfileUpdatePayload,
): Promise<User> {
  const { data } = await api.patch<User>('/users/me', payload)
  return data
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<User>('/users/me/avatar', formData)
  return data
}

export async function removeAvatar(): Promise<User> {
  const { data } = await api.delete<User>('/users/me/avatar')
  return data
}
