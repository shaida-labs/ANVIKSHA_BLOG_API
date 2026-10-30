import { useEffect } from 'react'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `${title} — ANVIKSHA`
      : 'ANVIKSHA — Question Deeper. Understand Better.'
  }, [title])
}
