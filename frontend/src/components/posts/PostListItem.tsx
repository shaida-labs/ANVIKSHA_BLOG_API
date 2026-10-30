import { ArrowUpRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Post } from '../../types/api'
import {
  formatDate,
  getPostExcerpt,
  getReadingLabel,
  pluralize,
} from '../../utils/format'
import { getTopicLabel } from '../../utils/topics'
import { AuthorLink } from '../authors/AuthorLink'
import { PostEngagement } from './PostEngagement'
import { PostThumbnail } from './PostThumbnail'

interface PostListItemProps {
  post: Post
  index: number
}

export function PostListItem({ post, index }: PostListItemProps) {
  const topic = getTopicLabel(post.topic)

  return (
    <article className="group grid gap-4 py-6 sm:grid-cols-[2rem_8rem_minmax(0,1fr)_auto] sm:items-start sm:gap-5">
      <span className="hidden font-display text-2xl leading-none text-accent/60 sm:block">
        {String(index).padStart(2, '0')}
      </span>

      <Link
        to={`/posts/${post.id}`}
        className="hidden focus-visible:outline-offset-4 sm:block"
        aria-label={`Read ${post.title}`}
      >
        <PostThumbnail post={post} size="md" />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
          <Link
            to={`/?topic=${encodeURIComponent(topic)}`}
            className="text-accent transition-colors hover:text-ink"
          >
            {topic}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          <span aria-hidden="true">·</span>
          <span>{getReadingLabel(post.content)}</span>
        </div>

        <h3 className="mt-2 font-display text-2xl font-medium leading-[1.1] tracking-[-0.035em] text-ink">
          <Link
            to={`/posts/${post.id}`}
            className="transition-colors group-hover:text-accent"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
          {getPostExcerpt(post)}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AuthorLink author={post.author} />
            <span
              className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted"
              aria-label={`${post.comment_count} ${pluralize(post.comment_count, 'comment', 'comments')}`}
            >
              <MessageSquare className="size-3" aria-hidden="true" />
              {post.comment_count}
            </span>
          </div>
          <PostEngagement post={post} compact />
        </div>
      </div>

      <Link
        to={`/posts/${post.id}`}
        className="hidden size-9 items-center justify-center self-center border border-transparent text-muted transition-colors hover:border-line hover:text-accent sm:inline-flex"
        aria-label={`Read ${post.title}`}
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}
