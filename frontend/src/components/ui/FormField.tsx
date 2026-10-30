import { AlertCircle } from 'lucide-react'
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

import { cn } from '../../utils/cn'

const fieldBase =
  'w-full rounded-sm border bg-surface text-[0.95rem] text-ink placeholder:text-muted/75 transition-colors disabled:cursor-not-allowed disabled:bg-paper-strong disabled:text-muted'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
}

export function TextField({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold tracking-[-0.01em] text-ink"
        >
          {label}
        </label>
        {hint && (
          <span id={descriptionId} className="text-xs text-muted">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={fieldId}
          className={cn(
            fieldBase,
            'min-h-11 px-4 py-2.5 focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none',
            error ? 'border-wine' : 'border-line',
            trailing ? 'pr-12' : undefined,
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(hint && descriptionId, error && errorId) || undefined}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {trailing}
          </div>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-wine"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: TextareaFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  const errorId = `${fieldId}-error`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold tracking-[-0.01em] text-ink"
        >
          {label}
        </label>
        {hint && (
          <span id={descriptionId} className="text-xs text-muted">
            {hint}
          </span>
        )}
      </div>
      <textarea
        id={fieldId}
        className={cn(
          fieldBase,
          'min-h-32 resize-y px-4 py-3 leading-7 focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none',
          error ? 'border-wine' : 'border-line',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={cn(hint && descriptionId, error && errorId) || undefined}
        {...props}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-wine"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
