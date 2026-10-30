import type { UploadedImage } from '../types/api'
import api from './client'

export async function uploadCoverImage(
  file: File,
  options: {
    signal?: AbortSignal
    onProgress?: (percentage: number) => void
  } = {},
): Promise<UploadedImage> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post<UploadedImage>('/uploads/images', formData, {
    signal: options.signal,
    onUploadProgress: (event) => {
      if (!options.onProgress) {
        return
      }
      const total = event.total ?? file.size
      const percentage =
        total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0
      options.onProgress(percentage)
    },
  })

  return data
}
