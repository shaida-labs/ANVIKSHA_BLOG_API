import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-accent bg-accent text-paper hover:border-ink hover:bg-ink',
  secondary:
    'border border-ink/20 bg-transparent text-ink hover:border-ink hover:bg-surface',
  ghost: 'border border-transparent text-ink hover:bg-paper-strong',
  subtle:
    'border border-transparent bg-accent-soft text-accent hover:bg-accent hover:text-paper',
  danger:
    'border border-wine bg-wine text-paper hover:border-[#632e28] hover:bg-[#632e28]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-sm',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-sm font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
}
