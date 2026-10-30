import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { PageLoader } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <PageLoader />
  }

  if (status === 'anonymous') {
    const destination = `${location.pathname}${location.search}${location.hash}`
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(destination)}`}
        replace
      />
    )
  }

  return children
}
