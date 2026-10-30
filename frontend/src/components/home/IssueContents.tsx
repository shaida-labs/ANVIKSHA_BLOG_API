import { Ornament } from '../ui/Ornament'

const contents = [
  { number: '01', label: 'Cover story', href: '#cover' },
  { number: '02', label: 'Threads', href: '#threads' },
  { number: '03', label: 'Marginalia', href: '#marginalia' },
  { number: '04', label: 'Stories', href: '#journal' },
]

export function IssueContents() {
  return (
    <nav
      aria-label="In this issue"
      className="border-b border-line bg-surface/45"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-5 py-3.5 sm:px-8 lg:gap-8 lg:px-10">
        <p className="flex shrink-0 items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
          <Ornament className="size-2.5 text-accent" />
          In this issue
        </p>
        <span className="h-3.5 w-px shrink-0 bg-line" aria-hidden="true" />
        {contents.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group inline-flex shrink-0 items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
          >
            <span className="font-display text-sm italic text-accent/70">
              {item.number}
            </span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
