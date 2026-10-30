import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkdownRenderer } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders sanitized Markdown with heading ids and highlighted code', () => {
    const { container } = render(
      <MarkdownRenderer
        content={[
          '## A safe heading',
          '',
          '<script>alert("unsafe")</script>',
          '',
          'A [link](https://example.com) and **strong text**.',
          '',
          '```ts',
          'const answer: number = 42',
          '```',
        ].join('\n')}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'A safe heading' }),
    ).toHaveAttribute('id', 'a-safe-heading')
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'link' }),
    ).toHaveAttribute('href', 'https://example.com')
    expect(screen.getByText('ts')).toBeInTheDocument()
    expect(container.querySelector('code')).toHaveTextContent(
      'const answer: number = 42',
    )
  })

  it('keeps duplicate heading ids aligned with the table of contents', () => {
    const { container } = render(
      <MarkdownRenderer
        content={['## Same heading', '', 'Text.', '', '## Same heading'].join(
          '\n',
        )}
      />,
    )

    const headings = container.querySelectorAll('h2')
    expect(headings[0]).toHaveAttribute('id', 'same-heading')
    expect(headings[1]).toHaveAttribute('id', 'same-heading-1')
  })
})
