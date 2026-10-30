import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

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
  validateLogin,
  type FieldErrors,
} from '../utils/validation'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const redirectTo = getSafeRedirect(next)

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setServerError(null)

    if (hasErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)
    try {
      await login(values.email.trim().toLowerCase(), values.password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          'Sign in failed. Check your email and password.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const registerHref = next
    ? `/register?next=${encodeURIComponent(redirectTo)}`
    : '/register'

  return (
    <AuthShell
      eyebrow="Member access"
      title="Welcome back."
      description="Sign in to write, edit, and respond."
      alternatePrompt="New to ANVIKSHA?"
      alternateLabel="Create an account"
      alternateTo={registerHref}
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}
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
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
            setErrors((current) => ({ ...current, password: undefined }))
          }}
          error={errors.password}
          placeholder="Enter your password"
        />
        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
        >
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
