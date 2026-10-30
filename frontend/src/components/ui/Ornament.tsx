import { cn } from '../../utils/cn'

interface OrnamentProps {
  className?: string
}

export function Ornament({ className }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-3', className)}
    >
      <path
        d="M12 0c0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12 0-6.627-5.373-12-12-12C6.627 12 12 6.627 12 0Z"
        fill="currentColor"
      />
    </svg>
  )
}
