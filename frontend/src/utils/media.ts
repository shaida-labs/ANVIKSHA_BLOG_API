import { API_BASE_URL } from '../api/client'
import type { Post } from '../types/api'

/**
 * Turn a stored upload key or legacy remote URL into something an <img> can use.
 * New uploads are persisted as relative keys (for example
 * `covers/2026/10/abc.png`), never as browser object URLs.
 */
export function resolveMediaUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    /^(?:https?:)?\/\//i.test(trimmed)
  ) {
    return trimmed
  }

  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`
  }

  return `${API_BASE_URL}/uploads/${trimmed.replace(/^\/+/, '')}`
}

export function getPostCoverUrl(
  post: Pick<Post, 'cover_image_path' | 'cover_image_url'>,
): string | null {
  return resolveMediaUrl(post.cover_image_path ?? post.cover_image_url)
}
