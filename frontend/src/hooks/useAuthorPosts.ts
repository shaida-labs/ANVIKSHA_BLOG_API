import { useCallback, useEffect, useState } from 'react'

import { listMyPosts } from '../api/posts'
import type { Post } from '../types/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import { useAuth } from './useAuth'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface UseAuthorPostsOptions {
  page: number
  pageSize: number
  search?: string
}

export function useAuthorPosts({
  page,
  pageSize,
  search = '',
}: UseAuthorPostsOptions) {
  const { user } = useAuth()
  const userId = user?.id
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!userId) {
      setPosts([])
      setTotal(0)
      setStatus('idle')
      setError(null)
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(null)

    listMyPosts(
      {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: search.trim() || undefined,
        sort: 'newest',
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setPosts(result.items)
        setTotal(result.total)
        setStatus('ready')
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setError(
          getApiErrorMessage(loadError, 'Your posts could not be loaded.'),
        )
        setStatus('error')
      })

    return () => {
      controller.abort()
    }
  }, [page, pageSize, revision, search, userId])

  const refresh = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  return { posts, total, status, error, refresh }
}
