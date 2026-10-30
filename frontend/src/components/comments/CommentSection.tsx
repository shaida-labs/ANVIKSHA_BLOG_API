import { ChevronDown, MessageCircle, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { createComment, listComments } from '../../api/comments'
import { useAuth } from '../../hooks/useAuth'
import type { BlogComment } from '../../types/api'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { pluralize } from '../../utils/format'
import { Alert } from '../ui/Alert'
import { Button, buttonStyles } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { CommentForm } from './CommentForm'
import { CommentItem } from './CommentItem'

interface CommentSectionProps {
  postId: number
  onCountChange?: (count: number) => void
}

const PAGE_SIZE = 10

function CommentSkeleton() {
  return (
    <div aria-hidden="true" className="py-7">
      <div className="flex items-start gap-3">
        <div className="size-10 animate-pulse rounded-full bg-paper-strong" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-32 animate-pulse bg-paper-strong" />
          <div className="h-4 w-full animate-pulse bg-paper-strong" />
          <div className="h-4 w-4/5 animate-pulse bg-paper-strong" />
        </div>
      </div>
    </div>
  )
}

export function CommentSection({
  postId,
  onCountChange,
}: CommentSectionProps) {
  const { user, status } = useAuth()
  const location = useLocation()
  const [comments, setComments] = useState<BlogComment[]>([])
  const [total, setTotal] = useState(0)
  const [loadedCount, setLoadedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const loadMoreControllerRef = useRef<AbortController | null>(null)
  const serverLoadedIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const controller = new AbortController()
    setComments([])
    setTotal(0)
    setLoadedCount(0)
    serverLoadedIdsRef.current = new Set()
    setIsLoading(true)
    setLoadError(null)
    setLoadMoreError(null)

    listComments(
      { postId, limit: PAGE_SIZE, offset: 0 },
      controller.signal,
    )
      .then((page) => {
        if (controller.signal.aborted) {
          return
        }
        setComments(page.items)
        setTotal(page.total)
        setLoadedCount(page.items.length)
        serverLoadedIdsRef.current = new Set(
          page.items.map((comment) => comment.id),
        )
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setLoadError(
          getApiErrorMessage(error, 'Responses could not be loaded.'),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [postId, revision])

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !loadError) {
      onCountChange?.(total)
    }
  }, [isLoading, loadError, onCountChange, total])

  const hasMore = loadedCount < total

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return
    }

    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller
    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const page = await listComments(
        { postId, limit: PAGE_SIZE, offset: loadedCount },
        controller.signal,
      )
      if (controller.signal.aborted) {
        return
      }
      page.items.forEach((comment) => {
        serverLoadedIdsRef.current.add(comment.id)
      })
      setComments((current) => {
        const seen = new Set(current.map((comment) => comment.id))
        return [
          ...current,
          ...page.items.filter((comment) => !seen.has(comment.id)),
        ].sort(
          (first, second) =>
            first.created_at.localeCompare(second.created_at) ||
            first.id - second.id,
        )
      })
      setTotal(page.total)
      setLoadedCount((current) => current + page.items.length)
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadMoreError(
          getApiErrorMessage(error, 'More responses could not be loaded.'),
        )
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false)
      }
    }
  }

  const handleCreate = async (content: string) => {
    const created = await createComment({ post_id: postId, content })
    const wasFullyLoaded = loadedCount >= total
    setComments((current) =>
      [...current, created].sort(
        (first, second) =>
          first.created_at.localeCompare(second.created_at) ||
          first.id - second.id,
      ),
    )
    if (wasFullyLoaded) {
      serverLoadedIdsRef.current.add(created.id)
      setLoadedCount((current) => current + 1)
    }
    setTotal((current) => current + 1)
  }

  const handleUpdated = (updated: BlogComment) => {
    setComments((current) =>
      current.map((comment) =>
        comment.id === updated.id ? updated : comment,
      ),
    )
  }

  const handleDeleted = (commentId: number) => {
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    )
    if (serverLoadedIdsRef.current.delete(commentId)) {
      setLoadedCount((current) => Math.max(0, current - 1))
    }
    setTotal((current) => Math.max(0, current - 1))
  }

  const signInDestination = `${location.pathname}#comments`

  return (
    <section
      id="comments"
      className="scroll-mt-24 border-t border-line pt-10"
      aria-labelledby="comments-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Conversation</p>
          <h2
            id="comments-heading"
            className="mt-2 font-display text-4xl font-medium tracking-[-0.04em] text-ink"
          >
            Responses{' '}
            {!isLoading && !loadError && (
              <span className="font-sans text-base font-medium tracking-normal text-muted">
                ({total})
              </span>
            )}
          </h2>
          <p className="mt-2 text-xs text-muted">
            {total > 0
              ? `${total} ${pluralize(total, 'response', 'responses')}, in the order they were shared.`
              : 'Add a considered response to this story.'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {status === 'authenticated' && user ? (
          <CommentForm onSubmit={handleCreate} />
        ) : status === 'anonymous' ? (
          <div className="flex flex-col gap-4 border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-display text-2xl font-medium tracking-[-0.03em] text-ink">
                Have something to add?
              </p>
              <p className="mt-1 text-sm text-muted">
                Sign in to join the conversation.
              </p>
            </div>
            <Link
              to={`/login?next=${encodeURIComponent(signInDestination)}`}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Sign in to respond
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted" role="status">
            Checking your session…
          </p>
        )}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading responses</span>
            <div className="divide-y divide-line border-t border-line">
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </div>
          </div>
        ) : loadError ? (
          <Alert tone="error" title="Responses are unavailable">
            <p>{loadError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setRevision((value) => value + 1)}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          </Alert>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No responses yet"
            description="Be the first to leave a considered response."
          />
        ) : (
          <>
            <div className="divide-y divide-line border-t border-line">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={user}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex flex-col items-center gap-3">
                {loadMoreError && (
                  <p role="alert" className="text-xs font-medium text-wine">
                    {loadMoreError}
                  </p>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isLoadingMore}
                  onClick={loadMore}
                >
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                  Show more responses
                  <span className="text-muted">
                    ({loadedCount} of {total})
                  </span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
