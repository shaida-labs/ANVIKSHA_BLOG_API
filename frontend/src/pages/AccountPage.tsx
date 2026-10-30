import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleUserRound,
  FileText,
  LogOut,
  Mail,
  PenLine,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { updateProfile } from '../api/profiles'
import { AvatarUploadField } from '../components/profile/AvatarUploadField'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { buttonStyles, Button } from '../components/ui/Button'
import { TextField, TextareaField } from '../components/ui/FormField'
import { useToast } from '../components/ui/ToastProvider'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getApiErrorMessage } from '../utils/apiErrors'
import {
  formatFullDate,
  formatMonthAndYear,
  getAuthorName,
} from '../utils/format'
import { resolveMediaUrl } from '../utils/media'
import {
  hasErrors,
  validateProfile,
  type FieldErrors,
} from '../utils/validation'

export function AccountPage() {
  useDocumentTitle('Your account')
  const { user, logout, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<'display_name' | 'bio'>
  >({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDisplayName(user?.display_name ?? '')
    setBio(user?.bio ?? '')
  }, [user?.bio, user?.display_name, user?.id])

  if (!user) {
    return null
  }

  const publicName = getAuthorName(user)
  const isDirty =
    displayName !== (user.display_name ?? '') || bio !== (user.bio ?? '')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateProfile({
      display_name: displayName,
      bio,
    })
    setFieldErrors(nextErrors)
    setSaveError(null)
    if (hasErrors(nextErrors)) {
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      updateUser(updated)
      setDisplayName(updated.display_name ?? '')
      setBio(updated.bio ?? '')
      showToast('Your public profile has been updated.')
    } catch (error) {
      setSaveError(
        getApiErrorMessage(error, 'Your profile could not be updated.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">My page · Account</p>
        <h1 className="mt-3 font-display text-[clamp(2.7rem,6vw,5rem)] font-medium leading-[0.94] tracking-[-0.05em] text-ink">
          The person behind the work.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          The identity used for your stories and comments across ANVIKSHA.
        </p>
      </header>

      <section
        aria-labelledby="public-profile-heading"
        className="mt-9 border-y border-line py-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="eyebrow">Public profile</p>
            <h2
              id="public-profile-heading"
              className="mt-2 font-display text-3xl font-medium tracking-[-0.03em] text-ink"
            >
              How readers see you
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Add a profile picture, display name, and short biography. These
              appear beside your stories, comments, and public author page.
            </p>
          </div>
          <Link
            to={`/authors/${user.username}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-colors hover:text-accent"
          >
            View public profile
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <AvatarUploadField user={user} onUpdated={updateUser} />

          <form onSubmit={handleProfileSubmit} noValidate className="grid gap-5">
            <TextField
              label="Display name"
              value={displayName}
              maxLength={80}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setFieldErrors((current) => ({
                  ...current,
                  display_name: undefined,
                }))
              }}
              placeholder={user.username}
              hint={`${displayName.length} / 80`}
              error={fieldErrors.display_name}
            />
            <TextareaField
              label="Biography"
              value={bio}
              maxLength={500}
              rows={4}
              onChange={(event) => {
                setBio(event.target.value)
                setFieldErrors((current) => ({ ...current, bio: undefined }))
              }}
              placeholder="What do you think about, study, or make?"
              hint={`${bio.length} / 500`}
              error={fieldErrors.bio}
            />
            {saveError && (
              <Alert tone="error" title="Profile not saved">
                <p>{saveError}</p>
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                isLoading={isSaving}
                disabled={!isDirty || isSaving}
              >
                <Save className="size-4" aria-hidden="true" />
                Save profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!isDirty || isSaving}
                onClick={() => {
                  setDisplayName(user.display_name ?? '')
                  setBio(user.bio ?? '')
                  setFieldErrors({})
                  setSaveError(null)
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </div>
      </section>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-labelledby="profile-heading"
          className="self-start border-y border-line"
        >
          <div className="flex items-center gap-4 border-b border-line py-5 sm:py-6">
            <Avatar
              name={publicName}
              src={resolveMediaUrl(user.avatar_path)}
              size="lg"
              className="size-14 text-base"
            />
            <div className="min-w-0">
              <h2
                id="profile-heading"
                className="font-display text-3xl font-medium tracking-[-0.03em] text-ink"
              >
                {publicName}
              </h2>
              <p className="truncate text-xs text-muted">
                @{user.username} · {user.email}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-line">
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="eyebrow flex items-center gap-2">
                <CircleUserRound className="size-3.5" aria-hidden="true" />
                Username
              </dt>
              <dd className="text-sm font-medium text-ink">@{user.username}</dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="eyebrow flex items-center gap-2">
                <Mail className="size-3.5" aria-hidden="true" />
                Email
              </dt>
              <dd className="break-all text-sm font-medium text-ink">
                {user.email}
              </dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="eyebrow flex items-center gap-2">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Member since
              </dt>
              <dd className="text-sm font-medium text-ink">
                {formatMonthAndYear(user.created_at)}
                <span className="ml-2 text-xs font-normal text-muted">
                  ({formatFullDate(user.created_at)})
                </span>
              </dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="eyebrow flex items-center gap-2">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Status
              </dt>
              <dd className="flex items-center gap-2 text-sm font-medium text-ink">
                <span
                  className={
                    user.is_active
                      ? 'size-2 rounded-full bg-sage'
                      : 'size-2 rounded-full bg-wine'
                  }
                  aria-hidden="true"
                />
                {user.is_active ? 'Active account' : 'Inactive account'}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-6">
          <div className="border-t border-line pt-5">
            <p className="eyebrow">Your writing</p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Your stories are public as soon as you publish them. You can edit
              or remove them from your page at any time.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/my-posts"
                className={buttonStyles({
                  variant: 'secondary',
                  size: 'sm',
                  className: 'w-full',
                })}
              >
                <FileText className="size-3.5" aria-hidden="true" />
                My page
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link
                to="/write"
                className={buttonStyles({
                  variant: 'primary',
                  size: 'sm',
                  className: 'w-full',
                })}
              >
                <PenLine className="size-3.5" aria-hidden="true" />
                Compose
              </Link>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <p className="eyebrow">Session</p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              You are signed in to this browser tab.
            </p>
            <details className="mt-3 text-xs leading-5 text-muted">
              <summary className="cursor-pointer list-none text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent">
                About this session
              </summary>
              <p className="mt-2">
                You are signed in to this browser tab. Closing it signs you out,
                and you will need to sign in again next time.
              </p>
            </details>
          </div>

          <div className="border-t border-line pt-5">
            <Button
              variant="ghost"
              className="w-full justify-start text-wine hover:bg-wine/5"
              onClick={handleLogout}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
