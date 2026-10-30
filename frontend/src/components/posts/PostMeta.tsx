import { MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Post } from '../../types/api'
import {
  formatFullDate,
  getAuthorName,
  getReadingLabel,
  pluralize,
} from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { getTopicLabel } from '../../utils/topics'
import { Avatar } from '../ui/Avatar'

interface PostMetaProps {
  post: Post
  className?: string
}

export function PostMeta({ post, className }: PostMetaProps) {
  const wasUpdated = post.updated_at !== post.created_at
  const authorName = getAuthorName(post.author)

  return (
    <div
      className={
        className ?? 'flex flex-wrap items-center gap-x-4 gap-y-3'
      }
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={authorName}
          src={resolveMediaUrl(post.author.avatar_path)}
          size="md"
        />
        <div>
          <Link
            to={`/authors/${post.author.username}`}
            className="text-sm font-semibold text-ink transition-colors hover:text-accent"
          >
            {authorName}
          </Link>
          <p className="text-xs text-muted">Author</p>
        </div>
      </div>
      <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
      <div className="text-xs leading-5 text-muted">
        <p>
          <time
            dateTime={post.created_at}
            title={formatFullDate(post.created_at)}
          >
            {formatFullDate(post.created_at)}
          </time>
        </p>
        <p>
          {getReadingLabel(post.content)}
          {wasUpdated && ' · Updated'}
        </p>
      </div>
      <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to={`/?topic=${encodeURIComponent(getTopicLabel(post.topic))}`}
          className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:text-ink"
        >
          {getTopicLabel(post.topic)}
        </Link>
        <a
          href="#comments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-accent"
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {post.comment_count}{' '}
          {pluralize(post.comment_count, 'comment', 'comments')}
        </a>
      </div>
    </div>
  )
}
