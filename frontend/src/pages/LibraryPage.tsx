import {
  Bookmark,
  Check,
  FolderOpen,
  LockKeyhole,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  listBookmarkCollections,
  listBookmarks,
} from '../api/bookmarks'
import { updateBookmarkCollection } from '../api/posts'
import { listTopics } from '../api/topics'
import { AuthorLink } from '../components/authors/AuthorLink'
import { PostEngagement } from '../components/posts/PostEngagement'
import { PostThumbnail } from '../components/posts/PostThumbnail'
import { Alert } from '../components/ui/Alert'
import { Button, buttonStyles } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Pagination } from '../components/ui/Pagination'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type {
  BookmarkCollection,
  BookmarkedPost,
  BookmarkSort,
  Post,
  Topic,
} from '../types/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import {
  formatDate,
  formatFullDate,
  getPostExcerpt,
} from '../utils/format'
import { getTopicLabel } from '../utils/topics'

const PAGE_SIZE = 8
const SORT_OPTIONS: Array<{ value: BookmarkSort; label: string }> = [
  { value: 'saved_newest', label: 'Recently saved' },
  { value: 'saved_oldest', label: 'Oldest saved' },
  { value: 'title', label: 'Title A–Z' },
]

type EngagementUpdate = Partial<
  Pick<Post, 'like_count' | 'liked_by_me' | 'bookmarked_by_me'>
>

function parsePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function parseSort(value: string | null): BookmarkSort {
  return value === 'saved_oldest' || value === 'title'
    ? value
    : 'saved_newest'
}

interface LibraryItemProps {
  post: BookmarkedPost
  onRemoved: (postId: number) => void
  onCollectionUpdated: (postId: number, collection: string | null) => void
  onPostChange: (postId: number, update: EngagementUpdate) => void
}

