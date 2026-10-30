import { useState, type FormEvent } from 'react'
import {
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { AuthShell } from '../components/auth/AuthShell'
import { PasswordField } from '../components/auth/PasswordField'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/FormField'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getApiErrorMessage } from '../utils/apiErrors'
import { getSafeRedirect } from '../utils/redirect'
import {
  hasErrors,
  validateRegistration,
  type FieldErrors,
} from '../utils/validation'

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { register, status } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const redirectTo = getSafeRedirect(next)

  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<
    FieldErrors<'username' | 'email' | 'password'>
  >({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    setServerError(null)

    if (hasErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        username: values.username.trim().toLowerCase(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          'Registration failed. Please check your details and try again.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginHref = next
    ? `/login?next=${encodeURIComponent(redirectTo)}`
    : '/login'

  return (
    <AuthShell
      eyebrow="New membership"
      title="Create your account."
      description="A quiet place to publish your work and respond."
      alternatePrompt="Already have an account?"
      alternateLabel="Sign in"
      alternateTo={loginHref}
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          value={values.username}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              username: event.target.value,
            }))
            setErrors((current) => ({ ...current, username: undefined }))
          }}
          error={errors.username}
          hint="3–50 characters"
          placeholder="your_username"
        />
        <TextField
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => {
            setValues((current) => ({ ...current, email: event.target.value }))
            setErrors((current) => ({ ...current, email: undefined }))
          }}
          error={errors.email}
          placeholder="you@example.com"
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
            setErrors((current) => ({ ...current, password: undefined }))
          }}
          error={errors.password}
          hint="8+ characters with a letter and number"
          placeholder="Choose a password"
        />
        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
