import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../utils/cn'

type AlertTone = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  tone?: AlertTone
  title?: string
  children: ReactNode
  className?: string
}

const toneClasses: Record<AlertTone, string> = {
  error: 'border-wine/25 bg-wine/[0.055] text-wine',
  success: 'border-sage/25 bg-sage/[0.08] text-sage',
  info: 'border-accent/20 bg-accent-soft text-accent',
  warning: 'border-ochre/25 bg-ochre/[0.07] text-ochre',
}

const toneIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: AlertProps) {
  const Icon = toneIcons[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 border px-4 py-3 text-sm leading-6',
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  )
}
