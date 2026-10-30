import { useState, type CSSProperties } from 'react'

import { cn } from '../../utils/cn'
import { getInitial, getYear } from '../../utils/format'

interface PostCoverProps {
  postId: number
  title: string
  authorName: string
  createdAt: string
  coverUrl?: string | null
  featured?: boolean
  className?: string
  aspectClassName?: string
  imageClassName?: string
  imageFit?: 'cover' | 'contain' | 'natural'
  imageFrameStyle?: CSSProperties
  loading?: 'eager' | 'lazy'
}

const themes = [
  {
    surface: 'bg-[#e4d8c6] text-[#5c4328]',
    rule: 'border-[#5c4328]/25',
    stamp: 'bg-[#5c4328] text-[#f2eee5]',
  },
  {
    surface: 'bg-[#e7dfd0] text-[#4f473b]',
    rule: 'border-[#4f473b]/25',
    stamp: 'bg-[#a47a43] text-[#f2eee5]',
  },
  {
    surface: 'bg-[#dfd9c9] text-[#55503f]',
    rule: 'border-[#55503f]/25',
    stamp: 'bg-[#55503f] text-[#f2eee5]',
  },
  {
    surface: 'bg-[#e9dcd2] text-[#6b4035]',
    rule: 'border-[#6b4035]/25',
    stamp: 'bg-[#7a3b32] text-[#f2eee5]',
  },
  {
    surface: 'bg-[#e1d8c7] text-[#4d4538]',
    rule: 'border-[#4d4538]/25',
    stamp: 'bg-[#6b5a43] text-[#f2eee5]',
  },
]

export function PostCover({
  postId,
  title,
  authorName,
  createdAt,
  coverUrl,
  featured = false,
  className,
  aspectClassName,
  imageClassName,
  imageFit = 'cover',
  imageFrameStyle,
  loading,
}: PostCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const imageUrl = coverUrl?.trim() || null
  const showImage = imageUrl !== null && failedUrl !== imageUrl
  const theme = themes[(postId - 1) % themes.length] ?? themes[0]
  const issueNumber = String(postId).padStart(2, '0')

  if (showImage) {
    return (
      <div
        style={imageFrameStyle}
        className={cn(
          'relative overflow-hidden border border-ink/10 bg-paper-strong',
          imageFit === 'natural'
            ? undefined
            : (aspectClassName ?? 'aspect-video'),
          className,
        )}
      >
        <img
          src={imageUrl}
          alt={`Cover image for ${title}`}
          loading={loading ?? (featured ? 'eager' : 'lazy')}
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn(
            imageFit === 'natural' ? 'block h-auto w-full' : 'size-full',
            imageFit === 'contain'
              ? 'object-contain'
              : imageFit === 'natural'
                ? undefined
                : 'object-cover',
            imageClassName,
          )}
          onError={() => setFailedUrl(imageUrl)}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden border border-ink/10',
        aspectClassName ??
          (featured ? 'aspect-[5/4] lg:aspect-[4/3]' : 'aspect-[4/3]'),
        theme?.surface,
        className,
      )}
    >
      <div className={cn('absolute inset-3 border sm:inset-4', theme?.rule)} />
      <div className="absolute inset-x-6 top-6 flex items-start justify-between gap-4 text-[0.56rem] font-semibold uppercase tracking-[0.22em] sm:top-7 sm:text-[0.6rem]">
        <span>ANVIKSHA</span>
        <span>{getYear(createdAt)}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'font-display italic leading-none opacity-90',
            featured
              ? 'text-[9rem] sm:text-[12rem] lg:text-[14rem]'
              : 'text-[7rem] sm:text-[8rem]',
          )}
        >
          {getInitial(title)}
        </span>
      </div>
      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 sm:bottom-7">
        <div className="text-[0.56rem] font-semibold uppercase tracking-[0.2em] sm:text-[0.6rem]">
          <p>From the journal</p>
          <p className="mt-1 opacity-70">By {authorName}</p>
        </div>
        <span
          className={cn(
            'flex size-10 items-center justify-center font-display text-lg italic sm:size-12',
            theme?.stamp,
          )}
        >
          {issueNumber}
        </span>
      </div>
    </div>
  )
}
