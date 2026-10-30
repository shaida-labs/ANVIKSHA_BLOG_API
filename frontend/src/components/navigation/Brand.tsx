import { Link } from 'react-router-dom'

import { cn } from '../../utils/cn'

type BrandVariant = 'horizontal' | 'full' | 'symbol'

interface BrandProps {
  variant?: BrandVariant
  className?: string
  linked?: boolean
}

const assets: Record<BrandVariant, { src: string; className: string }> = {
  horizontal: {
    src: '/brand/anviksha-logo-horizontal.png',
    className: 'h-11 w-auto sm:h-14',
  },
  full: {
    src: '/brand/anviksha-logo-full.png',
    className: 'w-full max-w-[22rem]',
  },
  symbol: {
    src: '/brand/anviksha-symbol.png',
    className: 'size-12',
  },
}

export function Brand({
  variant = 'horizontal',
  className,
  linked = true,
}: BrandProps) {
  const asset = assets[variant]
  const image = (
    <img
      src={asset.src}
      alt="ANVIKSHA — Question deeper. Understand better."
      className={cn(asset.className, 'select-none object-contain', className)}
      decoding="async"
    />
  )

  if (!linked) {
    return image
  }

  return (
    <Link
      to="/"
      className="inline-flex w-fit items-center focus-visible:outline-offset-4"
      aria-label="ANVIKSHA — go to the journal"
    >
      {image}
    </Link>
  )
}
