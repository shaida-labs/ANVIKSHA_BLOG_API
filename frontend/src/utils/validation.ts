export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export interface LoginValues {
  email: string
  password: string
}

export interface RegistrationValues {
  username: string
  email: string
  password: string
}

export interface PostValues {
  title: string
  excerpt?: string
  content: string
  topic?: string
}

export interface ProfileValues {
  display_name: string
  bio: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9_.-]+$/

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const configuredMaximum = Number(import.meta.env.VITE_MAX_UPLOAD_MB)
export const MAX_COVER_IMAGE_MB =
  Number.isFinite(configuredMaximum) && configuredMaximum > 0
    ? configuredMaximum
    : 5

export function validateLogin(
  values: LoginValues,
): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {}
  const email = values.email.trim().toLowerCase()

  if (!email) {
    errors.email = 'Enter the email address for your account.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Enter your password.'
  } else if (values.password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.'
  }

  return errors
}

export function validateRegistration(
  values: RegistrationValues,
): FieldErrors<'username' | 'email' | 'password'> {
  const errors: FieldErrors<'username' | 'email' | 'password'> = {}
  const username = values.username.trim().toLowerCase()
  const email = values.email.trim().toLowerCase()

  if (!username) {
    errors.username = 'Choose a username.'
  } else if (username.length < 3 || username.length > 50) {
    errors.username = 'Username must be between 3 and 50 characters.'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      'Use lowercase letters, numbers, dots, underscores, or hyphens.'
  }

  if (!email) {
    errors.email = 'Enter your email address.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Choose a password.'
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (values.password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.'
  } else if (!/[A-Za-z]/.test(values.password)) {
    errors.password = 'Password must include at least one letter.'
  } else if (!/\d/.test(values.password)) {
    errors.password = 'Password must include at least one number.'
  }

  return errors
}

export function validateCoverImageFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
): string | null {
  const extension = file.name
    .slice(file.name.lastIndexOf('.'))
    .toLocaleLowerCase('en-US')

  if (file.size === 0) {
    return 'Choose an image that is not empty.'
  }

  if (file.size > MAX_COVER_IMAGE_MB * 1024 * 1024) {
    return `Image must be ${MAX_COVER_IMAGE_MB} MB or smaller.`
  }

  if (file.type) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return 'Use a JPEG, PNG, or WebP image.'
    }
  } else if (!ACCEPTED_IMAGE_EXTENSIONS.includes(extension)) {
    return 'Use a JPEG, PNG, or WebP image.'
  }

  return null
}

export async function hasValidCoverImageSignature(file: File): Promise<boolean> {
  let header: Uint8Array
  try {
    header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  } catch {
    return false
  }

  const isJpeg =
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  const isPng =
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  const isWebp =
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50

  return isJpeg || isPng || isWebp
}

export function validatePostForm(
  values: PostValues,
): FieldErrors<'title' | 'excerpt' | 'content' | 'topic'> {
  const errors: FieldErrors<'title' | 'excerpt' | 'content' | 'topic'> = {}
  const title = values.title.trim()
  const excerpt = values.excerpt?.trim() ?? ''
  const content = values.content.trim()
  const topic = values.topic?.trim() ?? ''

  if (!title) {
    errors.title = 'Add a title before saving.'
  } else if (title.length > 200) {
    errors.title = 'Title must be 200 characters or fewer.'
  }

  if (excerpt.length > 300) {
    errors.excerpt = 'Excerpt must be 300 characters or fewer.'
  }

  if (!content) {
    errors.content = 'Write some content before saving.'
  } else if (content.length > 50_000) {
    errors.content = 'Content must be 50,000 characters or fewer.'
  }

  if (topic.length > 60) {
    errors.topic = 'Topic must be 60 characters or fewer.'
  }

  return errors
}

export function validateProfile(
  values: ProfileValues,
): FieldErrors<'display_name' | 'bio'> {
  const errors: FieldErrors<'display_name' | 'bio'> = {}
  if (values.display_name.trim().length > 80) {
    errors.display_name = 'Display name must be 80 characters or fewer.'
  }
  if (values.bio.trim().length > 500) {
    errors.bio = 'Biography must be 500 characters or fewer.'
  }
  return errors
}

export function validateComment(content: string): string | null {
  if (!content.trim()) {
    return 'Write a comment before posting.'
  }
  if (content.length > 2_000) {
    return 'Comments must be 2,000 characters or fewer.'
  }
  return null
}

export function hasErrors<Field extends string>(
  errors: FieldErrors<Field>,
): boolean {
  return Object.values(errors).some(Boolean)
}
