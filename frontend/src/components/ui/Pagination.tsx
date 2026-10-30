import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../utils/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null
  }

  const buttonClass =
    'inline-flex min-h-10 items-center gap-1.5 border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Previous
      </button>
      <p className="text-xs font-medium text-muted">
        Page <span className="text-ink">{page}</span> of {pageCount}
      </p>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        Next
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
