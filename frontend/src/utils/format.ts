import type { Post } from '../types/api'
import { stripMarkdown } from './markdown'

export const currentYear = new Date().getFullYear()

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const monthAndYear = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

const fullDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function parseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string): string {
  const date = parseDate(value)
  return date ? shortDate.format(date) : 'Date unavailable'
}

export function formatMonthAndYear(value: string): string {
  const date = parseDate(value)
  return date ? monthAndYear.format(date) : 'Unknown'
}

export function formatFullDate(value: string): string {
  const date = parseDate(value)
  return date ? fullDate.format(date) : 'Date unavailable'
}

export function getReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function getReadingLabel(content: string): string {
  const minutes = getReadingMinutes(content)
  return `${minutes} min read`
}

export function getExcerpt(content: string, maximum = 170): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maximum) {
    return normalized
  }

  const shortened = normalized.slice(0, maximum)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 0 ? lastSpace : maximum).trimEnd()}…`
}

export function getPostExcerpt(
  post: Pick<Post, 'excerpt' | 'content'>,
  maximum = 170,
): string {
  const source = post.excerpt?.trim() || stripMarkdown(post.content)
  return getExcerpt(source, maximum)
}

export function getAuthorName(author: {
  username: string
  display_name?: string | null
}): string {
  return author.display_name?.trim() || author.username
}

export function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'M'
}

export function getYear(value: string): string {
  const date = parseDate(value)
  return date ? String(date.getFullYear()) : ''
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural
}
