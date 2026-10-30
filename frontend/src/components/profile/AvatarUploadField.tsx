import { Camera, Trash2 } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { removeAvatar, uploadAvatar } from '../../api/profiles'
import type { User } from '../../types/api'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { getAuthorName } from '../../utils/format'
import { resolveMediaUrl } from '../../utils/media'
import {
  MAX_COVER_IMAGE_MB,
  hasValidCoverImageSignature,
  validateCoverImageFile,
} from '../../utils/validation'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/ToastProvider'

interface AvatarUploadFieldProps {
  user: User
  onUpdated: (user: User) => void
}

export function AvatarUploadField({ user, onUpdated }: AvatarUploadFieldProps) {
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const publicName = getAuthorName(user)
  const currentAvatar = resolveMediaUrl(user.avatar_path)
  const isBusy = isUploading || isRemoving

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const releasePreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl(null)
  }

  const handleFile = async (file: File) => {
    setError(null)
    const validationError = validateCoverImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!(await hasValidCoverImageSignature(file))) {
      setError('Use a JPEG, PNG, or WebP image.')
      return
    }

    releasePreview()
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)
    setIsUploading(true)

    try {
      const updated = await uploadAvatar(file)
      onUpdated(updated)
      showToast('Your profile picture has been updated.')
    } catch (uploadError) {
      setError(
        getApiErrorMessage(
          uploadError,
          'Your profile picture could not be uploaded.',
        ),
      )
    } finally {
      setIsUploading(false)
      releasePreview()
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      void handleFile(file)
    }
  }

  const handleRemove = async () => {
    setError(null)
    setIsRemoving(true)
    try {
      const updated = await removeAvatar()
      onUpdated(updated)
      showToast('Your profile picture has been removed.', 'info')
    } catch (removeError) {
      setError(
        getApiErrorMessage(
          removeError,
          'Your profile picture could not be removed.',
        ),
      )
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a profile picture"
        onChange={handleInputChange}
        disabled={isBusy}
      />

      <div className="relative">
        <Avatar
          name={publicName}
          src={previewUrl ?? currentAvatar}
          size="lg"
          className="size-24 text-2xl shadow-soft sm:size-28"
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-paper">
            <Spinner className="size-5" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          isLoading={isUploading}
        >
          <Camera className="size-3.5" aria-hidden="true" />
          {user.avatar_path ? 'Change picture' : 'Add picture'}
        </Button>
        {user.avatar_path && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isBusy}
            isLoading={isRemoving}
            className="text-wine hover:bg-wine/5"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>

      <div>
        <p className="text-xs leading-5 text-muted">
          JPEG, PNG, or WebP · up to {MAX_COVER_IMAGE_MB} MB
        </p>
        {error && (
          <p role="alert" className="mt-2 max-w-xs text-xs font-medium text-wine">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