function LibraryItem({
  post,
  onRemoved,
  onCollectionUpdated,
  onPostChange,
}: LibraryItemProps) {
  const [collection, setCollection] = useState(post.collection ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setCollection(post.collection ?? '')
  }, [post.collection, post.id])

  const saveCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    try {
      const state = await updateBookmarkCollection(post.id, {
        collection: collection.trim() || null,
      })
      setCollection(state.collection ?? '')
      onCollectionUpdated(post.id, state.collection)
    } catch (error) {
      setSaveError(
        getApiErrorMessage(error, 'The collection could not be updated.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const topic = getTopicLabel(post.topic)

  return (
    <article className="grid gap-5 border-b border-line py-7 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
      <Link
        to={`/posts/${post.id}`}
        className="block w-fit focus-visible:outline-offset-4"
        aria-label={`Read ${post.title}`}
      >
        <PostThumbnail post={post} size="md" />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted">
          <Link
            to={`/?topic=${encodeURIComponent(topic)}`}
            className="text-accent transition-colors hover:text-ink"
          >
            {topic}
          </Link>
          <span aria-hidden="true">·</span>
          <time
            dateTime={post.bookmarked_at}
            title={formatFullDate(post.bookmarked_at)}
          >
            Saved {formatDate(post.bookmarked_at)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="normal-case tracking-normal text-muted">
            {post.collection || 'Unsorted'}
          </span>
        </div>

        <h2 className="mt-2 font-display text-[1.65rem] font-medium leading-[1.12] tracking-[-0.035em] text-ink text-balance">
          <Link
            to={`/posts/${post.id}`}
            className="transition-colors hover:text-accent"
          >
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
          {getPostExcerpt(post, 220)}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AuthorLink author={post.author} />
          <PostEngagement
            post={post}
            compact
            onChange={(update) => {
              if (update.bookmarked_by_me === false) {
                onRemoved(post.id)
                return
              }
              onPostChange(post.id, update)
            }}
          />
        </div>

        <form
          onSubmit={saveCollection}
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4"
        >
          <label
            htmlFor={`library-collection-${post.id}`}
            className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Collection
          </label>
          <input
            id={`library-collection-${post.id}`}
            list="library-collections"
            value={collection}
            onChange={(event) => {
              setCollection(event.target.value)
              setSaveError(null)
            }}
            maxLength={80}
            placeholder="Unsorted"
            className="min-w-0 flex-1 border border-line bg-surface px-2.5 py-2 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none sm:max-w-48"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-8 items-center gap-1.5 border border-line bg-surface px-2.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-60"
          >
            <Check className="size-3.5" aria-hidden="true" />
            {isSaving ? 'Saving' : 'Move'}
          </button>
          {saveError && (
            <p role="alert" className="w-full text-xs text-wine">
              {saveError}
            </p>
          )}
        </form>
      </div>
    </article>
  )
}

export function LibraryPage() {
  useDocumentTitle('Library')
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q')?.trim() ?? ''
  const topic = searchParams.get('topic')?.trim() ?? ''
  const collection = searchParams.get('collection')?.trim() ?? ''
  const sort = parseSort(searchParams.get('sort'))
  const page = parsePage(searchParams.get('page'))

  const [searchInput, setSearchInput] = useState(query)
  const [items, setItems] = useState<BookmarkedPost[]>([])
  const [total, setTotal] = useState(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [collections, setCollections] = useState<BookmarkCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [collectionsRevision, setCollectionsRevision] = useState(0)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(query || topic || collection)
  const refreshCollections = useCallback(() => {
    setCollectionsRevision((value) => value + 1)
  }, [])

  useEffect(() => {
    setSearchInput(query)
  }, [query])

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
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    listBookmarkCollections(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setCollections(result)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCollections([])
        }
      })
    return () => controller.abort()
  }, [collectionsRevision])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)

    listBookmarks(
      {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        search: query || undefined,
        topic: topic || undefined,
        collection: collection || undefined,
        sort,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return
        }
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setLoadError(
          getApiErrorMessage(error, 'Your library could not be loaded.'),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [collection, page, query, revision, sort, topic])

  const buildSearchParams = (updates: {
    q?: string
    topic?: string
    collection?: string
    sort?: BookmarkSort
    page?: number
  }): URLSearchParams => {
    const next = new URLSearchParams(searchParams)
    const nextQuery = updates.q ?? query
    const nextTopic = updates.topic ?? topic
    const nextCollection = updates.collection ?? collection
    const nextSort = updates.sort ?? sort
    const nextPage = updates.page ?? page

    if (nextQuery) next.set('q', nextQuery)
    else next.delete('q')

    if (nextTopic) next.set('topic', nextTopic)
    else next.delete('topic')

    if (nextCollection) next.set('collection', nextCollection)
    else next.delete('collection')

    if (nextSort !== 'saved_newest') next.set('sort', nextSort)
    else next.delete('sort')

    if (nextPage > 1) next.set('page', String(nextPage))
    else next.delete('page')

    return next
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchParams(buildSearchParams({ q: searchInput.trim(), page: 1 }))
  }

  const handlePageChange = (nextPage: number) => {
    setSearchParams(buildSearchParams({ page: nextPage }))
    requestAnimationFrame(() => {
      document.getElementById('library-list')?.scrollIntoView({ block: 'start' })
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams(
      buildSearchParams({ q: '', topic: '', collection: '', page: 1 }),
    )
  }

  const handleRemoved = (postId: number) => {
    setItems((current) => current.filter((item) => item.id !== postId))
    setTotal((current) => Math.max(0, current - 1))
    refreshCollections()
    if (items.length === 1 && page > 1) {
      setSearchParams(buildSearchParams({ page: page - 1 }))
    }
  }

  const handleCollectionUpdated = (
    postId: number,
    nextCollection: string | null,
  ) => {
    if (collection && (nextCollection ?? '') !== collection) {
      handleRemoved(postId)
      return
    }

    setItems((current) =>
      current.map((item) =>
        item.id === postId ? { ...item, collection: nextCollection } : item,
      ),
    )
    refreshCollections()
  }

  const handlePostChange = (postId: number, update: EngagementUpdate) => {
    setItems((current) =>
      current.map((item) =>
        item.id === postId ? { ...item, ...update } : item,
      ),
    )
  }

  const topicChoices = [...topics]
  if (topic && !topicChoices.some((item) => item.name === topic)) {
    topicChoices.unshift({ name: topic, count: 0 })
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <header className="border-b border-line pb-8">
        <p className="eyebrow flex items-center gap-2">
          <LockKeyhole className="size-3 text-accent" aria-hidden="true" />
          Private to you
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(2.8rem,7vw,5.6rem)] font-medium leading-[0.92] tracking-[-0.055em] text-ink">
            Library
          </h1>
          <p className="pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {isLoading
              ? 'Opening your shelf…'
              : `${total} ${total === 1 ? 'saved story' : 'saved stories'}`}
          </p>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
          A quiet shelf for the stories you want to return to. Save from any
          story, then arrange your reading into collections that only you can
          see.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Browse stories
          </Link>
          <Link
            to="/my-posts"
            className="text-xs font-semibold text-muted transition-colors hover:text-accent"
          >
            Visit my page
          </Link>
        </div>
      </header>

      <section aria-labelledby="library-filters" className="mt-7">
        <h2 id="library-filters" className="sr-only">
          Filter your library
        </h2>
        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <form role="search" onSubmit={handleSearch} className="w-full max-w-md">
            <label htmlFor="library-search" className="eyebrow mb-2 block">
              Search the library
            </label>
            <div className="flex items-center gap-3 border-b border-line pb-2 transition-colors focus-within:border-accent">
              <Search
                className="size-4 shrink-0 text-muted"
                aria-hidden="true"
              />
              <input
                id="library-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search saved titles and text"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setSearchParams(buildSearchParams({ q: '', page: 1 }))
                  }}
                  className="flex size-8 items-center justify-center text-muted transition-colors hover:text-ink"
                  aria-label="Clear library search"
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

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="library-topic"
                className="eyebrow"
              >
                Thread
              </label>
              <select
                id="library-topic"
                value={topic}
                onChange={(event) =>
                  setSearchParams(
                    buildSearchParams({
                      topic: event.target.value,
                      page: 1,
                    }),
                  )
                }
                className="mt-2 block border-b border-line bg-transparent py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                <option value="">All threads</option>
                {topicChoices.map((topicItem) => (
                  <option key={topicItem.name} value={topicItem.name}>
                    {topicItem.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="library-collection-filter"
                className="eyebrow"
              >
                Collection
              </label>
              <select
                id="library-collection-filter"
                value={collection}
                onChange={(event) =>
                  setSearchParams(
                    buildSearchParams({
                      collection: event.target.value,
                      page: 1,
                    }),
                  )
                }
                className="mt-2 block border-b border-line bg-transparent py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                <option value="">All collections</option>
                {collections.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} ({item.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="library-sort"
                className="eyebrow"
              >
                Sort
              </label>
              <select
                id="library-sort"
                value={sort}
                onChange={(event) =>
                  setSearchParams(
                    buildSearchParams({
                      sort: event.target.value as BookmarkSort,
                      page: 1,
                    }),
                  )
                }
                className="mt-2 block border-b border-line bg-transparent py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
              >
                <X className="size-3" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <section id="library-list" className="scroll-mt-24 pt-4">
        {loadError ? (
          <div className="py-12">
            <Alert tone="error" title="Your library could not be loaded">
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
          <div className="divide-y divide-line" role="status" aria-live="polite">
            <span className="sr-only">Loading saved stories</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-5 py-7 sm:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <div className="h-24 w-32 animate-pulse bg-paper-strong" />
                <div className="space-y-3">
                  <div className="h-3 w-32 animate-pulse bg-paper-strong" />
                  <div className="h-7 w-3/4 animate-pulse bg-paper-strong" />
                  <div className="h-4 w-full animate-pulse bg-paper-strong" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10">
            {hasFilters ? (
              <EmptyState
                icon={Search}
                title="No saved stories match"
                description="Try a different search, thread, or collection, or clear the filters to see everything you have saved."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Bookmark}
                title="Your library is empty"
                description="Save a story with the bookmark control and it will appear here, ready when you want to return to it."
                action={
                  <Link
                    to="/"
                    className={buttonStyles({ variant: 'primary', size: 'sm' })}
                  >
                    Browse stories
                  </Link>
                }
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 text-xs text-muted">
              <p className="inline-flex items-center gap-2">
                <FolderOpen className="size-3.5" aria-hidden="true" />
                {hasFilters
                  ? `${total} matching ${total === 1 ? 'story' : 'stories'}`
                  : `${total} ${total === 1 ? 'story' : 'stories'} on your shelf`}
              </p>
              <p>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min((page - 1) * PAGE_SIZE + items.length, total)} of{' '}
                {total}
              </p>
            </div>

            <div>
              {items.map((post) => (
                <LibraryItem
                  key={post.id}
                  post={post}
                  onRemoved={handleRemoved}
                  onCollectionUpdated={handleCollectionUpdated}
                  onPostChange={handlePostChange}
                />
              ))}
            </div>

            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={handlePageChange}
              className="mt-10 border-t border-line pt-6"
            />
          </>
        )}
      </section>

      <datalist id="library-collections">
        {collections.map((item) => (
          <option key={item.name} value={item.name} />
        ))}
      </datalist>

      <p className="mt-8 flex items-center gap-2 text-xs text-muted">
        <LockKeyhole className="size-3" aria-hidden="true" />
        Your library is private. Saved stories and collections are visible only
        to your account.
      </p>
    </div>
  )
}
