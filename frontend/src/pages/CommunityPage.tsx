import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  MessageCircle,
  PenLine,
  RotateCcw,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { listComments } from '../api/comments'
import { listPosts } from '../api/posts'
import { listTopics } from '../api/topics'
import { PostCover } from '../components/posts/PostCover'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Button, buttonStyles } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Ornament } from '../components/ui/Ornament'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useReadingTrail } from '../hooks/useReadingTrail'
import type { BlogComment, Post, Topic, UserSummary } from '../types/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import { cn } from '../utils/cn'
import {
  formatDate,
  formatFullDate,
  getAuthorName,
  getPostExcerpt,
  getReadingLabel,
  pluralize,
} from '../utils/format'
import { getPostCoverUrl, resolveMediaUrl } from '../utils/media'
import { getTopicLabel } from '../utils/topics'

interface CommunityResponse {
  comment: BlogComment
  post: Post
}

interface Contributor {
  author: UserSummary
  postCount: number
}

interface ThreadPulse {
  name: string
  postCount: number
  engagement: number
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl italic leading-none text-accent/65">
          {number}
        </span>
        <span className="h-px w-8 bg-line" aria-hidden="true" />
        <p className="eyebrow">{eyebrow}</p>
      </div>
      <h2 className="mt-3 max-w-xl font-display text-[clamp(2.3rem,4.5vw,3.8rem)] font-medium leading-[0.96] tracking-[-0.055em] text-ink text-balance">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        {description}
      </p>
    </div>
  )
}

function CommunitySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading the commons</span>
      <div className="h-4 w-36 animate-pulse bg-paper-strong" />
      <div className="h-20 w-full animate-pulse bg-paper-strong" />
      <div className="h-20 w-11/12 animate-pulse bg-paper-strong" />
      <div className="h-20 w-4/5 animate-pulse bg-paper-strong" />
    </div>
  )
}

