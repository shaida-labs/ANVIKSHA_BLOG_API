import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        className ??
        'flex flex-col items-center border-y border-line px-6 py-16 text-center'
      }
    >
      <span className="mb-5 flex size-12 items-center justify-center border border-line bg-paper text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
