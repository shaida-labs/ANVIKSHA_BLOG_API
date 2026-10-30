import {
  ArrowLeft,
  FileQuestion,
  PenLine,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { listPosts } from '../api/posts'
import { getProfile } from '../api/profiles'
import { PostCard } from '../components/posts/PostCard'
import { PostGridSkeleton } from '../components/posts/PostSkeletons'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Button, buttonStyles } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Pagination } from '../components/ui/Pagination'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Post, PostSort, UserProfile } from '../types/api'
import { getApiErrorMessage, getApiStatus } from '../utils/apiErrors'
import { formatMonthAndYear } from '../utils/format'
import { resolveMediaUrl } from '../utils/media'

const PAGE_SIZE = 9
const SORT_OPTIONS: Array<{ value: PostSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
]

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error'

export function AuthorProfilePage() {
  const { username = '' } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<PageStatus>('loading')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [postsStatus, setPostsStatus] = useState<PageStatus>('loading')
  const [postsError, setPostsError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PostSort>('newest')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)

  const displayName = profile?.display_name?.trim() || profile?.username || username
  useDocumentTitle(displayName || 'Author')

  useEffect(() => {
    if (!username) {
      setProfileStatus('not-found')
      return
    }

    const controller = new AbortController()
    setProfileStatus('loading')
    setProfileError(null)

    getProfile(username, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setProfile(result)
        setProfileStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        if (getApiStatus(error) === 404) {
          setProfileStatus('not-found')
          return
        }
        setProfileError(
          getApiErrorMessage(error, 'This author profile could not be loaded.'),
        )
        setProfileStatus('error')
      })

    return () => controller.abort()
  }, [revision, username])

  useEffect(() => {
    if (!username) {
      return
    }

    const controller = new AbortController()
    setPostsStatus('loading')
    setPostsError(null)

    listPosts(
      {
        author: username,
        search: query || undefined,
        sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setPosts(result.items)
        setTotal(result.total)
        setPostsStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setPostsError(
          getApiErrorMessage(error, 'The author’s stories could not be loaded.'),
        )
        setPostsStatus('error')
      })

    return () => controller.abort()
  }, [page, query, revision, sort, username])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery(searchInput.trim())
    setPage(1)
  }

  const clearSearch = () => {
    setSearchInput('')
    setQuery('')
    setPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    requestAnimationFrame(() => {
      document.getElementById('author-stories')?.scrollIntoView({ block: 'start' })
    })
  }

  if (profileStatus === 'loading') {
    return (
      <div
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading author profile</span>
        <div className="h-4 w-24 animate-pulse bg-paper-strong" />
        <div className="mt-10 flex items-center gap-5">
          <div className="size-16 animate-pulse rounded-full bg-paper-strong" />
          <div className="space-y-3">
            <div className="h-9 w-56 animate-pulse bg-paper-strong" />
            <div className="h-4 w-28 animate-pulse bg-paper-strong" />
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse bg-paper-strong/60" />
          ))}
        </div>
      </div>
    )
  }

  if (
    profileStatus === 'not-found' ||
    (profileStatus === 'ready' && !profile)
  ) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to stories
        </Link>
        <div className="mt-10">
          <EmptyState
            icon={FileQuestion}
            title="Author not found"
            description="This author may not exist, or the profile link may be incorrect."
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

  if (profileStatus === 'error' || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to stories
        </Link>
        <div className="mt-10">
          <Alert tone="error" title="The author profile could not be loaded">
            <p>{profileError}</p>
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

  const isOwnProfile = user?.id === profile.id
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min((page - 1) * PAGE_SIZE + posts.length, total)

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to stories
      </Link>

      <header className="mt-8 grid gap-8 border-b border-line pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="eyebrow">Contributor profile</p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <Avatar
              name={displayName}
              src={resolveMediaUrl(profile.avatar_path)}
              size="lg"
              className="size-24 text-2xl shadow-soft"
            />
            <div>
              <h1 className="font-display text-[clamp(2.7rem,6vw,5rem)] font-medium leading-[0.94] tracking-[-0.05em] text-ink">
                {displayName}
              </h1>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                @{profile.username}
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
            {profile.bio ||
              'This author has not added a biography yet. Their published stories are collected below.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>
              Member since {formatMonthAndYear(profile.created_at)}
            </span>
            {isOwnProfile && (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  to="/account"
                  className="font-semibold text-ink transition-colors hover:text-accent"
                >
                  Edit profile & picture
                </Link>
              </>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-6 border-t border-line pt-5 sm:gap-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div>
            <dt className="eyebrow">Stories</dt>
            <dd className="mt-2 font-display text-3xl leading-none text-ink">
              {profile.post_count}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Comments</dt>
            <dd className="mt-2 font-display text-3xl leading-none text-ink">
              {profile.comment_count}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Likes</dt>
            <dd className="mt-2 font-display text-3xl leading-none text-ink">
              {profile.likes_received}
            </dd>
          </div>
        </dl>
      </header>

      <section id="author-stories" className="scroll-mt-24 pt-10">
        <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">In print</p>
            <h2 className="mt-2 font-display text-4xl font-medium tracking-[-0.045em] text-ink">
              {query ? 'Matching stories' : 'Stories by this author'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {postsStatus === 'loading'
                ? 'Gathering published work…'
                : query
                  ? `${total} matching ${total === 1 ? 'story' : 'stories'}`
                  : `${total} published ${total === 1 ? 'story' : 'stories'}`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <form
              role="search"
              onSubmit={handleSearch}
              className="min-w-0 sm:w-64"
            >
              <label htmlFor="author-search" className="eyebrow mb-2 block">
                Search this author
              </label>
              <div className="flex items-center gap-2 border-b border-line pb-1.5 focus-within:border-accent">
                <Search
                  className="size-3.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <input
                  id="author-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search stories"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="flex size-7 items-center justify-center text-muted transition-colors hover:text-ink"
                    aria-label="Clear author search"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="submit"
                  className="shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:text-accent"
                >
                  Search
                </button>
              </div>
            </form>

            <div>
              <label
                htmlFor="author-sort"
                className="eyebrow block"
              >
                Sort
              </label>
              <select
                id="author-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as PostSort)
                  setPage(1)
                }}
                className="mt-2 block border-b border-line bg-transparent py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {postsStatus === 'loading' ? (
          <div className="pt-8">
            <PostGridSkeleton count={6} />
          </div>
        ) : postsStatus === 'error' ? (
          <div className="py-10">
            <Alert tone="error" title="The author’s stories could not be loaded">
              <p>{postsError}</p>
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
        ) : posts.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={query ? Search : PenLine}
              title={query ? 'No stories match that search' : 'No published stories yet'}
              description={
                query
                  ? `Nothing came back for “${query}” from this author.`
                  : 'This author has not published a story yet. Check back soon.'
              }
              action={
                query ? (
                  <Button variant="secondary" size="sm" onClick={clearSearch}>
                    Clear search
                  </Button>
                ) : (
                  <Link
                    to="/"
                    className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                  >
                    Browse stories
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-end gap-3 text-xs text-muted">
              <p>
                Showing {start}–{end} of {total}
              </p>
            </div>
            <div className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={(page - 1) * PAGE_SIZE + index + 1}
                  loading="eager"
                />
              ))}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={handlePageChange}
              className="mt-12 border-t border-line pt-6"
            />
          </>
        )}
      </section>
    </div>
  )
}
