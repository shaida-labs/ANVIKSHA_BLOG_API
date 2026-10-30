import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PostCover } from './PostCover'

const baseProps = {
  postId: 1,
  title: 'Python at scale',
  authorName: 'alice',
  createdAt: '2026-10-01T12:00:00Z',
}

describe('PostCover', () => {
  it('renders a real cover image with meaningful alt text', () => {
    render(
      <PostCover
        {...baseProps}
        coverUrl="https://cdn.example.com/covers/python.jpg"
      />,
    )

    const image = screen.getByRole('img', {
      name: 'Cover image for Python at scale',
    })
    expect(image).toHaveAttribute(
      'src',
      'https://cdn.example.com/covers/python.jpg',
    )
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveClass('object-cover')
  })

  it('loads the featured image eagerly', () => {
    render(
      <PostCover
        {...baseProps}
        coverUrl="https://cdn.example.com/covers/python.jpg"
        featured
      />,
    )

    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
  })

  it('renders the editorial placeholder when no image is set', () => {
    render(<PostCover {...baseProps} coverUrl={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('ANVIKSHA')).toBeInTheDocument()
    expect(screen.getByText('From the journal')).toBeInTheDocument()
  })

  it('falls back to the placeholder when the image fails to load', () => {
    render(
      <PostCover
        {...baseProps}
        coverUrl="https://cdn.example.com/broken.jpg"
      />,
    )

    fireEvent.error(screen.getByRole('img'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('ANVIKSHA')).toBeInTheDocument()
  })

  it('tries a new image after the URL changes', () => {
    const { rerender } = render(
      <PostCover {...baseProps} coverUrl="https://cdn.example.com/old.jpg" />,
    )
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    rerender(
      <PostCover {...baseProps} coverUrl="https://cdn.example.com/new.jpg" />,
    )

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/new.jpg',
    )
  })
})
