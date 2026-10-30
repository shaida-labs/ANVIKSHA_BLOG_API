import { useEffect, useState } from 'react'

import { cn } from '../../utils/cn'
import type { MarkdownHeading } from '../../utils/markdown'

interface TableOfContentsProps {
  headings: MarkdownHeading[]
  className?: string
}

export function TableOfContents({
  headings,
  className,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')
  const headingKey = headings.map((heading) => heading.id).join('|')

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top,
          )
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 1] },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
    // headingKey is the stable dependency for the heading set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingKey])

  if (headings.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Table of contents"
      className={cn('border-l border-line pl-5', className)}
    >
      <p className="eyebrow">In this story</p>
      <ol className="mt-4 space-y-2.5">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={activeId === heading.id ? 'location' : undefined}
              className={cn(
                'block text-xs leading-5 transition-colors hover:text-accent',
                heading.level === 3 && 'pl-3',
                activeId === heading.id
                  ? 'font-semibold text-accent'
                  : 'text-muted',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
