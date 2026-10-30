import {
  Bookmark,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  PenLine,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { currentYear, getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { Avatar } from '../ui/Avatar'
import { Brand } from './Brand'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative py-2 text-sm font-semibold tracking-[-0.01em] transition-colors',
    isActive
      ? 'text-ink after:absolute after:inset-x-0 after:-bottom-[1.35rem] after:h-px after:bg-accent'
      : 'text-ink-soft hover:text-accent',
  )

const quietNavLinkClasses =
  'relative py-2 text-sm font-semibold tracking-[-0.01em] text-ink-soft transition-colors hover:text-accent'

const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center border-b border-line/70 px-1 text-sm font-semibold transition-colors',
    isActive ? 'text-accent' : 'text-ink-soft hover:text-accent',
  )

const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date())

export function SiteHeader() {
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setProfileOpen(false)
      }
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchInput.trim()
    navigate({
      pathname: '/',
      search: query ? `?q=${encodeURIComponent(query)}` : '',
      hash: '#journal',
    })
  }

  const handleLogout = () => {
    logout()
    setProfileOpen(false)
    navigate('/login', { replace: true })
  }

  const authenticatedUser = status === 'authenticated' ? user : null
  const authenticatedName = authenticatedUser
    ? getAuthorName(authenticatedUser)
    : ''
  const authenticatedAvatar = resolveMediaUrl(authenticatedUser?.avatar_path)

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-paper">
      <div className="border-b border-paper/10 bg-ink text-paper">
        <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-between gap-4 px-5 py-1.5 sm:px-8 lg:px-10">
          <p className="flex min-w-0 items-center gap-2 text-[0.56rem] font-semibold uppercase tracking-[0.2em] text-paper/75 sm:text-[0.6rem]">
            <span
              className="size-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span className="truncate">
              An independent journal of considered thought
            </span>
          </p>
          <p className="hidden text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-paper/55 sm:block">
            {todayLabel}
          </p>
          <p className="hidden text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-paper/55 md:block">
            Vol. I · {currentYear}
          </p>
        </div>
      </div>

      <div className="mx-auto flex min-h-[4.8rem] max-w-7xl items-center gap-4 px-5 py-2 sm:px-8 lg:gap-7 lg:px-10">
        <Brand className="shrink-0" />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-6 xl:flex"
        >
          <NavLink to="/" end className={navLinkClasses}>
            Stories
          </NavLink>
          <Link to="/#threads" className={quietNavLinkClasses}>
            Topics
          </Link>
          <NavLink to="/community" className={navLinkClasses}>
            Community
          </NavLink>
          {authenticatedUser && (
            <NavLink to="/my-posts" className={navLinkClasses}>
              My page
            </NavLink>
          )}
          <Link to="/#premise" className={quietNavLinkClasses}>
            About
          </Link>
        </nav>

        <form
          role="search"
          onSubmit={submitSearch}
          className="ml-auto hidden w-full max-w-[14.5rem] items-center border-b border-line pb-1 focus-within:border-accent xl:flex"
        >
          <label htmlFor="header-search" className="sr-only">
            Search stories
          </label>
          <Search
            className="ml-3 size-4 shrink-0 text-muted"
            aria-hidden="true"
          />
          <input
            id="header-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search stories"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-xs text-ink placeholder:text-muted/75 focus:outline-none"
          />
        </form>

        <div className="ml-auto hidden items-center gap-3 xl:flex xl:ml-0">
          {authenticatedUser ? (
            <>
              <Link
                to="/write"
                className="inline-flex min-h-10 items-center gap-2 bg-ink px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-accent"
              >
                <PenLine className="size-3.5" aria-hidden="true" />
                Compose
              </Link>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 border border-transparent px-1.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-line hover:text-ink"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileOpen((value) => !value)}
                >
                  <Avatar
                    name={authenticatedName}
                    src={authenticatedAvatar}
                    size="sm"
                  />
                  <span className="max-w-28 truncate">
                    {authenticatedName}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform',
                      profileOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
                {profileOpen && (
                  <div
                    role="menu"
                    aria-label="Account menu"
                    className="absolute right-0 top-[calc(100%+0.55rem)] w-56 border border-line bg-surface p-1.5 shadow-soft"
                  >
                    <Link
                      role="menuitem"
                      to="/my-posts"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-strong hover:text-ink"
                    >
                      <FileText className="size-4" aria-hidden="true" />
                      My page
                    </Link>
                    <Link
                      role="menuitem"
                      to="/library"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-strong hover:text-ink"
                    >
                      <Bookmark className="size-4" aria-hidden="true" />
                      Library
                    </Link>
                    <Link
                      role="menuitem"
                      to={`/authors/${authenticatedUser.username}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-strong hover:text-ink"
                    >
                      <UserRound className="size-4" aria-hidden="true" />
                      Public profile
                    </Link>
                    <Link
                      role="menuitem"
                      to="/account"
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-strong hover:text-ink"
                    >
                      <UserRound className="size-4" aria-hidden="true" />
                      Account
                    </Link>
                    <div className="my-1 h-px bg-line" aria-hidden="true" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-paper-strong hover:text-wine"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClasses}>
                Sign in
              </NavLink>
              <Link
                to="/register"
                className="inline-flex min-h-10 items-center border border-ink/25 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface"
              >
                Join ANVIKSHA
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto flex size-10 items-center justify-center border border-line text-ink transition-colors hover:bg-surface xl:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-line bg-paper px-5 pb-6 pt-4 xl:hidden"
        >
          <form role="search" onSubmit={submitSearch} className="mb-3">
            <label htmlFor="mobile-search" className="sr-only">
              Search stories
            </label>
            <div className="flex items-center border border-line bg-surface focus-within:border-accent">
              <Search
                className="ml-3 size-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="mobile-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search stories"
                className="min-w-0 flex-1 bg-transparent px-2.5 py-3 text-sm text-ink placeholder:text-muted/75 focus:outline-none"
              />
              <button
                type="submit"
                className="m-1 bg-ink px-3.5 py-2 text-xs font-semibold text-paper"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-col">
            <NavLink to="/" end className={mobileLinkClasses}>
              Stories
            </NavLink>
            <Link
              to="/#threads"
              className={mobileLinkClasses({ isActive: false })}
            >
              Topics
            </Link>
            <NavLink to="/community" className={mobileLinkClasses}>
              Community
            </NavLink>
            <Link
              to="/#premise"
              className={mobileLinkClasses({ isActive: false })}
            >
              About
            </Link>
            {authenticatedUser ? (
              <>
                <NavLink to="/my-posts" className={mobileLinkClasses}>
                  My page
                </NavLink>
                <NavLink to="/library" className={mobileLinkClasses}>
                  Library
                </NavLink>
                <NavLink
                  to={`/authors/${authenticatedUser.username}`}
                  className={mobileLinkClasses}
                >
                  Public profile
                </NavLink>
                <NavLink to="/account" className={mobileLinkClasses}>
                  Account
                </NavLink>
                <div className="mt-5 flex items-center gap-3 border border-line bg-surface p-3">
                  <Avatar
                    name={authenticatedName}
                    src={authenticatedAvatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {authenticatedName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      @{authenticatedUser.username}
                    </p>
                  </div>
                </div>
                <Link
                  to="/write"
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-4 py-2.5 text-sm font-semibold text-paper"
                >
                  <PenLine className="size-4" aria-hidden="true" />
                  Compose a story
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={mobileLinkClasses}>
                  Sign in
                </NavLink>
                <Link
                  to="/register"
                  className="mt-4 inline-flex min-h-11 items-center justify-center border border-ink/25 px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
