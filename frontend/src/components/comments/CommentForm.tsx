import { AlertCircle, ArrowUpRight } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import { validateComment } from '../../utils/validation'
import { Alert } from '../ui/Alert'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const { user } = useAuth()
  const textareaId = useId()
  const errorId = `${textareaId}-error`
  const countId = `${textareaId}-count`
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const authorName = user ? getAuthorName(user) : 'Reader'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateComment(content)
    setError(validationError)
    setSubmitError(null)

    if (validationError) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch (submitFailure) {
      setSubmitError(
        getApiErrorMessage(
          submitFailure,
          'Your response could not be posted. Please try again.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="border border-line bg-surface shadow-soft"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex items-center gap-3 border-b border-line bg-paper-strong/40 px-5 py-4 sm:px-6">
        <Avatar
          name={authorName}
          src={resolveMediaUrl(user?.avatar_path)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-[-0.01em] text-ink">
            Add a response
          </p>
          <p className="mt-0.5 truncate text-[0.65rem] text-muted">
            Writing as {authorName}
            {user ? ` · @${user.username}` : ''}
          </p>
        </div>
        <span
          className="font-display text-3xl italic leading-none text-accent/35"
          aria-hidden="true"
        >
          “
        </span>
      </div>

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {submitError && (
          <Alert tone="error" className="mb-4">
            {submitError}
          </Alert>
        )}

        <label htmlFor={textareaId} className="sr-only">
          Your response
        </label>
        <textarea
          id={textareaId}
          name="comment"
          value={content}
          maxLength={2000}
          rows={5}
          onChange={(event) => {
            setContent(event.target.value)
            setError(null)
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={`${countId}${error ? ` ${errorId}` : ''}`}
          placeholder="What stayed with you? Begin with a thought…"
          className="min-h-[10rem] w-full resize-y border-0 bg-transparent p-0 font-display text-[1.18rem] leading-8 text-ink placeholder:text-muted/60 focus:outline-none"
          disabled={isSubmitting}
        />

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-2 flex items-start gap-1.5 text-xs font-medium text-wine"
          >
            <AlertCircle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p
            id={countId}
            className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            {content.length} / 2,000 · Considered responses only
          </p>
          <Button type="submit" size="md" isLoading={isSubmitting}>
            Post response
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </form>
  )
}
