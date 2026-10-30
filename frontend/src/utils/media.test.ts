import { describe, expect, it } from 'vitest'

import { API_BASE_URL } from '../api/client'
import { getPostCoverUrl, resolveMediaUrl } from './media'

describe('media helpers', () => {
  it('resolves stored upload keys against the uploads endpoint', () => {
    expect(resolveMediaUrl('covers/2026/10/cover.png')).toBe(
      `${API_BASE_URL}/uploads/covers/2026/10/cover.png`,
    )
  })

  it('keeps absolute upload paths on the API origin', () => {
    expect(resolveMediaUrl('/uploads/covers/2026/10/cover.webp')).toBe(
      `${API_BASE_URL}/uploads/covers/2026/10/cover.webp`,
    )
  })

  it('preserves legacy remote URLs and ignores empty values', () => {
    expect(resolveMediaUrl('https://cdn.example.com/cover.jpg')).toBe(
      'https://cdn.example.com/cover.jpg',
    )
    expect(resolveMediaUrl('   ')).toBeNull()
    expect(resolveMediaUrl(null)).toBeNull()
  })

  it('prefers the uploaded path over the legacy URL', () => {
    expect(
      getPostCoverUrl({
        cover_image_path: 'covers/2026/10/new.png',
        cover_image_url: 'https://cdn.example.com/old.jpg',
      }),
    ).toBe(`${API_BASE_URL}/uploads/covers/2026/10/new.png`)
  })

  it('falls back to the legacy URL when no upload path exists', () => {
    expect(
      getPostCoverUrl({
        cover_image_path: null,
        cover_image_url: 'https://cdn.example.com/old.jpg',
      }),
    ).toBe('https://cdn.example.com/old.jpg')
  })
})
