import { Link } from 'react-router-dom'

import type { UserSummary } from '../../types/api'
import { cn } from '../../utils/cn'
import { getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { Avatar } from '../ui/Avatar'

interface AuthorLinkProps {
  author: UserSummary
  size?: 'sm' | 'md' | 'lg'
  className?: string
  nameClassName?: string
}

export function AuthorLink({
  author,
  size = 'sm',
  className,
  nameClassName,
}: AuthorLinkProps) {
  const name = getAuthorName(author)
  return (
    <Link
      to={`/authors/${author.username}`}
      className={cn(
        'group/author inline-flex min-w-0 items-center gap-2.5 transition-colors hover:text-accent',
        className,
      )}
    >
      <Avatar
        name={name}
        src={resolveMediaUrl(author.avatar_path)}
        size={size}
      />
      <span
        className={cn(
          'truncate text-xs font-semibold text-ink-soft group-hover/author:text-accent',
          nameClassName,
        )}
      >
        {name}
      </span>
    </Link>
  )
}
