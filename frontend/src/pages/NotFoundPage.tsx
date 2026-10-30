import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonStyles } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { status } = useAuth()

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Error 404</p>
      <p className="mt-3 font-display text-[clamp(5rem,18vw,12rem)] font-medium leading-none tracking-[-0.08em] text-accent/25">
        404
      </p>
      <h1 className="mt-2 font-display text-[clamp(2.3rem,6vw,4.5rem)] font-medium leading-[0.98] tracking-[-0.055em] text-ink">
        This page has wandered off.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted">
        The address may have changed, or the page never existed. ANVIKSHA is
        still right where you left it.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className={buttonStyles({ variant: 'primary', size: 'md' })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to stories
        </Link>
        {status === 'authenticated' && (
          <Link
            to="/my-posts"
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            <Compass className="size-4" aria-hidden="true" />
            Open my page
          </Link>
        )}
      </div>
    </div>
  )
}
