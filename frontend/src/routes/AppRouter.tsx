import { lazy, Suspense, type ReactNode } from 'react'
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  useParams,
} from 'react-router-dom'

import { SiteLayout } from '../components/layout/SiteLayout'
import { PageLoader } from '../components/ui/Spinner'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { ProtectedRoute } from './ProtectedRoute'

const AccountPage = lazy(() =>
  import('../pages/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
)
const AuthorProfilePage = lazy(() =>
  import('../pages/AuthorProfilePage').then((module) => ({
    default: module.AuthorProfilePage,
  })),
)
const CommunityPage = lazy(() =>
  import('../pages/CommunityPage').then((module) => ({
    default: module.CommunityPage,
  })),
)
const HomePage = lazy(() =>
  import('../pages/HomePage').then((module) => ({
    default: module.HomePage,
  })),
)
const LibraryPage = lazy(() =>
  import('../pages/LibraryPage').then((module) => ({
    default: module.LibraryPage,
  })),
)
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const MyPostsPage = lazy(() =>
  import('../pages/MyPostsPage').then((module) => ({
    default: module.MyPostsPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)
const PostDetailPage = lazy(() =>
  import('../pages/PostDetailPage').then((module) => ({
    default: module.PostDetailPage,
  })),
)
const PostEditorPage = lazy(() =>
  import('../pages/PostEditorPage').then((module) => ({
    default: module.PostEditorPage,
  })),
)
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
)

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

function LegacyEditRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/write/${id}/edit` : '/my-posts'} replace />
}

const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'community', element: withSuspense(<CommunityPage />) },
      { path: 'posts/:id', element: withSuspense(<PostDetailPage />) },
      {
        path: 'authors/:username',
        element: withSuspense(<AuthorProfilePage />),
      },
      {
        path: 'library',
        element: withSuspense(
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>,
        ),
      },
      { path: 'vault', element: <Navigate to="/library" replace /> },
      {
        path: 'my-posts',
        element: withSuspense(
          <ProtectedRoute>
            <MyPostsPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: 'write',
        element: withSuspense(
          <ProtectedRoute>
            <PostEditorPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: 'write/:id/edit',
        element: withSuspense(
          <ProtectedRoute>
            <PostEditorPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: 'account',
        element: withSuspense(
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>,
        ),
      },
      { path: 'dashboard', element: <Navigate to="/my-posts" replace /> },
      {
        path: 'dashboard/posts',
        element: <Navigate to="/my-posts" replace />,
      },
      {
        path: 'dashboard/posts/new',
        element: <Navigate to="/write" replace />,
      },
      {
        path: 'dashboard/posts/:id/edit',
        element: <LegacyEditRedirect />,
      },
      {
        path: 'dashboard/account',
        element: <Navigate to="/account" replace />,
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
  {
    path: 'login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: 'register',
    element: withSuspense(<RegisterPage />),
    errorElement: <RouteErrorPage />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
