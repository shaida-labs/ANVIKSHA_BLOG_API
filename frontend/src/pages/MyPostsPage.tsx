import {
  ArrowUpRight,
  Eye,
  MessageSquare,
  PencilLine,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { deletePost } from '../api/posts'
import { PostThumbnail } from '../components/posts/PostThumbnail'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Button, buttonStyles } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Pagination } from '../components/ui/Pagination'
import { useAuth } from '../hooks/useAuth'
import { useAuthorPosts } from '../hooks/useAuthorPosts'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Post } from '../types/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import {
  formatDate,
  formatMonthAndYear,
  getAuthorName,
  getExcerpt,
  pluralize,
} from '../utils/format'
import { resolveMediaUrl } from '../utils/media'

const PAGE_SIZE = 10

export function MyPostsPage() {
  useDocumentTitle('My page')
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const locationFlash = (location.state as { flash?: string } | null)?.flash
  const displayName = user ? getAuthorName(user) : 'Your page'
  const publicProfilePath = user
    ? `/authors/${user.username}`
    : '/account'

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [flashMessage, setFlashMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { posts, total, status, error, refresh } = useAuthorPosts({
    page,
    pageSize: PAGE_SIZE,
    search,
  })
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setSearch((current) => {
        if (current !== nextSearch) {
          setPage(1)
        }
        return nextSearch
      })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (status === 'ready' && posts.length === 0 && page > 1) {
      setPage((current) => Math.max(1, current - 1))
    }
  }, [page, posts.length, status])

  useEffect(() => {
    if (locationFlash) {
      setFlashMessage(locationFlash)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, locationFlash, navigate])

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deletePost(deleteTarget.id)
      setDeleteTarget(null)
      setFlashMessage('The story and its comments have been deleted.')
      refresh()
    } catch (deleteFailure) {
      setDeleteError(
        getApiErrorMessage(deleteFailure, 'The story could not be deleted.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <header className="border-b border-line pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <Avatar
              name={displayName}
              src={resolveMediaUrl(user?.avatar_path)}
              size="lg"
              className="size-20 text-2xl shadow-soft"
            />
            <div className="min-w-0">
              <p className="eyebrow">Your page</p>
              <h1 className="mt-2 font-display text-[clamp(2.4rem,5vw,4.2rem)] font-medium leading-[0.94] tracking-[-0.05em] text-ink">
                {displayName}
              </h1>
              {user && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>@{user.username}</span>
                  <span aria-hidden="true">·</span>
                  <span>Member since {formatMonthAndYear(user.created_at)}</span>
                </p>
              )}
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-soft">
                {user?.bio?.trim() ||
                  'A short biography helps readers know the person behind the work.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
                <Link
                  to="/account"
                  className="text-ink transition-colors hover:text-accent"
                >
                  Edit profile
                </Link>
                {user && (
                  <Link
                    to={publicProfilePath}
                    className="inline-flex items-center gap-1 text-ink transition-colors hover:text-accent"
                  >
                    View public page
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={refresh}
              disabled={status === 'loading'}
            >
              <RotateCcw
                className={
                  status === 'loading' ? 'size-4 animate-spin' : 'size-4'
                }
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Link
              to="/write"
              className={buttonStyles({ variant: 'primary', size: 'md' })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Compose
            </Link>
          </div>
        </div>
        <p className="mt-6 border-t border-line pt-4 text-sm leading-6 text-muted">
          {status === 'ready'
            ? `${total} ${pluralize(total, 'story', 'stories')} on your page. Review, edit, or remove your work.`
            : 'Review, edit, or remove your work.'}
        </p>
      </header>

      {flashMessage && (
        <Alert tone="success" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{flashMessage}</p>
            <button
              type="button"
              className="text-xs font-semibold underline decoration-current/30 underline-offset-4"
              onClick={() => setFlashMessage(null)}
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      <div className="mt-7 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          className="w-full max-w-md"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <label htmlFor="my-posts-search" className="sr-only">
            Search your stories
          </label>
          <div className="flex items-center gap-3 border-b border-line pb-2 transition-colors focus-within:border-accent">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              id="my-posts-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search your stories"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-muted/75 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="flex size-8 items-center justify-center text-muted hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
            >
              Search
            </button>
          </div>
        </form>
        <p className="text-xs text-muted" aria-live="polite">
          {search
            ? `${total} matching ${pluralize(total, 'story', 'stories')}`
            : 'Sorted by newest first'}
        </p>
      </div>

      <div className="mt-2">
        {status === 'loading' ? (
          <div className="border-t border-line" aria-label="Loading your posts">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-4 border-b border-line py-6"
              >
                <div className="h-16 w-24 shrink-0 bg-paper-strong" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-2/3 bg-paper-strong" />
                  <div className="h-3 w-1/3 bg-paper-strong/70" />
                </div>
                <div className="hidden h-4 w-24 bg-paper-strong sm:block" />
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <Alert tone="error" title="Your page could not be loaded">
            <p>{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={refresh}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          </Alert>
        ) : posts.length === 0 ? (
          search ? (
            <EmptyState
              icon={Search}
              title="No stories match that search"
              description={`Nothing on your page matches “${search}”. Try another word or clear the search.`}
              action={
                <Button variant="secondary" size="sm" onClick={clearSearch}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={PenLine}
              title="Your first story starts here"
              description="Publish a story to see it on your page. You can edit or remove it at any time."
              action={
                <Link
                  to="/write"
                  className={buttonStyles({ variant: 'primary', size: 'sm' })}
                >
                  Compose a story
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="hidden border-b border-line py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_6rem_9rem]">
              <span>Story</span>
              <span>Published</span>
              <span>Comments</span>
              <span className="text-right">Actions</span>
            </div>
            <ul>
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="grid gap-4 border-b border-line py-5 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_9rem] sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <PostThumbnail post={post} className="h-16 w-24" />
                    <div className="min-w-0">
                      <Link
                        to={`/posts/${post.id}`}
                        className="font-display text-2xl font-medium leading-tight tracking-[-0.03em] text-ink transition-colors hover:text-accent"
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1.5 line-clamp-2 max-w-2xl text-xs leading-5 text-muted">
                        {getExcerpt(post.content, 120)}
                      </p>
                      <p className="mt-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted sm:hidden">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="hidden text-xs text-muted sm:block">
                    {formatDate(post.created_at)}
                    {post.updated_at !== post.created_at && (
                      <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.12em] text-muted/80">
                        Updated
                      </span>
                    )}
                  </p>
                  <Link
                    to={`/posts/${post.id}#comments`}
                    className="hidden items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-accent sm:flex"
                  >
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    {post.comment_count}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                    <Link
                      to={`/posts/${post.id}`}
                      className="flex size-9 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-ink"
                      aria-label={`View ${post.title}`}
                      title="View story"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to={`/write/${post.id}/edit`}
                      className="flex size-9 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-accent"
                      aria-label={`Edit ${post.title}`}
                      title="Edit story"
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center text-muted transition-colors hover:bg-wine/5 hover:text-wine"
                      aria-label={`Delete ${post.title}`}
                      title="Delete story"
                      onClick={() => {
                        setDeleteError(null)
                        setDeleteTarget(post)
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              className="mt-8 border-t border-line pt-6"
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this story?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and every comment attached to it will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete story"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        {deleteError && <Alert tone="error">{deleteError}</Alert>}
      </ConfirmDialog>
    </div>
  )
}
