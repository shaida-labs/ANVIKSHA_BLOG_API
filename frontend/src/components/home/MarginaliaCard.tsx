import { ArrowUpRight, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { BlogComment, Post } from '../../types/api'
import { getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { Avatar } from '../ui/Avatar'
import { Ornament } from '../ui/Ornament'

interface MarginaliaCardProps {
  comment: BlogComment | null
  post: Post | null
}

export function MarginaliaCard({ comment, post }: MarginaliaCardProps) {
  if (!post) {
    return null
  }

  return (
    <section
      className="border border-ink bg-ink p-5 text-paper"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-accent-soft">
          <Ornament className="size-2.5 text-accent" />
          Marginalia
        </p>
        <Quote className="size-4 text-accent" aria-hidden="true" />
      </div>

      {comment ? (
        <>
          <blockquote className="mt-4 font-display text-[1.65rem] italic leading-[1.25] tracking-[-0.025em] text-paper text-balance">
            “{comment.content}”
          </blockquote>
          <div className="mt-5 flex items-center gap-3 border-t border-paper/15 pt-4">
            <Avatar
              name={getAuthorName(comment.author)}
              src={resolveMediaUrl(comment.author.avatar_path)}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-paper">
                {getAuthorName(comment.author)}
              </p>
              <p className="truncate text-[0.62rem] text-paper/50">
                in the margin of “{post.title}”
              </p>
            </div>
          </div>
          <Link
            to={`/posts/${post.id}#comments`}
            className="mt-4 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-paper underline decoration-accent underline-offset-4 transition-colors hover:text-accent-soft"
          >
            Join the conversation
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-[1.75rem] italic leading-[1.2] tracking-[-0.025em] text-paper">
            The margin is open.
          </p>
          <p className="mt-3 text-sm leading-6 text-paper/60">
            Be the first to leave a thought beside the cover story.
          </p>
          <Link
            to={`/posts/${post.id}#comments`}
            className="mt-5 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-paper underline decoration-accent underline-offset-4 transition-colors hover:text-accent-soft"
          >
            Add a note
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  )
}