export function CommunityPage() {
  useDocumentTitle('Community')
  const { status } = useAuth()
  const { trail, clear: clearTrail } = useReadingTrail()

  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [totalStories, setTotalStories] = useState(0)
  const [responses, setResponses] = useState<CommunityResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    Promise.all([
      listPosts({ limit: 100, sort: 'newest' }, controller.signal),
      listTopics(controller.signal),
    ])
      .then(([postPage, topicList]) => {
        if (controller.signal.aborted) {
          return
        }
        setPosts(postPage.items)
        setTotalStories(postPage.total)
        setTopics(topicList)
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setPosts([])
        setTopics([])
        setTotalStories(0)
        setError(
          getApiErrorMessage(loadError, 'The commons could not be loaded.'),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [revision])

  const discussionPostIds = useMemo(
    () =>
      posts
        .filter((post) => post.comment_count > 0)
        .slice(0, 3)
        .map((post) => post.id),
    [posts],
  )

  useEffect(() => {
    if (discussionPostIds.length === 0) {
      setResponses([])
      return
    }

    const controller = new AbortController()
    const postsById = new Map(posts.map((post) => [post.id, post]))

    Promise.all(
      discussionPostIds.map((postId) =>
        listComments({ postId, limit: 2 }, controller.signal)
          .then((page) => ({ postId, page }))
          .catch(() => ({ postId, page: null })),
      ),
    )
      .then((pages) => {
        if (controller.signal.aborted) {
          return
        }

        const nextResponses = pages
          .flatMap(({ postId, page }) => {
            const post = postsById.get(postId)
            if (!post || !page) {
              return []
            }
            return page.items.map((comment) => ({ comment, post }))
          })
          .sort((first, second) =>
            second.comment.created_at.localeCompare(first.comment.created_at),
          )
          .slice(0, 4)

        setResponses(nextResponses)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResponses([])
        }
      })

    return () => controller.abort()
  }, [discussionPostIds, posts])

  const contributors = useMemo<Contributor[]>(() => {
    const byId = new Map<number, Contributor>()
    for (const post of posts) {
      const current = byId.get(post.author.id)
      byId.set(post.author.id, {
        author: post.author,
        postCount: (current?.postCount ?? 0) + 1,
      })
    }
    return Array.from(byId.values()).sort(
      (first, second) => second.postCount - first.postCount,
    )
  }, [posts])

  const threadPulse = useMemo<ThreadPulse[]>(() => {
    const byTopic = new Map<string, ThreadPulse>()
    for (const post of posts) {
      const name = getTopicLabel(post.topic)
      const current = byTopic.get(name)
      byTopic.set(name, {
        name,
        postCount: (current?.postCount ?? 0) + 1,
        engagement:
          (current?.engagement ?? 0) + post.like_count + post.comment_count,
      })
    }
    return Array.from(byTopic.values())
      .sort(
        (first, second) =>
          second.engagement - first.engagement ||
          second.postCount - first.postCount,
      )
      .slice(0, 4)
  }, [posts])

  const latestPost = posts[0] ?? null
  const visibleContributors = contributors.slice(0, 6)
  const voices = contributors.length
  const voicesLabel = totalStories > posts.length ? `${voices}+` : String(voices)
  const maxPulse = Math.max(...threadPulse.map((thread) => thread.engagement), 0)
  const writeDestination =
    status === 'authenticated' ? '/write' : '/register'
  const writeLabel =
    status === 'authenticated' ? 'Compose a story' : 'Create an account'

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden bg-ink text-paper">
        <div
          className="absolute inset-x-0 top-0 h-px bg-paper/20"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/20 pb-3">
                <p className="flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-paper/60">
                  <Ornament className="size-2.5 text-accent" />
                  The commons · Vol. I
                </p>
                <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-paper/35">
                  A room for considered response
                </p>
              </div>

              <h1 className="mt-9 font-display text-[clamp(4rem,10vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.065em] text-paper">
                The{' '}
                <em className="font-normal text-accent-soft">commons.</em>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-paper/60 sm:text-base sm:leading-8">
                The living edge of ANVIKSHA: recent responses, the people behind
                them, and the threads still gathering heat.
              </p>

              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-paper/20 pt-5">
                <div>
                  <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-paper/40">
                    Stories
                  </dt>
                  <dd className="mt-2 font-display text-3xl leading-none text-paper">
                    {isLoading ? '—' : totalStories}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-paper/40">
                    Threads
                  </dt>
                  <dd className="mt-2 font-display text-3xl leading-none text-paper">
                    {isLoading ? '—' : topics.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-paper/40">
                    Voices
                  </dt>
                  <dd className="mt-2 font-display text-3xl leading-none text-paper">
                    {isLoading ? '—' : voicesLabel}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-paper/40">
                  Latest from the room
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-paper/50 transition-colors hover:text-accent-soft"
                >
                  Stories
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </div>

              {isLoading ? (
                <div
                  className="mt-4 h-80 animate-pulse border border-paper/20 bg-paper/5"
                  role="status"
                  aria-live="polite"
                >
                  <span className="sr-only">Loading the latest story</span>
                </div>
              ) : latestPost ? (
                <article className="mt-4 border border-paper/20 bg-paper/5">
                  <Link
                    to={`/posts/${latestPost.id}`}
                    className="group block overflow-hidden"
                    aria-label={`Read ${latestPost.title}`}
                  >
                    <PostCover
                      postId={latestPost.id}
                      title={latestPost.title}
                      authorName={getAuthorName(latestPost.author)}
                      createdAt={latestPost.created_at}
                      coverUrl={getPostCoverUrl(latestPost)}
                      aspectClassName="aspect-[2/1]"
                      imageFit="natural"
                      imageFrameStyle={{ backgroundColor: 'var(--color-ink)' }}
                      imageClassName="transition-opacity duration-700 ease-out group-hover:opacity-95"
                    />
                  </Link>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[0.56rem] font-semibold uppercase tracking-[0.16em]">
                      <span className="text-accent-soft">
                        {getTopicLabel(latestPost.topic)}
                      </span>
                      <span className="text-paper/40">
                        {getReadingLabel(latestPost.content)}
                      </span>
                    </div>
                    <h2 className="mt-2 font-display text-2xl font-medium leading-[1.06] tracking-[-0.035em] text-paper">
                      <Link
                        to={`/posts/${latestPost.id}`}
                        className="transition-colors hover:text-accent-soft"
                      >
                        {latestPost.title}
                      </Link>
                    </h2>
                    <div className="mt-4 flex items-center gap-2 border-t border-paper/20 pt-4">
                      <Avatar
                        name={getAuthorName(latestPost.author)}
                        src={resolveMediaUrl(latestPost.author.avatar_path)}
                        size="sm"
                      />
                      <p className="min-w-0 truncate text-xs text-paper/55">
                        {getAuthorName(latestPost.author)}
                      </p>
                      <time
                        className="ml-auto shrink-0 text-[0.58rem] uppercase tracking-[0.12em] text-paper/35"
                        dateTime={latestPost.created_at}
                        title={formatFullDate(latestPost.created_at)}
                      >
                        {formatDate(latestPost.created_at)}
                      </time>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="mt-4 border border-paper/20 p-6 text-sm leading-6 text-paper/50">
                  The room is quiet. The first story will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="In the commons"
        className="border-b border-line bg-surface/55"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-5 py-3.5 sm:px-8 lg:gap-8 lg:px-10">
          <p className="flex shrink-0 items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
            <Ornament className="size-2.5 text-accent" />
            In the commons
          </p>
          <span className="h-3.5 w-px shrink-0 bg-line" aria-hidden="true" />
          <a
            href="#conversation"
            className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            01 / Conversation
          </a>
          <a
            href="#people"
            className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            02 / People
          </a>
          <a
            href="#threads"
            className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            03 / Threads
          </a>
          <a
            href="#reading-trail"
            className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            04 / Reading trail
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {error && (
          <div className="pt-10">
            <Alert tone="error" title="The commons could not be loaded">
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
        )}

        <section
          id="conversation"
          className="scroll-mt-28 py-14 sm:py-20"
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <div className="min-w-0">
              <SectionHeading
                number="01"
                eyebrow="The conversation"
                title="What the room is saying."
                description="Recent responses from across the journal, in the order they were shared."
              />

              <div className="mt-8">
                {isLoading ? (
                  <CommunitySkeleton />
                ) : responses.length === 0 ? (
                  <EmptyState
                    icon={MessageCircle}
                    title="The room is waiting for its first response"
                    description="Open a story and add a considered reply. Responses appear here as the conversation grows."
                  />
                ) : (
                  <ol className="divide-y divide-line border-y border-line">
                    {responses.map(({ comment, post }) => (
                      <li key={comment.id} className="py-6">
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={getAuthorName(comment.author)}
                            src={resolveMediaUrl(comment.author.avatar_path)}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <Link
                                to={`/authors/${comment.author.username}`}
                                className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                              >
                                {getAuthorName(comment.author)}
                              </Link>
                              <span className="text-xs text-muted">
                                @{comment.author.username}
                              </span>
                              <span className="text-muted/50" aria-hidden="true">
                                ·
                              </span>
                              <time
                                className="text-xs text-muted"
                                dateTime={comment.created_at}
                                title={formatFullDate(comment.created_at)}
                              >
                                {formatDate(comment.created_at)}
                              </time>
                            </div>
                            <p className="mt-2 line-clamp-3 font-display text-[1.35rem] italic leading-[1.45] tracking-[-0.015em] text-ink">
                              “{comment.content}”
                            </p>
                            <Link
                              to={`/posts/${post.id}#comments`}
                              className="group mt-3 inline-flex max-w-full items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
                            >
                              <span className="shrink-0">In response to</span>
                              <span className="truncate text-ink transition-colors group-hover:text-accent">
                                {post.title}
                              </span>
                              <ArrowUpRight
                                className="size-3 shrink-0"
                                aria-hidden="true"
                              />
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <aside className="min-w-0 space-y-8">
              <div
                id="reading-trail"
                className="scroll-mt-28 border border-line bg-surface p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="eyebrow flex items-center gap-2">
                    <BookOpen className="size-3.5 text-accent" aria-hidden="true" />
                    Your reading trail
                  </p>
                  {trail.length > 0 && (
                    <button
                      type="button"
                      onClick={clearTrail}
                      className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-wine"
                      aria-label="Clear your reading trail"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  A private trace of the stories you have opened, kept only in
                  this browser.
                </p>

                {trail.length > 0 ? (
                  <ol className="mt-4 divide-y divide-line border-t border-line">
                    {trail.map((item, index) => (
                      <li key={item.id}>
                        <Link
                          to={`/posts/${item.id}`}
                          className="group flex items-start gap-3 py-3"
                        >
                          <span className="font-display text-lg italic leading-none text-accent/65">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[0.62rem] text-muted">
                              {item.topic} · {item.author}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="mt-0.5 size-3.5 shrink-0 text-muted transition-colors group-hover:text-accent"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Link
                    to="/#journal"
                    className="mt-4 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
                  >
                    Open a story
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div id="threads" className="scroll-mt-28 border-t border-line pt-6">
                <p className="eyebrow flex items-center gap-2">
                  <Compass className="size-3.5 text-accent" aria-hidden="true" />
                  Thread pulse
                </p>
                <h2 className="mt-2 font-display text-3xl font-medium leading-[1.02] tracking-[-0.04em] text-ink">
                  Where the room is alive.
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Threads ranked by real likes and responses across the journal.
                </p>

                {threadPulse.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {threadPulse.map((thread) => (
                      <Link
                        key={thread.name}
                        to={`/?topic=${encodeURIComponent(thread.name)}`}
                        className="group block"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                            {thread.name}
                          </span>
                          <span className="font-display text-lg italic leading-none text-accent/65">
                            {thread.engagement}
                          </span>
                        </div>
                        <div className="mt-2 h-px bg-line">
                          <div
                            className="h-px bg-accent transition-[width] duration-500"
                            style={{
                              width: `${Math.max(
                                8,
                                maxPulse > 0
                                  ? Math.round(
                                      (thread.engagement / maxPulse) * 100,
                                    )
                                  : 8,
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">
                          {thread.postCount}{' '}
                          {pluralize(thread.postCount, 'story', 'stories')} ·{' '}
                          {thread.engagement}{' '}
                          {pluralize(thread.engagement, 'signal', 'signals')}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Threads will surface as soon as stories are filed.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </section>

        <section id="people" className="scroll-mt-28 border-t border-line py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              number="02"
              eyebrow="The people"
              title="Voices in the commons."
              description="The writers and responders who keep the room in motion."
            />
            <Link
              to="/#journal"
              className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
            >
              Browse stories
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse border border-line bg-paper-strong"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : contributors.length > 0 ? (
            <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              {visibleContributors.map(({ author, postCount }, index) => {
                const name = getAuthorName(author)
                return (
                  <Link
                    key={author.id}
                    to={`/authors/${author.username}`}
                    className={cn(
                      'group border border-line bg-surface p-5 transition-colors hover:bg-paper-strong',
                      index === visibleContributors.length - 1 &&
                        visibleContributors.length % 2 === 1 &&
                        'sm:col-span-2',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={name}
                        src={resolveMediaUrl(author.avatar_path)}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                          {name}
                        </p>
                        <p className="mt-0.5 truncate text-[0.65rem] text-muted">
                          @{author.username}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="ml-auto size-3.5 shrink-0 text-muted transition-colors group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-4 border-t border-line pt-3 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      {postCount} {pluralize(postCount, 'story', 'stories')} in
                      the commons
                    </p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={Users}
                title="The room is still gathering"
                description="Contributors appear here when the first story is published."
              />
            </div>
          )}
        </section>

        <section
          id="recent"
          className="scroll-mt-28 border-t border-line py-14 sm:py-20"
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div className="min-w-0">
              <SectionHeading
                number="03"
                eyebrow="Recently filed"
                title="New work, still warm."
                description="The latest stories to enter the journal."
              />
            </div>

            {isLoading ? (
              <CommunitySkeleton />
            ) : posts.length > 0 ? (
              <ol className="min-w-0 divide-y divide-line border-y border-line">
                {posts.slice(0, 4).map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/posts/${post.id}`}
                      className="group grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-5"
                    >
                      <PostCover
                        postId={post.id}
                        title={post.title}
                        authorName={getAuthorName(post.author)}
                        createdAt={post.created_at}
                        coverUrl={getPostCoverUrl(post)}
                        aspectClassName="aspect-square"
                        imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em]">
                          <span className="text-accent">
                            {getTopicLabel(post.topic)}
                          </span>
                          <span className="text-muted" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-muted">
                            {getReadingLabel(post.content)}
                          </span>
                        </div>
                        <h3 className="mt-1.5 font-display text-[1.55rem] font-medium leading-[1.08] tracking-[-0.03em] text-ink transition-colors group-hover:text-accent">
                          {post.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">
                          {getPostExcerpt(post, 150)}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-[0.6rem] text-muted">
                          <Avatar
                            name={getAuthorName(post.author)}
                            src={resolveMediaUrl(post.author.avatar_path)}
                            size="xs"
                          />
                          <span className="truncate">
                            {getAuthorName(post.author)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <time
                            dateTime={post.created_at}
                            title={formatFullDate(post.created_at)}
                          >
                            {formatDate(post.created_at)}
                          </time>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={PenLine}
                title="No stories have been filed yet"
                description="The first story will appear here as soon as it is published."
              />
            )}
          </div>
        </section>

        <section className="border-y border-line bg-surface/55">
          <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Take part</p>
              <p className="mt-2 max-w-xl font-display text-3xl font-medium leading-[1.04] tracking-[-0.04em] text-ink sm:text-4xl">
                The room grows when you speak.
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                Publish a story, leave a response, or follow a thread.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={writeDestination}
                className={buttonStyles({ variant: 'primary', size: 'md' })}
              >
                {writeLabel}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/"
                className={buttonStyles({ variant: 'secondary', size: 'md' })}
              >
                Read the journal
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
