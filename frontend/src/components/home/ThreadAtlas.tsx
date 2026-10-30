import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Topic } from '../../types/api'
import { cn } from '../../utils/cn'
import { pluralize } from '../../utils/format'

interface ThreadAtlasProps {
  topics: Topic[]
  activeTopic: string
  archiveCount: number | string
}

function ThreadTile({
  href,
  number,
  name,
  count,
  detail,
  active,
}: {
  href: string
  number: string
  name: string
  count: number | string
  detail: string
  active: boolean
}) {
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-[9.5rem] flex-col justify-between p-4 transition-colors sm:p-5',
        active
          ? 'bg-ink text-paper hover:bg-ink'
          : 'bg-surface text-ink hover:bg-paper-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'font-display text-4xl leading-none tracking-[-0.04em]',
            active ? 'text-accent-soft' : 'text-accent/65',
          )}
        >
          {count}
        </span>
        <ArrowUpRight
          className={cn(
            'size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
            active ? 'text-paper/55' : 'text-muted',
          )}
          aria-hidden="true"
        />
      </div>
      <div>
        <p
          className={cn(
            'text-[0.56rem] font-semibold uppercase tracking-[0.18em]',
            active ? 'text-paper/50' : 'text-muted',
          )}
        >
          {number} / Thread
        </p>
        <p className="mt-1 truncate font-display text-[1.45rem] leading-tight tracking-[-0.025em]">
          {name}
        </p>
        <p
          className={cn(
            'mt-1 text-[0.62rem]',
            active ? 'text-paper/55' : 'text-muted',
          )}
        >
          {detail}
        </p>
      </div>
    </Link>
  )
}

export function ThreadAtlas({
  topics,
  activeTopic,
  archiveCount,
}: ThreadAtlasProps) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
      <ThreadTile
        href="/"
        number="00"
        name="All stories"
        count={archiveCount}
        detail="The full archive"
        active={!activeTopic}
      />

      {topics.map((topic, index) => (
        <ThreadTile
          key={topic.name}
          href={`/?topic=${encodeURIComponent(topic.name)}`}
          number={String(index + 1).padStart(2, '0')}

          name={topic.name}
          count={topic.count}
          detail={`${topic.count} ${pluralize(topic.count, 'story', 'stories')}`}
          active={activeTopic === topic.name}
        />
      ))}

      {topics.length === 0 && (
        <div className="col-span-2 flex min-h-[9.5rem] items-center bg-surface p-5 text-xs leading-5 text-muted sm:col-span-3">
          Threads appear here as soon as the first story is filed.
        </div>
      )}
    </div>
  )
}
