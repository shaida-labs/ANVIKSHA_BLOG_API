import {
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

import { uploadCoverImage } from '../../api/uploads'
import type { UploadedImage } from '../../types/api'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { cn } from '../../utils/cn'
import { resolveMediaUrl } from '../../utils/media'
import {
  MAX_COVER_IMAGE_MB,
  hasValidCoverImageSignature,
  validateCoverImageFile,
} from '../../utils/validation'
import { Spinner } from '../ui/Spinner'

interface CoverImageUploadFieldProps {
  value: string | null
  initialImageUrl?: string | null
  onChange: (path: string | null) => void
  onUploadingChange?: (isUploading: boolean) => void
  error?: string
  disabled?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CoverImageUploadField({
  value,
  initialImageUrl,
  onChange,
  onUploadingChange,
  error,
  disabled = false,
}: CoverImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [fileMeta, setFileMeta] = useState<{
    name: string
    size: number
  } | null>(null)
  const [uploadedMeta, setUploadedMeta] = useState<UploadedImage | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [removedInitial, setRemovedInitial] = useState(false)

  const storedUrl = value
    ? resolveMediaUrl(value)
    : removedInitial
      ? null
      : initialImageUrl?.trim() || null
  const displayUrl = localPreview ?? storedUrl
  const displayedError = error ?? uploadError
  const isDisabled = disabled || isUploading

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      releaseObjectUrl()
    }
  }, [])

  const openPicker = () => {
    if (!isDisabled) {
      inputRef.current?.click()
    }
  }

  const uploadFile = async (file: File) => {
    const validationError = validateCoverImageFile(file)
    setUploadError(validationError)
    setUploadedMeta(null)
    if (validationError) {
      return
    }

    if (!(await hasValidCoverImageSignature(file))) {
      setUploadError('Use a JPEG, PNG, or WebP image.')
      return
    }

    abortRef.current?.abort()
    releaseObjectUrl()
    const controller = new AbortController()
    abortRef.current = controller

    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setLocalPreview(objectUrl)
    setFileMeta({ name: file.name, size: file.size })
    setProgress(0)
    setIsUploading(true)
    onUploadingChange?.(true)

    try {
      const uploaded = await uploadCoverImage(file, {
        signal: controller.signal,
        onProgress: setProgress,
      })
      if (controller.signal.aborted) {
        return
      }
      onChange(uploaded.path)
      setUploadedMeta(uploaded)
      setProgress(100)
      setUploadError(null)
      setRemovedInitial(false)
      releaseObjectUrl()
      setLocalPreview(null)
    } catch (uploadFailure) {
      if (controller.signal.aborted) {
        return
      }
      releaseObjectUrl()
      setLocalPreview(null)
      setFileMeta(null)
      setProgress(0)
      setUploadError(
        getApiErrorMessage(
          uploadFailure,
          'The image could not be uploaded. Please try again.',
        ),
      )
    } finally {
      if (!controller.signal.aborted) {
        setIsUploading(false)
        onUploadingChange?.(false)
      }
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      void uploadFile(file)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (isDisabled) {
      return
    }
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void uploadFile(file)
    }
  }

  const handleRemove = () => {
    abortRef.current?.abort()
    releaseObjectUrl()
    setLocalPreview(null)
    setFileMeta(null)
    setUploadedMeta(null)
    setProgress(0)
    setIsUploading(false)
    setUploadError(null)
    setRemovedInitial(true)
    onChange(null)
    onUploadingChange?.(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Cover image</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Optional · JPEG, PNG, or WebP · up to {MAX_COVER_IMAGE_MB} MB
          </p>
        </div>
        {displayUrl && (
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted">
            16:9 preview
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a cover image"
        onChange={handleInputChange}
        disabled={isDisabled}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!isDisabled) {
            setIsDragging(true)
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border bg-surface transition-colors',
          isDragging ? 'border-accent' : 'border-line',
          displayedError && 'border-wine/60',
        )}
      >
        {displayUrl ? (
          <div className="relative aspect-video overflow-hidden bg-paper-strong">
            <img
              src={displayUrl}
              alt="Cover image preview"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/55 px-6 text-paper">
                <Spinner className="size-5" />
                <p
                  className="mt-3 text-xs font-semibold uppercase tracking-[0.16em]"
                  role="status"
                  aria-live="polite"
                >
                  Uploading {progress}%
                </p>
                <div className="mt-3 h-1 w-full max-w-56 bg-paper/25">
                  <div
                    className="h-full bg-paper transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {!isUploading && (
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-ink/75 px-3 py-2.5 text-paper">
                <p className="min-w-0 truncate text-[0.68rem]">
                  {fileMeta?.name ?? 'Current cover image'}
                  {uploadedMeta
                    ? ` · ${uploadedMeta.width}×${uploadedMeta.height}`
                    : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openPicker}
                    disabled={isDisabled}
                    className="inline-flex min-h-8 items-center gap-1.5 px-2.5 text-[0.68rem] font-semibold transition-colors hover:text-accent-soft disabled:opacity-50"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isDisabled}
                    className="inline-flex min-h-8 items-center gap-1.5 px-2.5 text-[0.68rem] font-semibold transition-colors hover:text-accent-soft disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            disabled={isDisabled}
            className="flex min-h-52 w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors hover:bg-paper-strong/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex size-12 items-center justify-center border border-line bg-paper text-accent">
              <UploadCloud className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-ink">
              Drop an image here, or choose a file
            </span>
            <span className="max-w-sm text-xs leading-5 text-muted">
              Give the story a face. Your cover will be cropped to 16:9 without
              stretching.
            </span>
          </button>
        )}

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-accent bg-accent-soft/80">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <ImageIcon className="size-4" aria-hidden="true" />
              Drop to upload
            </p>
          </div>
        )}
      </div>

      {displayedError ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium leading-5 text-wine"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {displayedError}
        </p>
      ) : displayUrl ? (
        <p className="text-xs leading-5 text-muted">
          Your cover will be cropped to 16:9 without stretching.
        </p>
      ) : null}

      {fileMeta && isUploading && (
        <p className="text-xs text-muted" aria-live="polite">
          Uploading {fileMeta.name} ({formatFileSize(fileMeta.size)})
        </p>
      )}
    </div>
  )
}
