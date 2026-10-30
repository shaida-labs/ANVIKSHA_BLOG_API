import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { currentYear } from '../../utils/format'
import { Brand } from '../navigation/Brand'

const quietLinkClasses =
  'text-xs font-semibold text-muted transition-colors hover:text-accent'

export function SiteFooter() {
  const { status } = useAuth()
  const isAuthenticated = status === 'authenticated'

  return (
    <footer className="site-footer border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Brand className="h-9" />
            <span
              className="hidden h-4 w-px bg-line sm:block"
              aria-hidden="true"
            />
            <p className="hidden text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted sm:block">
              Question deeper. Understand better.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            <Link to="/" className={quietLinkClasses}>
              Stories
            </Link>
            <Link to="/#threads" className={quietLinkClasses}>
              Topics
            </Link>
            <Link to="/community" className={quietLinkClasses}>
              Community
            </Link>
            <Link to="/#premise" className={quietLinkClasses}>
              About
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/my-posts" className={quietLinkClasses}>
                  My page
                </Link>
                <Link to="/library" className={quietLinkClasses}>
                  Library
                </Link>
              </>
            ) : (
              <Link to="/login" className={quietLinkClasses}>
                Sign in
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-1 border-t border-line/80 pt-4 text-[0.56rem] font-medium uppercase tracking-[0.18em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} ANVIKSHA · Vol. I</p>
          <p className="hidden sm:block">
            Set in Cormorant Garamond &amp; Manrope
          </p>
          <p>Read · Write · Discuss</p>
        </div>
      </div>
    </footer>
  )
}
