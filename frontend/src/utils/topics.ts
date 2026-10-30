export const GENERAL_TOPIC = 'General'

/**
 * Curated choices for the writing page. Stored topics are free-form strings,
 * so an existing custom topic is always preserved when editing a story.
 */
export const TOPIC_OPTIONS = [
  'Technology',
  'Engineering',
  'Design',
  'Science',
  'Society',
  'Culture',
  'Career',
  'Product',
  'AI',
] as const

export function getTopicLabel(topic: string | null | undefined): string {
  return topic?.trim() || GENERAL_TOPIC
}

export function topicToPayload(topic: string): string | null {
  const trimmed = topic.trim()
  return !trimmed || trimmed.toLowerCase() === 'general' ? null : trimmed
}
