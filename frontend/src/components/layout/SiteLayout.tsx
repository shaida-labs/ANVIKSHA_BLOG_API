import { Outlet } from 'react-router-dom'

import { useRouteScroll } from '../../hooks/useRouteScroll'
import { SiteFooter } from '../layout/SiteFooter'
import { SiteHeader } from '../navigation/SiteHeader'

export function SiteLayout() {
  useRouteScroll()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 bg-ink px-4 py-2 text-sm font-semibold text-paper transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
