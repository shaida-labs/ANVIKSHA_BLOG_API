import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { API_BASE_URL } from '../../api/client'
import { uploadCoverImage } from '../../api/uploads'
import type { UploadedImage } from '../../types/api'
import { CoverImageUploadField } from './CoverImageUploadField'

vi.mock('../../api/uploads', () => ({
  uploadCoverImage: vi.fn(),
}))

const uploadMock = vi.mocked(uploadCoverImage)
const uploaded: UploadedImage = {
  path: 'covers/2026/10/uploaded.png',
  url: '/uploads/covers/2026/10/uploaded.png',
  content_type: 'image/png',
  size: 1024,
  width: 1200,
  height: 675,
}

function imageBytes(signature: number[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(1024)
  bytes.set(signature)
  return bytes
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP_SIGNATURE = [
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]

function Harness({
  initialValue = null,
  onChange,
}: {
  initialValue?: string | null
  onChange?: (path: string | null) => void
}) {
  const [value, setValue] = useState<string | null>(initialValue)
  return (
    <CoverImageUploadField
      value={value}
      onChange={(path) => {
        setValue(path)
        onChange?.(path)
      }}
    />
  )
}

describe('CoverImageUploadField', () => {
  beforeEach(() => {
    uploadMock.mockReset()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:cover-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the empty drop zone and real file picker', () => {
    render(<Harness />)

    expect(
      screen.getByRole('button', { name: /Drop an image here/i }),
    ).toBeInTheDocument()
    const input = screen.getByLabelText('Choose a cover image')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })

  it('uploads a selected image and stores the returned relative path', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    uploadMock.mockImplementation(async (_file, options) => {
      options?.onProgress?.(55)
      return uploaded
    })

    render(<Harness onChange={onChange} />)
    const file = new File([imageBytes(PNG_SIGNATURE)], 'cover.png', {
      type: 'image/png',
    })

    await user.upload(screen.getByLabelText('Choose a cover image'), file)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(uploaded.path)
    })
    await waitFor(() => {
      expect(
        screen.getByRole('img', { name: 'Cover image preview' }),
      ).toHaveAttribute(
        'src',
        `${API_BASE_URL}/uploads/covers/2026/10/uploaded.png`,
      )
    })
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover-preview')
  })

  it('rejects an unsupported file before calling the API', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<Harness />)
    const file = new File([new Uint8Array(32)], 'animation.gif', {
      type: 'image/gif',
    })

    await user.upload(screen.getByLabelText('Choose a cover image'), file)

    expect(
      await screen.findByText('Use a JPEG, PNG, or WebP image.'),
    ).toBeInTheDocument()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects fake image bytes before calling the API', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const file = new File([new Uint8Array(64)], 'not-really-an-image.png', {
      type: 'image/png',
    })

    await user.upload(screen.getByLabelText('Choose a cover image'), file)

    expect(
      await screen.findByText('Use a JPEG, PNG, or WebP image.'),
    ).toBeInTheDocument()
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('shows a real upload error and keeps the empty state', async () => {
    const user = userEvent.setup()
    uploadMock.mockRejectedValue(new Error('Upload failed at the API.'))
    render(<Harness />)
    const file = new File([imageBytes(WEBP_SIGNATURE)], 'cover.webp', {
      type: 'image/webp',
    })

    await user.upload(screen.getByLabelText('Choose a cover image'), file)

    expect(
      await screen.findByText('Upload failed at the API.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Drop an image here/i }),
    ).toBeInTheDocument()
  })

  it('removes an existing cover and reports a null path', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        initialValue="covers/2026/10/existing.jpg"
        onChange={onChange}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Cover image preview' }),
    ).toHaveAttribute(
      'src',
      `${API_BASE_URL}/uploads/covers/2026/10/existing.jpg`,
    )

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(onChange).toHaveBeenCalledWith(null)
    expect(
      screen.getByRole('button', { name: /Drop an image here/i }),
    ).toBeInTheDocument()
  })
})
