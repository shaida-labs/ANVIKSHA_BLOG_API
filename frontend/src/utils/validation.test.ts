import { describe, expect, it } from 'vitest'

import {
  getExcerpt,
  getInitial,
  getReadingMinutes,
  pluralize,
} from './format'
import { getSafeRedirect } from './redirect'
import {
  MAX_COVER_IMAGE_MB,
  hasErrors,
  hasValidCoverImageSignature,
  validateComment,
  validateCoverImageFile,
  validateLogin,
  validatePostForm,
  validateRegistration,
} from './validation'

describe('validation', () => {
  it('rejects an invalid login payload', () => {
    const errors = validateLogin({ email: 'not-an-email', password: '' })

    expect(errors.email).toBeTruthy()
    expect(errors.password).toBeTruthy()
    expect(hasErrors(errors)).toBe(true)
  })

  it('accepts a valid registration payload', () => {
    const errors = validateRegistration({
      username: 'jane_doe',
      email: 'jane@example.com',
      password: 'StrongPass123',
    })

    expect(errors).toEqual({})
  })

  it('enforces the backend password rules', () => {
    const errors = validateRegistration({
      username: 'jane_doe',
      email: 'jane@example.com',
      password: 'allletters',
    })

    expect(errors.password).toContain('number')
  })

  it('validates post title and content boundaries', () => {
    expect(validatePostForm({ title: '   ', content: '' })).toEqual({
      title: 'Add a title before saving.',
      content: 'Write some content before saving.',
    })
    expect(
      validatePostForm({ title: 'A title', content: 'A complete thought.' }),
    ).toEqual({})
  })

  it('accepts JPEG, PNG, and WebP files within the size limit', () => {
    expect(
      validateCoverImageFile({
        name: 'cover.jpg',
        size: 1024,
        type: 'image/jpeg',
      }),
    ).toBeNull()
    expect(
      validateCoverImageFile({
        name: 'cover.PNG',
        size: 1024,
        type: 'image/png',
      }),
    ).toBeNull()
    expect(
      validateCoverImageFile({
        name: 'cover.webp',
        size: 1024,
        type: 'image/webp',
      }),
    ).toBeNull()
  })

  it('accepts an allowed extension when the browser supplies no MIME type', () => {
    expect(
      validateCoverImageFile({ name: 'cover.jpeg', size: 1024, type: '' }),
    ).toBeNull()
    expect(
      validateCoverImageFile({ name: 'notes.txt', size: 1024, type: '' }),
    ).toContain('JPEG, PNG, or WebP')
  })

  it('rejects empty, oversized, and unsupported images', () => {
    expect(
      validateCoverImageFile({ name: 'empty.png', size: 0, type: 'image/png' }),
    ).toContain('not empty')
    expect(
      validateCoverImageFile({
        name: 'large.png',
        size: MAX_COVER_IMAGE_MB * 1024 * 1024 + 1,
        type: 'image/png',
      }),
    ).toContain(`${MAX_COVER_IMAGE_MB} MB`)
    expect(
      validateCoverImageFile({
        name: 'animation.gif',
        size: 1024,
        type: 'image/gif',
      }),
    ).toContain('JPEG, PNG, or WebP')
  })

  it('checks the actual image signature before upload', async () => {
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'cover.png',
      { type: 'image/png' },
    )
    const jpeg = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      'cover.jpg',
      { type: 'image/jpeg' },
    )
    const webp = new File(
      [
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ],
      'cover.webp',
      { type: 'image/webp' },
    )
    const fake = new File([new Uint8Array([1, 2, 3, 4])], 'fake.png', {
      type: 'image/png',
    })

    await expect(hasValidCoverImageSignature(png)).resolves.toBe(true)
    await expect(hasValidCoverImageSignature(jpeg)).resolves.toBe(true)
    await expect(hasValidCoverImageSignature(webp)).resolves.toBe(true)
    await expect(hasValidCoverImageSignature(fake)).resolves.toBe(false)
  })

  it('rejects blank comments', () => {
    expect(validateComment('   ')).toBeTruthy()
    expect(validateComment('A considered response.')).toBeNull()
  })
})

describe('format helpers', () => {
  it('creates a readable excerpt without cutting words', () => {
    const excerpt = getExcerpt(
      'A sentence with several words that should be shortened cleanly for the card.',
      30,
    )

    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(31)
  })

  it('derives reading time from the content', () => {
    const words = Array.from({ length: 401 }, () => 'word').join(' ')

    expect(getReadingMinutes(words)).toBe(3)
    expect(getReadingMinutes('')).toBe(1)
  })

  it('handles initials and pluralization', () => {
    expect(getInitial('margin')).toBe('M')
    expect(getInitial('')).toBe('M')
    expect(pluralize(1, 'story', 'stories')).toBe('story')
    expect(pluralize(2, 'story', 'stories')).toBe('stories')
  })
})

describe('safe redirects', () => {
  it('keeps local paths and rejects external destinations', () => {
    expect(getSafeRedirect('/write')).toBe('/write')
    expect(getSafeRedirect('/my-posts')).toBe('/my-posts')
    expect(getSafeRedirect('https://example.com')).toBe('/my-posts')
    expect(getSafeRedirect('//example.com')).toBe('/my-posts')
    expect(getSafeRedirect(null)).toBe('/my-posts')
  })
})
