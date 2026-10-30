import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearStoredToken,
  getStoredToken,
  storeToken,
} from './tokenStorage'

const TOKEN_KEY = 'anviksha.access_token'
const LEGACY_TOKEN_KEY = 'scr845ngff.access_token'

describe('tokenStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('stores and reads the tab-scoped token', () => {
    storeToken('new-token')

    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('new-token')
    expect(getStoredToken()).toBe('new-token')
  })

  it('migrates the pre-ANVIKSHA storage key once', () => {
    window.sessionStorage.setItem(LEGACY_TOKEN_KEY, 'legacy-token')

    expect(getStoredToken()).toBe('legacy-token')
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('legacy-token')
    expect(window.sessionStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull()
  })

  it('clears both current and legacy keys on logout', () => {
    window.sessionStorage.setItem(TOKEN_KEY, 'current-token')
    window.sessionStorage.setItem(LEGACY_TOKEN_KEY, 'legacy-token')

    clearStoredToken()

    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(LEGACY_TOKEN_KEY)).toBeNull()
    expect(getStoredToken()).toBeNull()
  })
})
