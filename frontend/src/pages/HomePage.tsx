import {
  ArrowDown,
  ArrowUpRight,
  Compass,
  Heart,
  LayoutGrid,
  List,
  MessageSquare,
  PenLine,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { listComments } from '../api/comments'
import { listPosts } from '../api/posts'
import { listTopics } from '../api/topics'
import { CoverStory } from '../components/home/CoverStory'
import { IssueContents } from '../components/home/IssueContents'
import { MarginaliaCard } from '../components/home/MarginaliaCard'
import { ThreadAtlas } from '../components/home/ThreadAtlas'
import { PostCard } from '../components/posts/PostCard'
import { PostListItem } from '../components/posts/PostListItem'
import { PostGridSkeleton } from '../components/posts/PostSkeletons'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Button, buttonStyles } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Ornament } from '../components/ui/Ornament'
import { Pagination } from '../components/ui/Pagination'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type {
  BlogComment,
  Post,
  PostSort,
  Topic,
  UserSummary,
} from '../types/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import { cn } from '../utils/cn'
import {
  currentYear,
  getAuthorName,
  pluralize,
} from '../utils/format'
import { resolveMediaUrl } from '../utils/media'
import { getTopicLabel } from '../utils/topics'

const PAGE_SIZE = 7
const SORT_OPTIONS: Array<{ value: PostSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
]

type ViewMode = 'grid' | 'list'

function parsePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function parseSort(value: string | null): PostSort {
  return value === 'oldest' || value === 'title' || value === 'popular'
    ? value
    : 'newest'
}

function parseView(value: string | null): ViewMode {
  return value === 'list' ? 'list' : 'grid'
}

