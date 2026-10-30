import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows an uploaded profile picture when one is available', () => {
    const { container } = render(
      <Avatar name="Alice" src="https://api.example.com/uploads/avatars/alice.png" />,
    )

    const image = container.querySelector('img')
    expect(image).toHaveAttribute(
      'src',
      'https://api.example.com/uploads/avatars/alice.png',
    )
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('falls back to the author initial when no picture is available', () => {
    render(<Avatar name="Alice" />)

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to the author initial when the picture fails to load', () => {
    const { container } = render(
      <Avatar name="Alice" src="https://api.example.com/uploads/avatars/alice.png" />,
    )

    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image as HTMLImageElement)

    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
