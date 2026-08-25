import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveSource } from '@/lib/data'
import { SRC_HREF_PREFIX, preprocessSources } from '@/lib/sources'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function SourceBadge({ index, id }: { index: string; id: string }) {
  const src = resolveSource(id)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <sup className="mx-0.5 cursor-help rounded-[3px] bg-primary/10 px-1 py-px align-super text-[10px] font-medium text-primary">
          {index}
        </sup>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-900">
            来源：{src?.label ?? id}
          </div>
          <div className="text-[11px] leading-relaxed text-slate-600">{src?.detail ?? '—'}</div>
          <div className="pt-0.5 text-[10px] text-emerald-700">已通过教研审核 · 可追溯至原文</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function SourceMarkdown({ content, className }: { content: string; className?: string }) {
  const { text } = useMemo(() => preprocessSources(content), [content])
  return (
    <div className={cn('prose-sm max-w-none text-[13px] leading-relaxed text-slate-700', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (typeof href === 'string' && href.startsWith(SRC_HREF_PREFIX)) {
              const rest = href.slice(SRC_HREF_PREFIX.length)
              const cut = rest.indexOf('-')
              return <SourceBadge index={rest.slice(0, cut)} id={rest.slice(cut + 1)} />
            }
            return <a href={href} className="text-primary underline">{children}</a>
          },
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 border-l-[3px] border-primary pl-2 text-[15px] font-semibold text-slate-900 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-sm font-semibold text-slate-800">{children}</h3>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-[12px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-2.5 py-1.5 text-left font-semibold text-slate-700">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-slate-100 px-2.5 py-1.5 align-top">{children}</td>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">{children}</code>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
