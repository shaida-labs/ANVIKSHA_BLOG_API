import { useCallback, useEffect, useState } from 'react'

import type { Post } from '../types/api'
import { getAuthorName } from '../utils/format'
import { getTopicLabel } from '../utils/topics'

export interface ReadingTrailItem {
  id: number
  title: string
  author: string
  topic: string
  visitedAt: string
}

export const READING_TRAIL_STORAGE_KEY = 'anviksha.reading-trail'
const MAX_TRAIL_ITEMS = 5

function isReadingTrailItem(value: unknown): value is ReadingTrailItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.author === 'string' &&
    typeof item.topic === 'string' &&
    typeof item.visitedAt === 'string'
  )
}

function readTrail(): ReadingTrailItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = window.localStorage.getItem(READING_TRAIL_STORAGE_KEY)
    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed.filter(isReadingTrailItem).slice(0, MAX_TRAIL_ITEMS)
      : []
  } catch {
    return []
  }
}

function persistTrail(trail: ReadingTrailItem[]) {
  try {
    window.localStorage.setItem(
      READING_TRAIL_STORAGE_KEY,
      JSON.stringify(trail),
    )
  } catch {
    // Reading history is a convenience; a blocked storage area is harmless.
  }
}

export function useReadingTrail() {
  const [trail, setTrail] = useState<ReadingTrailItem[]>(readTrail)

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === READING_TRAIL_STORAGE_KEY) {
        setTrail(readTrail())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const record = useCallback(
    (post: Pick<Post, 'id' | 'title' | 'author' | 'topic'>) => {
      const entry: ReadingTrailItem = {
        id: post.id,
        title: post.title,
        author: getAuthorName(post.author),
        topic: getTopicLabel(post.topic),
        visitedAt: new Date().toISOString(),
      }

      setTrail((current) => {
        const next = [
          entry,
          ...current.filter((item) => item.id !== post.id),
        ].slice(0, MAX_TRAIL_ITEMS)
        persistTrail(next)
        return next
      })
    },
    [],
  )

  const clear = useCallback(() => {
    setTrail([])
    try {
      window.localStorage.removeItem(READING_TRAIL_STORAGE_KEY)
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  }, [])

  return { trail, record, clear }
}
