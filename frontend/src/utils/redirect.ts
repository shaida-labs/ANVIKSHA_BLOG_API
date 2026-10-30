export function getSafeRedirect(
  candidate: string | null,
  fallback = '/my-posts',
): string {
  if (
    candidate &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !candidate.startsWith('/\\')
  ) {
    return candidate
  }

  return fallback
}
