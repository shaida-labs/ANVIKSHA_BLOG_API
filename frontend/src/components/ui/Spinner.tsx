import { LoaderCircle } from 'lucide-react'

import { cn } from '../../utils/cn'
import { Brand } from '../navigation/Brand'

interface SpinnerProps {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn('size-4 animate-spin', className)}
    />
  )
}

interface PageLoaderProps {
  label?: string
}

export function PageLoader({ label = 'Opening ANVIKSHA' }: PageLoaderProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6"
      role="status"
      aria-live="polite"
    >
      <Brand variant="horizontal" className="h-12" linked={false} />
      <span className="h-px w-12 bg-line" />
      <p className="eyebrow">{label}</p>
    </div>
  )
}
