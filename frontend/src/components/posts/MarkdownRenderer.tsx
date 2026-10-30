import { defaultSchema } from 'hast-util-sanitize'
import { Check, Copy } from 'lucide-react'
import {
  Children,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

import { cn } from '../../utils/cn'
import { highlightCode } from '../../utils/highlight'

const sanitizeSchema = {
  ...defaultSchema,
  // Headings receive safe github-slugger IDs from rehype-slug. Keeping the
  // IDs unprefixed lets the generated table of contents link to them.
  clobberPrefix: '',
}

interface CodeBlockProps {
  code: string
  language: string
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const label = language && language !== 'text' ? language : 'text'

  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="code-block my-7 border border-ink/15 bg-[#1c1b18] text-[#f2eee5]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#c9b89d]">
          {label}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#d8cebd] transition-colors hover:text-white"
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[0.82rem] leading-6 sm:p-5">
        <code
          className={`hljs language-${label}`}
          // highlight.js escapes the source before emitting spans.
          dangerouslySetInnerHTML={{ __html: highlightCode(code, label) }}
        />
      </pre>
    </div>
  )
}

function CodeBlockPre({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0]
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return <pre>{children}</pre>
  }

  const className = child.props.className ?? ''
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? 'text'
  const code = String(child.props.children ?? '').replace(/\n$/, '')
  return <CodeBlock code={code} language={language} />
}

const components: Components = {
  pre: CodeBlockPre,
  a({ href, children, title }) {
    const external = Boolean(href && /^https?:\/\//i.test(href))
    return (
      <a
        href={href}
        title={title}
        {...(external
          ? { target: '_blank', rel: 'noreferrer noopener' }
          : undefined)}
      >
        {children}
      </a>
    )
  },
  img({ alt, src, title }) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        title={title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    )
  },
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('article-copy markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
