import axios from 'axios'

interface ValidationDetail {
  msg?: unknown
  type?: unknown
}

function readDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) {
    return null
  }

  const detail = (payload as { detail?: unknown }).detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry: ValidationDetail) =>
        typeof entry?.msg === 'string'
          ? entry.msg.replace(/^Value error,\s*/i, '')
          : null,
      )
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join(' ')
    }
  }

  return null
}

export function getApiStatus(error: unknown): number | null {
  return axios.isAxiosError(error) ? (error.response?.status ?? null) : null
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'The API could not be reached. Check that the backend is running and that VITE_API_BASE_URL is correct.'
    }

    const detail = readDetail(error.response.data)
    if (detail) {
      return detail
    }

    switch (error.response.status) {
      case 401:
        return 'Authentication is required. Please sign in again.'
      case 403:
        return 'You do not have permission to perform that action.'
      case 404:
        return 'The requested resource could not be found.'
      case 409:
        return 'That request conflicts with existing data.'
      case 422:
        return 'Please check the submitted values and try again.'
      case 500:
        return 'The server could not complete the request. Please try again later.'
      default:
        return fallback
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
