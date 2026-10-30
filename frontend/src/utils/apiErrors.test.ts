import { describe, expect, it } from 'vitest'

import { getApiErrorMessage, getApiStatus } from './apiErrors'

function createAxiosLikeError(data: unknown, status = 400) {
  return {
    isAxiosError: true,
    response: { status, data },
    message: 'Request failed',
  }
}

describe('API error handling', () => {
  it('uses FastAPI detail messages', () => {
    const error = createAxiosLikeError({ detail: 'Post not found.' }, 404)

    expect(getApiErrorMessage(error)).toBe('Post not found.')
    expect(getApiStatus(error)).toBe(404)
  })

  it('joins validation detail messages', () => {
    const error = createAxiosLikeError(
      {
        detail: [
          { msg: 'Value error, Username is already registered.' },
          { msg: 'Value error, Password must include a number.' },
        ],
      },
      422,
    )

    expect(getApiErrorMessage(error)).toBe(
      'Username is already registered. Password must include a number.',
    )
  })

  it('explains network failures without leaking internals', () => {
    const error = { isAxiosError: true, message: 'Network Error' }

    expect(getApiErrorMessage(error)).toContain('could not be reached')
    expect(getApiStatus(error)).toBeNull()
  })

  it('falls back to the supplied message for unknown errors', () => {
    expect(getApiErrorMessage('unexpected', 'A custom fallback.')).toBe(
      'A custom fallback.',
    )
  })
})
