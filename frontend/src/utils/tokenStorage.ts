const TOKEN_KEY = 'anviksha.access_token'
// Retained only to migrate tab sessions created before the ANVIKSHA rebrand.
const LEGACY_TOKEN_KEY = 'scr845ngff.access_token'

export function getStoredToken(): string | null {
  try {
    const token = window.sessionStorage.getItem(TOKEN_KEY)
    if (token) {
      return token
    }

    const legacyToken = window.sessionStorage.getItem(LEGACY_TOKEN_KEY)
    if (legacyToken) {
      window.sessionStorage.setItem(TOKEN_KEY, legacyToken)
      window.sessionStorage.removeItem(LEGACY_TOKEN_KEY)
      return legacyToken
    }

    return null
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token)
    window.sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // A browser with storage disabled will keep the session in memory only.
  }
}

export function clearStoredToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY)
    window.sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