export function HomePage() {
  useDocumentTitle('Stories')
  const { user, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q')?.trim() ?? ''
  const topic = searchParams.get('topic')?.trim() ?? ''
  const page = parsePage(searchParams.get('page'))
  const sort = parseSort(searchParams.get('sort'))
  const view = parseView(searchParams.get('view'))
  const [searchInput, setSearchInput] = useState(query)
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [archiveTotal, setArchiveTotal] = useState(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [popularPosts, setPopularPosts] = useState<Post[]>([])
  const [coverComment, setCoverComment] = useState<BlogComment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  const flash = (location.state as { flash?: string } | null)?.flash
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const writingDestination =
    status === 'authenticated' ? '/write' : '/login?next=%2Fwrite'

  const isLanding =
    page === 1 && !query && !topic && sort === 'newest'
  const featuredPost = isLanding && posts.length > 0 ? posts[0] : null
  const gridPosts = featuredPost ? posts.slice(1) : posts
  const popularToShow = popularPosts
    .filter((post) => post.id !== featuredPost?.id)
    .slice(0, 3)
  const showPopular = isLanding && popularToShow.length > 0 && !isLoading
  const start =
    total === 0
      ? 0
      : featuredPost
        ? Math.min(2, total)
        : (page - 1) * PAGE_SIZE + 1
  const end = Math.min((page - 1) * PAGE_SIZE + posts.length, total)
  const hasFilters = Boolean(query || topic)
  const activeTopicLabel = topic ? getTopicLabel(topic) : ''
  const archiveCount = isLoading ? '—' : archiveTotal
  const topicCount = isLoading ? '—' : topics.length
  const activeTopicName = topic ? activeTopicLabel : ''
  const archiveEyebrow = query
    ? 'Search results'
    : topic
      ? 'Thread archive'
      : sort === 'popular'
        ? 'Most engaged'
        : sort === 'oldest'
          ? 'The archive'
          : sort === 'title'
            ? 'The index'
            : 'Latest stories'
  const archiveHeading = query ? (
    <>
      Searching for <em className="text-accent">“{query}”</em>
    </>
  ) : topic ? (
    <>
      Reading <em className="text-accent">{activeTopicName}</em>
    </>
  ) : sort === 'popular' ? (
    'Most engaged'
  ) : sort === 'oldest' ? (
    'From the beginning'
  ) : sort === 'title' ? (
    'The index, A–Z'
  ) : (
    'Stories worth staying with.'
  )
  const countLine = isLoading
    ? 'Gathering stories from the journal…'
    : query
      ? `${total} matching ${pluralize(total, 'story', 'stories')}`
      : topic
        ? `${total} ${pluralize(total, 'story', 'stories')} filed under ${activeTopicName}`
        : sort === 'popular'
          ? `${total} ${pluralize(total, 'story', 'stories')} ranked by real likes and comments`
          : `${total} ${pluralize(total, 'story', 'stories')} shared by our contributors`

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  useEffect(() => {
    if (flash) {
      setFlashMessage(flash)
    }
  }, [flash])

  useEffect(() => {
    const controller = new AbortController()
    listTopics(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setTopics(result)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTopics([])
        }
      })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const controller = new AbortController()
    listPosts({ limit: 4, sort: 'popular' }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setArchiveTotal(result.total)
        setPopularPosts(
          result.items.filter(
            (post) => post.like_count + post.comment_count > 0,
          ),
        )
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setArchiveTotal(0)
          setPopularPosts([])
        }
      })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)

    listPosts(
      {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: query || undefined,
        topic: topic || undefined,
        sort,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setPosts(result.items)
        setTotal(result.total)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setLoadError(
          getApiErrorMessage(error, 'Stories could not be loaded.'),
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
  }, [page, query, revision, sort, topic])

  const featuredPostId = featuredPost?.id
  useEffect(() => {
    if (!featuredPostId) {
      setCoverComment(null)
      return
    }

    const controller = new AbortController()
    listComments({ postId: featuredPostId, limit: 1 }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setCoverComment(result.items[0] ?? null)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCoverComment(null)
        }
      })

    return () => controller.abort()
  }, [featuredPostId])

  const contributors = useMemo(() => {
    const byId = new Map<number, UserSummary>()
    for (const post of [...posts, ...popularPosts]) {
      byId.set(post.author.id, post.author)
    }
    return Array.from(byId.values()).slice(0, 6)
  }, [popularPosts, posts])

  const buildSearchParams = (updates: {
    q?: string
    topic?: string
    sort?: PostSort
    page?: number
    view?: ViewMode
  }): URLSearchParams => {
    const next = new URLSearchParams(searchParams)
    const nextQuery = updates.q ?? query
    const nextTopic = updates.topic ?? topic
    const nextSort = updates.sort ?? sort
    const nextPage = updates.page ?? page
    const nextView = updates.view ?? view

    if (nextQuery) {
      next.set('q', nextQuery)
    } else {
      next.delete('q')
    }

    if (nextTopic) {
      next.set('topic', nextTopic)
    } else {
      next.delete('topic')
    }

    if (nextSort !== 'newest') {
      next.set('sort', nextSort)
    } else {
      next.delete('sort')
    }

    if (nextPage > 1) {
      next.set('page', String(nextPage))
    } else {
      next.delete('page')
    }

    if (nextView !== 'grid') {
      next.set('view', nextView)
    } else {
      next.delete('view')
    }

    return next
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchParams(buildSearchParams({ q: searchInput.trim(), page: 1 }))
  }

  const handleSort = (nextSort: PostSort) => {
    setSearchParams(buildSearchParams({ sort: nextSort, page: 1 }))
  }

  const handleView = (nextView: ViewMode) => {
    setSearchParams(buildSearchParams({ view: nextView }))
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(buildSearchParams({ page: nextPage }))
    requestAnimationFrame(() => {
      document.getElementById('journal')?.scrollIntoView({ block: 'start' })
    })
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchParams(buildSearchParams({ q: '', page: 1 }))
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams(buildSearchParams({ q: '', topic: '', page: 1 }))
  }

  const dismissFlash = () => {
    setFlashMessage(null)
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    )
  }

  return (
    <>
      {isLanding ? (
        <>
          <section id="cover" className="scroll-mt-28 border-b border-line">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5">
                <p className="eyebrow flex items-center gap-2">
                  <Ornament className="size-2.5 text-accent" />
                  Vol. I · No. 01
                </p>
                <p className="eyebrow hidden sm:block">
                  A journal of considered thought · {currentYear}
                </p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted">
                  The current issue
                </p>
              </div>

              <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.06fr)_minmax(24rem,0.94fr)] lg:items-center lg:gap-16 lg:py-20">
                <div
                  id="premise"
                  className="flex scroll-mt-28 flex-col justify-center"
                >
                  <p className="eyebrow flex items-center gap-2">
                    <span className="size-1.5 bg-accent" aria-hidden="true" />
                    The independent journal · {currentYear}
                  </p>
                  <h1 className="mt-6 max-w-4xl font-display text-[clamp(3.2rem,8.5vw,7.2rem)] font-medium leading-[0.88] tracking-[-0.06em] text-ink text-balance">
                    Make room
                    <br />
                    <em className="font-normal text-accent">
                      for the question.
                    </em>
                  </h1>
                  <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    Essays, field notes, and unfinished ideas from people who
                    would rather stay with a hard question than settle for a
                    quick answer.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <a
                      href="#journal"
                      className={buttonStyles({ variant: 'primary', size: 'lg' })}
                    >
                      Enter the journal
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </a>
                    <Link
                      to={writingDestination}
                      className={buttonStyles({
                        variant: 'secondary',
                        size: 'lg',
                      })}
                    >
                      <PenLine className="size-4" aria-hidden="true" />
                      {status === 'authenticated'
                        ? 'Compose a story'
                        : 'Write with us'}
                    </Link>
                  </div>

                  <dl className="mt-12 grid max-w-lg grid-cols-3 gap-5 border-t border-line pt-5">
                    <div>
                      <dt className="eyebrow">Stories</dt>
                      <dd className="mt-2 font-display text-3xl leading-none text-ink">
                        {archiveCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Threads</dt>
                      <dd className="mt-2 font-display text-3xl leading-none text-ink">
                        {topicCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Prompt</dt>
                      <dd className="mt-2 font-display text-3xl leading-none text-ink">
                        01
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="lg:pl-2">
                  {isLoading ? (
                    <div
                      className="border border-line bg-surface"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="sr-only">Loading the cover story</span>
                      <div className="aspect-[2/1] animate-pulse bg-paper-strong" />
                      <div className="space-y-3 p-6">
                        <div className="h-3 w-24 animate-pulse bg-paper-strong" />
                        <div className="h-8 w-full animate-pulse bg-paper-strong" />
                        <div className="h-8 w-4/5 animate-pulse bg-paper-strong" />
                        <div className="h-3 w-2/3 animate-pulse bg-paper-strong" />
                      </div>
                    </div>
                  ) : featuredPost ? (
                    <CoverStory post={featuredPost} />
                  ) : (
                    <div className="border border-line bg-surface p-7 sm:p-9">
                      <Ornament className="size-4 text-accent" />
                      <p className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-0.04em] text-ink">
                        The first page is blank.
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        The archive is waiting for its first story. If you have
                        an account, you can write the opening piece.
                      </p>
                      <Link
                        to={writingDestination}
                        className={buttonStyles({
                          variant: 'primary',
                          size: 'sm',
                          className: 'mt-6',
                        })}
                      >
                        {status === 'authenticated'
                          ? 'Compose the opening piece'
                          : 'Create an account to write'}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <IssueContents />
        </>
      ) : (
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent"
            >
              <ArrowDown className="size-3.5 rotate-90" aria-hidden="true" />
              Back to stories
            </Link>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">{archiveEyebrow}</p>
                <h1 className="mt-2 max-w-3xl font-display text-[clamp(2.5rem,5.5vw,4.8rem)] font-medium leading-[0.96] tracking-[-0.055em] text-ink text-balance">
                  {archiveHeading}
                </h1>
                <p className="mt-3 text-sm text-muted" aria-live="polite">
                  {countLine}
                </p>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section
        id="threads"
        className="mx-auto max-w-7xl scroll-mt-28 px-5 py-14 sm:px-8 sm:py-20 lg:px-10"
      >
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Compass className="size-3.5 text-accent" aria-hidden="true" />
              Lines of thought
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-[1.02] tracking-[-0.045em] text-ink">
              Follow a line of thought.
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
              Every story is filed by hand. Choose a thread and see where the
              journal has taken it.
            </p>
            <a
              href="#journal"
              className="mt-5 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
            >
              Browse stories
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <ThreadAtlas
            topics={topics}
            activeTopic={topic}
            archiveCount={archiveCount}
          />
        </div>
      </section>

      {flashMessage && (
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Alert tone="success" title="Story deleted">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{flashMessage}</p>
              <button
                type="button"
                onClick={dismissFlash}
                className="inline-flex items-center gap-1 text-xs font-semibold underline decoration-current/30 underline-offset-4"
              >
                Dismiss
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          </Alert>
        </div>
      )}

      <section id="journal" className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <div className="border-b border-line pb-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
              <div>
                <p className="eyebrow">
                  {isLanding ? 'Latest stories' : 'Refine the archive'}
                </p>
                <h2 className="mt-2 font-display text-4xl font-medium leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
                  {isLanding ? 'Stories worth staying with.' : 'Search and filter.'}
                </h2>
                {isLanding && (
                  <p className="mt-3 text-sm text-muted" aria-live="polite">
                    {countLine}
                  </p>
                )}
              </div>

              <form role="search" onSubmit={handleSearch}>
                <label htmlFor="story-search" className="eyebrow mb-2 block">
                  Search stories
                </label>
                <div className="flex items-center gap-3 border-b border-line pb-2 transition-colors focus-within:border-accent">
                  <Search
                    className="size-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="story-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search titles and story text"
                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="flex size-8 items-center justify-center text-muted transition-colors hover:text-ink"
                      aria-label="Clear search"
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
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div
                role="group"
                aria-label="Reading mode"
                className="flex items-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => handleView('grid')}
                  aria-pressed={view === 'grid'}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors',
                    view === 'grid'
                      ? 'text-ink'
                      : 'text-muted hover:text-ink',
                  )}
                >
                  <LayoutGrid className="size-3.5" aria-hidden="true" />
                  Gallery
                </button>
                <span className="h-3 w-px bg-line" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => handleView('list')}
                  aria-pressed={view === 'list'}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors',
                    view === 'list'
                      ? 'text-ink'
                      : 'text-muted hover:text-ink',
                  )}
                >
                  <List className="size-3.5" aria-hidden="true" />
                  Index
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="story-sort"
                  className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Sort
                </label>
                <select
                  id="story-sort"
                  value={sort}
                  onChange={(event) =>
                    handleSort(event.target.value as PostSort)
                  }
                  className="border-b border-line bg-transparent py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
                {query && <span>Query: “{query}”</span>}
                {topic && <span>Thread: {activeTopicName}</span>}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-muted transition-colors hover:text-accent"
                >
                  <X className="size-3" aria-hidden="true" />
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div>
              {loadError ? (
                <div className="py-14">
                  <Alert
                    tone="error"
                    title="Stories could not be loaded"
                  >
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
                </div>
              ) : isLoading ? (
                <div className="pt-2">
                  <PostGridSkeleton count={6} />
                </div>
              ) : posts.length === 0 ? (
                <div className="pt-6">
                  {query || topic ? (
                    <EmptyState
                      icon={Search}
                      title={
                        query
                          ? 'No stories match that search'
                          : 'No stories in this thread yet'
                      }
                      description={
                        query
                          ? `Nothing came back for “${query}”. Try a different word or browse every story.`
                          : `There are no stories filed under ${activeTopicName} yet. Browse the full archive or choose another thread.`
                      }
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={PenLine}
                      title="No stories have been filed yet"
                      description="There are no stories yet. If you have an account, you can publish the opening piece."
                      action={
                        <Link
                          to={user ? '/write' : '/login?next=%2Fwrite'}
                          className={buttonStyles({
                            variant: 'primary',
                            size: 'sm',
                          })}
                        >
                          {user ? 'Write the first story' : 'Sign in to write'}
                        </Link>
                      }
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">
                        {featuredPost ? 'More from the journal' : 'The archive'}
                      </p>
                      <h3 className="mt-2 font-display text-3xl font-medium tracking-[-0.04em] text-ink">
                        {featuredPost ? 'Recent stories' : 'Stories'}
                      </h3>
                    </div>
                    <p className="text-xs text-muted">
                      Showing {start}–{end} of {total}
                    </p>
                  </div>

                  {gridPosts.length > 0 ? (
                    view === 'grid' ? (
                      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {gridPosts.map((post, index) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            index={
                              (page - 1) * PAGE_SIZE +
                              (featuredPost ? 2 : 1) +
                              index
                            }
                            loading="eager"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="divide-y divide-line border-y border-line">
                        {gridPosts.map((post, index) => (
                          <PostListItem
                            key={post.id}
                            post={post}
                            index={
                              (page - 1) * PAGE_SIZE +
                              (featuredPost ? 2 : 1) +
                              index
                            }
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="border-y border-line py-8 text-sm text-muted">
                      The cover story is the only story in this issue.
                    </p>
                  )}

                  <Pagination
                    page={page}
                    pageCount={pageCount}
                    onPageChange={handlePageChange}
                    className="mt-12 border-t border-line pt-6"
                  />
                </>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-36 lg:self-start">
              <div id="marginalia" className="scroll-mt-32">
                <MarginaliaCard comment={coverComment} post={featuredPost} />
              </div>

              {showPopular && (
                <section
                  aria-labelledby="most-engaged-heading"
                  className="border-t border-line pt-5"
                >
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow flex items-center gap-2">
                        <TrendingUp
                          className="size-3.5 text-accent"
                          aria-hidden="true"
                        />
                        Most engaged
                      </p>
                      <h3
                        id="most-engaged-heading"
                        className="mt-2 font-display text-2xl font-medium tracking-[-0.03em] text-ink"
                      >
                        Read by contributors
                      </h3>
                    </div>
                    <span className="font-display text-2xl leading-none text-accent/60">
                      {String(popularToShow.length).padStart(2, '0')}
                    </span>
                  </div>
                  <ol className="mt-4 divide-y divide-line border-t border-line">
                    {popularToShow.map((post, index) => (
                      <li key={post.id} className="py-4">
                        <Link
                          to={`/posts/${post.id}`}
                          className="group flex gap-3"
                        >
                          <span className="font-display text-xl italic leading-none text-accent/60">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[0.6rem] text-muted">
                              <Avatar
                                name={getAuthorName(post.author)}
                                src={resolveMediaUrl(post.author.avatar_path)}
                                size="xs"
                              />
                              <span className="min-w-0 truncate">
                                {getAuthorName(post.author)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="shrink-0 font-semibold uppercase tracking-[0.12em] text-accent">
                                {getTopicLabel(post.topic)}
                              </span>
                            </div>
                            <h4 className="mt-1 font-display text-lg font-medium leading-tight tracking-[-0.02em] text-ink transition-colors group-hover:text-accent">
                              {post.title}
                            </h4>
                            <div className="mt-2 flex items-center gap-3 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">
                              <span className="inline-flex items-center gap-1">
                                <Heart className="size-3" aria-hidden="true" />
                                {post.like_count}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {post.comment_count}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="border-y border-line py-5">
                <p className="eyebrow flex items-center gap-2">
                  <Ornament className="size-2.5 text-accent" />
                  The open question
                </p>
                <p className="mt-3 font-display text-[1.8rem] italic leading-[1.18] tracking-[-0.03em] text-ink text-balance">
                  What have you changed your mind about?
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Take the prompt wherever it leads. Essays, field notes, and
                  honest fragments are welcome.
                </p>
                <Link
                  to={writingDestination}
                  className="mt-4 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
                >
                  {status === 'authenticated'
                    ? 'Answer with a story'
                    : 'Sign in to answer'}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </section>

              {contributors.length > 0 && !isLoading && (
                <section
                  aria-labelledby="contributors-heading"
                  className="border-t border-line pt-5"
                >
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Voices in the journal</p>
                      <h3
                        id="contributors-heading"
                        className="mt-2 font-display text-2xl font-medium tracking-[-0.03em] text-ink"
                      >
                        Contributors
                      </h3>
                    </div>
                    <span className="font-display text-2xl leading-none text-accent/60">
                      {String(contributors.length).padStart(2, '0')}
                    </span>
                  </div>
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {contributors.map((author) => {
                      const name = getAuthorName(author)
                      return (
                        <li key={author.id}>
                          <Link
                            to={`/authors/${author.username}`}
                            className="group flex items-center gap-3 py-3 transition-colors hover:text-accent"
                          >
                            <Avatar
                              name={name}
                              src={resolveMediaUrl(author.avatar_path)}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink group-hover:text-accent">
                                {name}
                              </span>
                              <span className="block truncate text-[0.65rem] text-muted">
                                @{author.username}
                              </span>
                            </span>
                            <ArrowUpRight
                              className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-accent"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              <div className="border-t border-line pt-4 text-xs leading-5 text-muted">
                <p>
                  {archiveCount} {pluralize(archiveTotal, 'story', 'stories')}{' '}
                  filed under {topicCount}{' '}
                  {pluralize(topics.length, 'thread', 'threads')}.
                </p>
                <a
                  href="#threads"
                  className="mt-2 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
                >
                  Browse the atlas
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-accent-soft">
              Add your perspective
            </p>
            <p className="mt-3 max-w-2xl font-display text-3xl font-medium leading-tight tracking-[-0.035em] text-paper sm:text-4xl">
              The commons is not complete without your voice.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-paper/55">
              Bring a question, a field note, or a thought you are still working
              out.
            </p>
          </div>
          <Link
            to={status === 'authenticated' ? '/write' : '/register'}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-paper/30 px-5 py-3 text-xs font-semibold text-paper transition-colors hover:border-accent hover:text-accent-soft"
          >
            {status === 'authenticated'
              ? 'Start composing'
              : 'Begin your first story'}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
