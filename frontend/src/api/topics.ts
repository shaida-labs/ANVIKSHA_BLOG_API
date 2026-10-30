import type { Topic } from '../types/api'
import api from './client'

export async function listTopics(signal?: AbortSignal): Promise<Topic[]> {
  const { data } = await api.get<Topic[]>('/topics', { signal })
  return data
}
