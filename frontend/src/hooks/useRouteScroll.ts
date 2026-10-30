import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const HASH_TARGET_TIMEOUT_MS = 3_000

function getHashTarget(hash: string): HTMLElement | null {
  const encodedId = hash.replace(/^#/, '')
  if (!encodedId) {
    return null
  }

  let id = encodedId
  try {
    id = decodeURIComponent(encodedId)
  } catch {
    // Keep the raw value when the URL contains a malformed escape.
  }

  return document.getElementById(id)
}

export function useRouteScroll(): void {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    if (!hash) {
      scrollToTop()
      return
    }

    let cancelled = false
    let timeoutId: number | undefined
    let frameId: number | undefined
    let observer: MutationObserver | undefined

    const cleanup = () => {
      cancelled = true
      observer?.disconnect()
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId)
      }
    }

    const scrollToTarget = () => {
      if (cancelled) {
        return false
      }

      const target = getHashTarget(hash)
      if (!target) {
        return false
      }

      target.scrollIntoView({ block: 'start' })
      cleanup()
      return true
    }

    if (scrollToTarget()) {
      return cleanup
    }

    // Route content often arrives after the first render. Watch for the
    // target instead of scrolling to the top before the page has settled.
    observer = new MutationObserver(() => {
      scrollToTarget()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    frameId = window.requestAnimationFrame(() => {
      scrollToTarget()
    })

    timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return
      }
      cleanup()
      scrollToTop()
    }, HASH_TARGET_TIMEOUT_MS)

    return cleanup
  }, [pathname, hash])
}
