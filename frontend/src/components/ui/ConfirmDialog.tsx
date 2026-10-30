import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  isProcessing?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isProcessing = false,
  onConfirm,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="w-[min(92vw,32rem)] rounded-sm border border-line bg-surface p-0 text-ink shadow-soft"
      onCancel={(event) => {
        event.preventDefault()
        if (!isProcessing) {
          onOpenChange(false)
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onOpenChange(false)
        }
      }}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Please confirm</p>
            <h2
              id={titleId}
              className="font-display text-2xl font-medium tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="-mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper-strong hover:text-ink"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isProcessing}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
