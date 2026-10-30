import { useState } from 'react'

import type { Post } from '../../types/api'
import { cn } from '../../utils/cn'
import { getInitial } from '../../utils/format'
import { getPostCoverUrl } from '../../utils/media'

interface PostThumbnailProps {
  post: Post
  size?: 'sm' | 'md'
  className?: string
}

const sizeClasses = {
  sm: 'h-12 w-16',
  md: 'h-24 w-32',
}

export function PostThumbnail({
  post,
  size = 'sm',
  className,
}: PostThumbnailProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const imageUrl = getPostCoverUrl(post)
  const showImage = imageUrl !== null && failedUrl !== imageUrl

  if (showImage) {
    return (
      <img
        src={imageUrl}
        alt={`Cover image for ${post.title}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(imageUrl)}
        className={cn(
          'shrink-0 border border-line bg-paper-strong object-cover',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border border-line bg-paper-strong font-display text-lg italic text-muted',
        sizeClasses[size],
        className,
      )}
    >
      {getInitial(post.title)}
    </div>
  )
}
