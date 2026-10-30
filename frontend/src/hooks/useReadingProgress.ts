import { useEffect, useState, type RefObject } from 'react'

export function useReadingProgress(
  targetRef: RefObject<HTMLElement | null>,
  contentKey: string | number,
): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const target = targetRef.current
    if (!target) {
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      const rect = target.getBoundingClientRect()
      const targetTop = rect.top + window.scrollY
      const viewportAnchor = window.innerHeight * 0.35
      const scrollable = Math.max(1, target.offsetHeight - viewportAnchor)
      const value =
        ((window.scrollY - targetTop + viewportAnchor) / scrollable) * 100
      setProgress(Math.min(100, Math.max(0, value)))
    }

    const scheduleUpdate = () => {
      if (frame) {
        return
      }
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [contentKey, targetRef])

  return progress
}
