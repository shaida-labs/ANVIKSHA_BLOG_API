import { useState } from 'react'

import { cn } from '../../utils/cn'
import { getInitial } from '../../utils/format'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'size-4 text-[0.45rem]',
  sm: 'size-7 text-[0.65rem]',
  md: 'size-10 text-xs',
  lg: 'size-12 text-sm',
}

const colorClasses = [
  'bg-accent-soft text-accent',
  'bg-[#e8ddd4] text-wine',
  'bg-[#e0e6dc] text-sage',
  'bg-[#eee2ce] text-ochre',
]

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const imageUrl = src?.trim() || null
  const showImage = imageUrl !== null && failedSrc !== imageUrl
  const colorIndex =
    Array.from(name).reduce((total, character) => {
      return total + character.charCodeAt(0)
    }, 0) % colorClasses.length

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/10 font-semibold tracking-[-0.02em]',
        sizeClasses[size],
        colorClasses[colorIndex],
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(imageUrl ?? null)}
          className="size-full object-cover"
        />
      ) : (
        getInitial(name)
      )}
    </span>
  )
}
