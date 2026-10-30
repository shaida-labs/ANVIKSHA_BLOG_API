import { Bookmark, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  bookmarkPost,
  likePost,
  unbookmarkPost,
  unlikePost,
} from '../../api/posts'
import { useAuth } from '../../hooks/useAuth'
import type { Post } from '../../types/api'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { cn } from '../../utils/cn'
import { pluralize } from '../../utils/format'
import { useToast } from '../ui/ToastProvider'

interface PostEngagementProps {
  post: Pick<
    Post,
    | 'id'
    | 'title'
    | 'like_count'
    | 'liked_by_me'
    | 'bookmarked_by_me'
  >
  compact?: boolean
  className?: string
  onChange?: (state: {
    like_count?: number
    liked_by_me?: boolean
    bookmarked_by_me?: boolean
  }) => void
}

export function PostEngagement({
  post,
  compact = false,
  className,
  onChange,
}: PostEngagementProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me)
  const [likePending, setLikePending] = useState(false)
  const [bookmarkPending, setBookmarkPending] = useState(false)

  useEffect(() => {
    setLiked(post.liked_by_me)
    setLikeCount(post.like_count)
    setBookmarked(post.bookmarked_by_me)
  }, [post.id, post.liked_by_me, post.like_count, post.bookmarked_by_me])

  const requireSignIn = () => {
    if (user) {
      return true
    }
    const next = `${location.pathname}${location.search}`
    navigate(`/login?next=${encodeURIComponent(next)}`)
    return false
  }

  const toggleLike = async () => {
    if (!requireSignIn() || likePending) {
      return
    }

    const previous = { liked, likeCount }
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)))
    setLikePending(true)

    try {
      const state = nextLiked
        ? await likePost(post.id)
        : await unlikePost(post.id)
      setLiked(state.liked)
      setLikeCount(state.like_count)
      onChange?.({
        liked_by_me: state.liked,
        like_count: state.like_count,
      })
    } catch (error) {
      setLiked(previous.liked)
      setLikeCount(previous.likeCount)
      showToast(
        getApiErrorMessage(error, 'Your like could not be updated.'),
        'error',
      )
    } finally {
      setLikePending(false)
    }
  }

  const toggleBookmark = async () => {
    if (!requireSignIn() || bookmarkPending) {
      return
    }

    const previous = bookmarked
    const nextBookmarked = !bookmarked
    setBookmarked(nextBookmarked)
    setBookmarkPending(true)

    try {
      const state = nextBookmarked
        ? await bookmarkPost(post.id)
        : await unbookmarkPost(post.id)
      setBookmarked(state.bookmarked)
      onChange?.({ bookmarked_by_me: state.bookmarked })
      showToast(
        state.bookmarked
          ? 'Saved to your library.'
          : 'Removed from your library.',
        state.bookmarked ? 'success' : 'info',
      )
    } catch (error) {
      setBookmarked(previous)
      showToast(
        getApiErrorMessage(error, 'Your saved story could not be updated.'),
        'error',
      )
    } finally {
      setBookmarkPending(false)
    }
  }

  const baseButton =
    'inline-flex min-h-9 items-center gap-1.5 border px-2.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-colors disabled:cursor-wait disabled:opacity-70'

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={
          liked
            ? `Unlike ${post.title}, ${likeCount} ${pluralize(likeCount, 'like', 'likes')}`
            : `Like ${post.title}, ${likeCount} ${pluralize(likeCount, 'like', 'likes')}`
        }
        disabled={likePending}
        className={cn(
          baseButton,
          liked
            ? 'border-accent/50 bg-accent-soft text-accent'
            : 'border-line bg-transparent text-muted hover:border-ink/40 hover:text-ink',
        )}
      >
        <Heart
          className={cn('size-3.5', liked && 'fill-current')}
          aria-hidden="true"
        />
        <span className="tabular-nums">{likeCount}</span>
        {!compact && <span>{liked ? 'Liked' : 'Like'}</span>}
      </button>

      <button
        type="button"
        onClick={toggleBookmark}
        aria-pressed={bookmarked}
        aria-label={
          bookmarked
            ? `Remove ${post.title} from your library`
            : `Save ${post.title} to your library`
        }
        disabled={bookmarkPending}
        className={cn(
          baseButton,
          bookmarked
            ? 'border-ink/40 bg-ink text-paper'
            : 'border-line bg-transparent text-muted hover:border-ink/40 hover:text-ink',
        )}
      >
        <Bookmark
          className={cn('size-3.5', bookmarked && 'fill-current')}
          aria-hidden="true"
        />
        {!compact && <span>{bookmarked ? 'Saved' : 'Save'}</span>}
      </button>
    </div>
  )
}
