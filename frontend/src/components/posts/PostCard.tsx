import { ArrowUpRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Post } from '../../types/api'
import {
  formatDate,
  formatFullDate,
  getAuthorName,
  getPostExcerpt,
  getReadingLabel,
  pluralize,
} from '../../utils/format'
import { getPostCoverUrl } from '../../utils/media'
import { getTopicLabel } from '../../utils/topics'
import { AuthorLink } from '../authors/AuthorLink'
import { PostCover } from './PostCover'
import { PostEngagement } from './PostEngagement'

interface PostCardProps {
  post: Post
  index?: number
  loading?: 'eager' | 'lazy'
}

export function PostCard({ post, index, loading }: PostCardProps) {
  const topic = getTopicLabel(post.topic)
  const topicHref = `/?topic=${encodeURIComponent(topic)}`

  return (
    <article className="group flex h-full flex-col">
      <Link
        to={`/posts/${post.id}`}
        className="relative block overflow-hidden focus-visible:outline-offset-4"
        aria-label={`Read ${post.title}`}
      >
        {index !== undefined && (
          <span className="absolute left-0 top-0 z-10 bg-paper/95 px-2.5 py-1.5 font-display text-sm italic leading-none text-ink">
            {String(index).padStart(2, '0')}
          </span>
        )}
        <PostCover
          postId={post.id}
          title={post.title}
          authorName={getAuthorName(post.author)}
          createdAt={post.created_at}
          coverUrl={getPostCoverUrl(post)}
          imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          loading={loading}
        />
      </Link>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={topicHref}
              className="text-accent transition-colors hover:text-ink"
            >
              {topic}
            </Link>
            <span aria-hidden="true">·</span>
            <time
              dateTime={post.created_at}
              title={formatFullDate(post.created_at)}
            >
              {formatDate(post.created_at)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{getReadingLabel(post.content)}</span>
          </div>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${post.comment_count} ${pluralize(post.comment_count, 'comment', 'comments')}`}
          >
            <MessageSquare className="size-3" aria-hidden="true" />
            {post.comment_count}
          </span>
        </div>

        <h3 className="mt-3 font-display text-[1.7rem] font-medium leading-[1.1] tracking-[-0.035em] text-ink text-balance">
          <Link
            to={`/posts/${post.id}`}
            className="transition-colors group-hover:text-accent"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
          {getPostExcerpt(post)}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line/80 pt-5">
          <AuthorLink author={post.author} />
          <div className="flex items-center gap-1.5">
            <PostEngagement post={post} compact />
            <Link
              to={`/posts/${post.id}`}
              className="inline-flex size-9 items-center justify-center border border-transparent text-muted transition-colors hover:border-line hover:text-accent"
              aria-label={`Read ${post.title}`}
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
