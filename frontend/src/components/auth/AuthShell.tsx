import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { currentYear } from '../../utils/format'
import { Brand } from '../navigation/Brand'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  alternatePrompt: string
  alternateLabel: string
  alternateTo: string
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  alternatePrompt,
  alternateLabel,
  alternateTo,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
        <Brand className="h-10 sm:h-12" />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to stories
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8 sm:pb-20 sm:pt-4 lg:px-10">
        <div className="w-full max-w-[27.5rem]">
          <div className="border border-line bg-surface p-6 shadow-soft sm:p-9">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <Brand variant="symbol" linked={false} />
              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-accent">
                  ANVIKSHA
                </p>
                <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Vol. I · {currentYear}
                </p>
              </div>
              <span
                className="ml-auto font-display text-3xl italic leading-none text-accent/35"
                aria-hidden="true"
              >
                A
              </span>
            </div>

            <div className="mt-7">
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="mt-2 font-display text-[clamp(2.55rem,6vw,3.65rem)] font-medium leading-[0.92] tracking-[-0.055em] text-ink text-balance">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
            </div>

            <div className="mt-7">{children}</div>

            <p className="mt-7 border-t border-line pt-5 text-sm text-muted">
              {alternatePrompt}{' '}
              <Link
                to={alternateTo}
                className="font-semibold text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent"
              >
                {alternateLabel}
              </Link>
            </p>
          </div>

          <p className="mt-5 text-center text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted">
            Question deeper · Understand better
          </p>
        </div>
      </main>
    </div>
  )
}
