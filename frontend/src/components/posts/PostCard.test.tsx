import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { API_BASE_URL } from '../../api/client'
import { ToastProvider } from '../../components/ui/ToastProvider'
import { AuthProvider } from '../../contexts/AuthProvider'
import type { Post } from '../../types/api'
import { PostCard } from './PostCard'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 7,
    title: 'Database indexes, explained',
    excerpt: null,
    content:
      'Indexes make reads fast, but they are not free. Here is how to choose them carefully.',
    topic: 'Engineering',
    cover_image_path: 'covers/2026/10/database.png',
    cover_image_url: null,
    comment_count: 3,
    like_count: 2,
    liked_by_me: false,
    bookmarked_by_me: false,
    author_id: 1,
    author: { id: 1, username: 'alice', display_name: null, avatar_path: null },
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    ...overrides,
  }
}

function renderCard(post: Post) {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter>
          <PostCard post={post} />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

describe('PostCard', () => {
  it('renders an uploaded cover image resolved against the API base URL', () => {
    renderCard(makePost())

    const image = screen.getByRole('img', {
      name: 'Cover image for Database indexes, explained',
    })
    expect(image).toHaveAttribute(
      'src',
      `${API_BASE_URL}/uploads/covers/2026/10/database.png`,
    )
  })

  it('falls back to a legacy remote cover URL', () => {
    renderCard(
      makePost({
        cover_image_path: null,
        cover_image_url: 'https://cdn.example.com/covers/database.jpg',
      }),
    )

    expect(
      screen.getByRole('img', {
        name: 'Cover image for Database indexes, explained',
      }),
    ).toHaveAttribute('src', 'https://cdn.example.com/covers/database.jpg')
  })

  it('shows the real comment count and an editorial placeholder without a cover', () => {
    renderCard(
      makePost({
        cover_image_path: null,
        cover_image_url: null,
        comment_count: 2,
      }),
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('ANVIKSHA')).toBeInTheDocument()
    expect(screen.getByLabelText('2 comments')).toHaveTextContent('2')
  })

  it('links the author and topic to real discovery pages', () => {
    renderCard(makePost())

    expect(screen.getByRole('link', { name: 'alice' })).toHaveAttribute(
      'href',
      '/authors/alice',
    )
    expect(screen.getByRole('link', { name: 'Engineering' })).toHaveAttribute(
      'href',
      '/?topic=Engineering',
    )
  })
})
