import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { Brand } from '../components/navigation/Brand'
import { buttonStyles } from '../components/ui/Button'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function RouteErrorPage() {
  useDocumentTitle('Something went wrong')
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : null

  return (
    <div className="flex min-h-screen flex-col bg-paper px-5 py-8 sm:px-8 sm:py-10">
      <Brand />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-16">
        <p className="eyebrow">
          Unexpected error{status ? ` ${status}` : ''}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.6rem,7vw,5rem)] font-medium leading-[0.98] tracking-[-0.055em] text-ink">
          Something interrupted the page.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted">
          ANVIKSHA hit an unexpected problem. Reload the page to try again, or
          return to the journal.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonStyles({ variant: 'primary', size: 'md' })}
          >
            Reload page
          </button>
          <Link
            to="/"
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            Back to stories
          </Link>
        </div>
      </div>
    </div>
  )
}
