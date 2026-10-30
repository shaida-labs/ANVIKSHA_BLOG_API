import {
  ArrowLeft,
  ArrowUpRight,
  FileQuestion,
  Maximize2,
  Minimize2,
  PencilLine,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { deletePost, getPost, listPosts } from '../api/posts'
import { CommentSection } from '../components/comments/CommentSection'
import { MarkdownRenderer } from '../components/posts/MarkdownRenderer'
import { PostCard } from '../components/posts/PostCard'
import { PostCover } from '../components/posts/PostCover'
import { PostEngagement } from '../components/posts/PostEngagement'
import { PostMeta } from '../components/posts/PostMeta'
import { TableOfContents } from '../components/posts/TableOfContents'
import { Alert } from '../components/ui/Alert'
import { Button, buttonStyles } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/ToastProvider'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useReadingProgress } from '../hooks/useReadingProgress'
import { useReadingTrail } from '../hooks/useReadingTrail'
import type { Post } from '../types/api'
import { getApiErrorMessage, getApiStatus } from '../utils/apiErrors'
import { cn } from '../utils/cn'
import { getAuthorName } from '../utils/format'
import { extractMarkdownHeadings } from '../utils/markdown'
import { getPostCoverUrl } from '../utils/media'
import { getTopicLabel } from '../utils/topics'

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error'
type EngagementUpdate = Partial<
  Pick<Post, 'like_count' | 'liked_by_me' | 'bookmarked_by_me'>
>

const backLinkClasses =
  'inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent'

const quietButtonClasses =
  'inline-flex min-h-9 items-center gap-1.5 border border-line bg-transparent px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-ink/40 hover:text-ink'

export function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const postId = Number(id)
  const isValidId = Number.isInteger(postId) && postId > 0

  const [post, setPost] = useState<Post | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([])
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deepRead, setDeepRead] = useState(false)
  const articleBodyRef = useRef<HTMLDivElement>(null)

  const headings = useMemo(
    () => extractMarkdownHeadings(post?.content ?? ''),
    [post?.content],
  )
  const readingProgress = useReadingProgress(articleBodyRef, post?.id ?? 0)
  const { record: recordReadingTrail } = useReadingTrail()
  const recordedTrailPostIdRef = useRef<number | null>(null)

  useDocumentTitle(post?.title ?? 'Story')

  useEffect(() => {
    if (!isValidId) {
      setPageStatus('not-found')
      return
    }

    const controller = new AbortController()
    setPageStatus('loading')
    setError(null)

    getPost(postId, controller.signal)
      .then((loadedPost) => {
        if (controller.signal.aborted) {
          return
        }
        setPost(loadedPost)
        setPageStatus('ready')
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        if (getApiStatus(loadError) === 404) {
          setPageStatus('not-found')
          return
        }
        setError(
          getApiErrorMessage(loadError, 'This story could not be loaded.'),
        )
        setPageStatus('error')
      })

    return () => {
      controller.abort()
    }
  }, [isValidId, postId, revision])

  const relatedPostId = post?.id
  const relatedPostTitle = post?.title ?? ''
  const relatedPostTopic = post?.topic ?? null

  useEffect(() => {
    if (relatedPostId === undefined) {
      setRelatedPosts([])
      return
    }

    const controller = new AbortController()
    const titleTerms = relatedPostTitle
      .split(/\s+/)
      .map((term) => term.replace(/[^\w'-]/g, ''))
      .filter((term) => term.length > 3)
      .slice(0, 3)
      .join(' ')

    const params = relatedPostTopic
      ? { topic: relatedPostTopic, limit: 4 }
      : titleTerms
        ? { search: titleTerms, limit: 4 }
        : { limit: 4, sort: 'popular' as const }

    setRelatedPosts([])
    listPosts(params, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setRelatedPosts(
          result.items
            .filter((item) => item.id !== relatedPostId)
            .slice(0, 3),
        )
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRelatedPosts([])
        }
      })

    return () => controller.abort()
  }, [relatedPostId, relatedPostTitle, relatedPostTopic])

  useEffect(() => {
    if (!post || recordedTrailPostIdRef.current === post.id) {
      return
    }
    recordedTrailPostIdRef.current = post.id
    recordReadingTrail(post)
  }, [post, recordReadingTrail])

  useEffect(() => {
    document.body.classList.toggle('deep-read', deepRead)
    return () => {
      document.body.classList.remove('deep-read')
    }
  }, [deepRead])

  useEffect(() => {
    if (!deepRead) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeepRead(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deepRead])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deletePost(postId)
      navigate('/my-posts', {
        replace: true,
        state: { flash: 'Your story has been deleted.' },
      })
    } catch (deleteFailure) {
      setDeleteError(
        getApiErrorMessage(deleteFailure, 'This story could not be deleted.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCommentCountChange = useCallback((count: number) => {
    setPost((current) =>
      current && current.comment_count !== count
        ? { ...current, comment_count: count }
        : current,
    )
  }, [])

  const handleEngagementChange = useCallback((update: EngagementUpdate) => {
    setPost((current) => (current ? { ...current, ...update } : current))
  }, [])

  const isOwner = Boolean(user && post && user.id === post.author_id)

  if (pageStatus === 'loading') {
    return (
      <div
        className="mx-auto max-w-5xl animate-pulse px-5 py-12 sm:px-8 sm:py-16"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading story</span>
        <div className="h-4 w-28 bg-paper-strong" />
        <div className="mt-10 space-y-4">
          <div className="h-12 w-full bg-paper-strong" />
          <div className="h-12 w-3/4 bg-paper-strong" />
        </div>
        <div className="mt-8 h-10 w-52 bg-paper-strong" />
        <div className="mt-10 aspect-video w-full bg-paper-strong" />
        <div className="mx-auto mt-10 max-w-[44rem] space-y-3">
          <div className="h-4 w-full bg-paper-strong" />
          <div className="h-4 w-11/12 bg-paper-strong" />
          <div className="h-4 w-4/5 bg-paper-strong" />
        </div>
      </div>
    )
  }

  if (pageStatus === 'not-found') {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Link to="/" className={backLinkClasses}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to stories
        </Link>
        <div className="mt-10">
          <EmptyState
            icon={FileQuestion}
            title="Story not found"
            description="This story may have been removed, or the link may be incorrect."
            action={
              <Link
                to="/"
                className={buttonStyles({ variant: 'primary', size: 'sm' })}
              >
                Browse stories
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  if (pageStatus === 'error' || !post) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Link to="/" className={backLinkClasses}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to stories
        </Link>
        <div className="mt-10">
          <Alert tone="error" title="The story could not be loaded">
            <p>{error}</p>
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
        </div>
      </div>
    )
  }

  const topic = getTopicLabel(post.topic)
  const authorName = getAuthorName(post.author)

  const shareArticle = async () => {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt ?? undefined,
          url,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showToast('Story link copied to your clipboard.')
    } catch {
      window.prompt('Copy this story link', url)
    }
  }

  return (
    <article
      className={cn(
        'pb-16',
        deepRead && 'deep-read-article pt-16 sm:pt-20',
      )}
    >
      {!deepRead && (
        <div
          className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-line/70"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(readingProgress)}
        >
          <div
            className="h-full bg-accent transition-[width] duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {deepRead && (
        <div className="deep-read-toolbar fixed inset-x-0 top-0 z-[70] border-b border-line bg-paper">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-3 sm:px-8">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                {post.title}
              </p>
              <div
                className="mt-2 h-0.5 bg-line"
                role="progressbar"
                aria-label="Reading progress in focus mode"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(readingProgress)}
              >
                <div
                  className="h-full bg-accent"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeepRead(false)}
              className={quietButtonClasses}
            >
              <Minimize2 className="size-3.5" aria-hidden="true" />
              Exit focus
            </button>
          </div>
        </div>
      )}

      <header className="mx-auto max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
        <div className="deep-read-hide">
          <Link to="/" className={backLinkClasses}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to stories
          </Link>
        </div>

        <div className="mt-8 sm:mt-10">
          <p className="eyebrow flex flex-wrap items-center gap-2">
            <span className="size-1.5 bg-accent" aria-hidden="true" />
            <Link
              to={`/?topic=${encodeURIComponent(topic)}`}
              className="transition-colors hover:text-ink"
            >
              {topic}
            </Link>
            <span className="text-line" aria-hidden="true">
              /
            </span>
            From the journal
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.7rem,7vw,5.5rem)] font-medium leading-[0.96] tracking-[-0.055em] text-ink text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-6 max-w-3xl border-l-2 border-accent/50 pl-5 text-base leading-8 text-muted sm:text-lg">
              {post.excerpt}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6">
            <PostMeta post={post} />
            {isOwner && (
              <div className="deep-read-hide flex flex-wrap items-center gap-2">
                <Link
                  to={`/write/${post.id}/edit`}
                  className={buttonStyles({
                    variant: 'secondary',
                    size: 'sm',
                  })}
                >
                  <PencilLine className="size-3.5" aria-hidden="true" />
                  Edit story
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-wine hover:bg-wine/5"
                  onClick={() => {
                    setDeleteError(null)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <PostEngagement
              post={post}
              onChange={handleEngagementChange}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={shareArticle}
                className={quietButtonClasses}
              >
                <Share2 className="size-3.5" aria-hidden="true" />
                Share
              </button>
              <button
                type="button"
                onClick={() => setDeepRead((current) => !current)}
                aria-pressed={deepRead}
                className={quietButtonClasses}
              >
                {deepRead ? (
                  <Minimize2 className="size-3.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                )}
                {deepRead ? 'Exit focus' : 'Focus mode'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="deep-read-hide mx-auto mt-9 max-w-5xl px-5 sm:mt-12 sm:px-8">
        <PostCover
          postId={post.id}
          title={post.title}
          authorName={authorName}
          createdAt={post.created_at}
          coverUrl={getPostCoverUrl(post)}
          className="shadow-lifted"
        />
      </div>

      {headings.length > 0 && (
        <details className="deep-read-hide mx-auto mt-8 max-w-[44rem] px-5 sm:px-8 xl:hidden">
          <summary className="cursor-pointer border-y border-line py-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
            In this story
          </summary>
          <TableOfContents
            headings={headings}
            className="mt-5 border-l-0 pl-0"
          />
        </details>
      )}

      <div className="deep-read-grid mx-auto mt-10 grid max-w-6xl gap-10 px-5 sm:px-8 xl:grid-cols-[minmax(0,44rem)_16rem] xl:justify-center xl:gap-12">
        <div ref={articleBodyRef} className="min-w-0">
          <MarkdownRenderer content={post.content} />

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <p className="text-xs text-muted">
              Written by{' '}
              <Link
                to={`/authors/${post.author.username}`}
                className="font-semibold text-ink transition-colors hover:text-accent"
              >
                {authorName}
              </Link>
            </p>
            <Link
              to={
                post.topic
                  ? `/?topic=${encodeURIComponent(topic)}`
                  : '/'
              }
              className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
            >
              Continue the thread
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {headings.length > 0 && (
          <aside className="deep-read-hide hidden xl:block">
            <div className="sticky top-28">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        )}
      </div>

      <div className="deep-read-hide mx-auto mt-14 max-w-6xl px-5 sm:mt-16 sm:px-8">
        <div className="xl:grid xl:grid-cols-[minmax(0,44rem)_16rem] xl:justify-center xl:gap-12">
          <div className="mx-auto min-w-0 max-w-[44rem] xl:mx-0 xl:max-w-none">
            <CommentSection
              postId={post.id}
              onCountChange={handleCommentCountChange}
            />
          </div>
        </div>
      </div>

      {relatedPosts.length > 0 && (
        <section
          aria-labelledby="related-stories-heading"
          className="deep-read-hide mx-auto mt-16 max-w-7xl px-5 sm:px-8 lg:px-10"
        >
          <div className="border-t border-line pt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Continue the thread</p>
                <h2
                  id="related-stories-heading"
                  className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-ink"
                >
                  In the same thread
                </h2>
              </div>
              <Link
                to={
                  post.topic
                    ? `/?topic=${encodeURIComponent(topic)}`
                    : '/'
                }
                className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
              >
                {post.topic ? `More in ${topic}` : 'More stories'}
              </Link>
            </div>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <PostCard
                  key={relatedPost.id}
                  post={relatedPost}
                  loading="eager"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this story?"
        description={`“${post.title}” and all of its comments will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete story"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) {
            setDeleteError(null)
          }
        }}
      >
        {deleteError && <Alert tone="error">{deleteError}</Alert>}
      </ConfirmDialog>
    </article>
  )
}
