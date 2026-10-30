import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Post } from '../../types/api'
import {
  getAuthorName,
  getPostExcerpt,
  getReadingLabel,
} from '../../utils/format'
import { getPostCoverUrl } from '../../utils/media'
import { getTopicLabel } from '../../utils/topics'
import { AuthorLink } from '../authors/AuthorLink'
import { PostCover } from '../posts/PostCover'
import { Ornament } from '../ui/Ornament'

interface CoverStoryProps {
  post: Post
  issueNumber?: string
}

export function CoverStory({ post, issueNumber = '01' }: CoverStoryProps) {
  const topic = getTopicLabel(post.topic)

  return (
    <article className="group">
      <div className="relative">
        <Link
          to={`/posts/${post.id}`}
          className="block overflow-hidden focus-visible:outline-offset-4"
          aria-label={`Read the cover story: ${post.title}`}
        >
          <PostCover
            postId={post.id}
            title={post.title}
            authorName={getAuthorName(post.author)}
            createdAt={post.created_at}
            coverUrl={getPostCoverUrl(post)}
            featured
            aspectClassName="aspect-[2/1]"
            imageFit="natural"
            imageFrameStyle={{ backgroundColor: 'var(--color-ink)' }}
            imageClassName="transition-opacity duration-700 ease-out group-hover:opacity-95"
          />
        </Link>
        <div className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 bg-ink px-3 py-2 text-[0.56rem] font-semibold uppercase tracking-[0.22em] text-paper">
          <Ornament className="size-2.5 text-accent" />
          Cover story
        </div>
        <div className="pointer-events-none absolute bottom-0 right-0 bg-paper px-3.5 py-2 font-display text-2xl italic leading-none text-ink">
          {issueNumber}
        </div>
      </div>

      <div className="border-x border-b border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/?topic=${encodeURIComponent(topic)}`}
            className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:text-ink"
          >
            {topic}
          </Link>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {getReadingLabel(post.content)}
          </p>
        </div>

        <h2 className="mt-3 font-display text-[clamp(1.85rem,2.8vw,2.65rem)] font-medium leading-[1.02] tracking-[-0.045em] text-ink text-balance">
          <Link
            to={`/posts/${post.id}`}
            className="transition-colors group-hover:text-accent"
          >
            {post.title}
          </Link>
        </h2>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
          {getPostExcerpt(post, 220)}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <AuthorLink author={post.author} />
          <Link
            to={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-accent"
          >
            Read the story
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}
