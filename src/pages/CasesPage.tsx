import { useMemo, useState } from 'react'
import { Info, Loader2, ShieldCheck, Wand2, X } from 'lucide-react'
import type { EnterpriseCase, StandardDim } from '@/types'
import { chat } from '@/lib/llm'
import { buildCasePrompt } from '@/lib/prompts'
import { DIMS, cases, ciById, competencies, dimsOf, kpById, knowledgePoints } from '@/lib/data'
import { DIM_COLOR } from '@/lib/dims'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlockSkeleton } from '@/components/ui/skeleton'
import { SourceMarkdown } from '@/components/common/SourceMarkdown'
import { DimTags } from '@/components/common/DimTags'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/utils'

type Filter =
  | { kind: 'all' }
  | { kind: 'kp'; id: string }
  | { kind: 'ci'; id: string }
  | { kind: 'dim'; dim: StandardDim }

export function CasesPage() {
  const pushToast = useGraphStore((s) => s.pushToast)
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  const [active, setActive] = useState<EnterpriseCase | null>(null)
  const [md, setMd] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)

  const list = useMemo(() => {
    if (filter.kind === 'all') return cases
    if (filter.kind === 'kp') return cases.filter((c) => c.kpIds.includes(filter.id))
    if (filter.kind === 'ci') return cases.filter((c) => c.ciIds.includes(filter.id))
    const ids = competencies.filter((c) => dimsOf(c).has(filter.dim)).map((c) => c.id)
    return cases.filter((c) => c.ciIds.some((id) => ids.includes(id)))
  }, [filter])

  async function rewrite(c: EnterpriseCase) {
    setActive(c)
    setMd('')
    setLoading(true)
    setStreaming(true)
    try {
      const res = await chat(buildCasePrompt(c), {
        callPoint: 'caseRewrite',
        stream: true,
        onToken: (_chunk, full) => setMd(full),
      })
      setMd(res.content)
      pushToast(`教学案例已生成 · ${res.via === 'live' ? '真实 API' : '演示模式'}`)
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* 左侧筛选 */}
      <div className="w-[228px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-3">
        <button
          onClick={() => setFilter({ kind: 'all' })}
          className={cn(
            'mb-2 w-full rounded-md px-2 py-1.5 text-left text-[12px]',
            filter.kind === 'all' ? 'bg-primary/10 font-medium text-primary' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          全部案例 · {cases.length}
        </button>

        <div className="mb-1 mt-3 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
          按岗课赛证维度
        </div>
        <div className="flex gap-1">
          {DIMS.map((d) => (
            <button
              key={d}
              onClick={() =>
                setFilter(filter.kind === 'dim' && filter.dim === d ? { kind: 'all' } : { kind: 'dim', dim: d })
              }
              style={
                filter.kind === 'dim' && filter.dim === d
                  ? { background: DIM_COLOR[d], color: '#fff' }
                  : undefined
              }
              className={cn(
                'flex-1 rounded-md border border-slate-200 py-1 text-[11.5px]',
                filter.kind === 'dim' && filter.dim === d ? 'border-transparent' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mb-1 mt-4 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
          按能力项
        </div>
        <div className="space-y-0.5">
          {competencies
            .filter((c) => cases.some((x) => x.ciIds.includes(c.id)))
            .map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setFilter(filter.kind === 'ci' && filter.id === c.id ? { kind: 'all' } : { kind: 'ci', id: c.id })
                }
                className={cn(
                  'flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[11.5px]',
                  filter.kind === 'ci' && filter.id === c.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))}
        </div>

        <div className="mb-1 mt-4 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
          按知识点
        </div>
        <div className="space-y-0.5 pb-4">
          {knowledgePoints
            .filter((k) => cases.some((x) => x.kpIds.includes(k.id)))
            .map((k) => (
              <button
                key={k.id}
                onClick={() =>
                  setFilter(filter.kind === 'kp' && filter.id === k.id ? { kind: 'all' } : { kind: 'kp', id: k.id })
                }
                className={cn(
                  'flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[11.5px]',
                  filter.kind === 'kp' && filter.id === k.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span className="truncate">{k.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* 案例卡片流 */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-[12px] leading-5 text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          企业案例来源：合作旅行社与景区提交（脱敏）→ 教研审核入库 → 方可被 AI 调用
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-slate-900">{c.title}</div>
                {c.desensitized && (
                  <Badge variant="success" className="shrink-0 gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    已脱敏
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-[11.5px] text-slate-500">
                {c.company} · {c.post}
              </div>
              <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-slate-600">{c.background}</p>

              <div className="mt-2.5 flex flex-wrap gap-1">
                {c.kpIds.map((id) => (
                  <Badge key={id} variant="outline">{kpById.get(id)?.name ?? id}</Badge>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {c.ciIds.map((id) => {
                  const ci = ciById.get(id)
                  return ci ? (
                    <span key={id} className="flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5">
                      <span className="text-[11px] text-orange-800">{ci.name}</span>
                      <DimTags ci={ci} size={9} showRing={false} />
                    </span>
                  ) : null
                })}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button size="xs" className="gap-1" onClick={() => rewrite(c)}>
                  <Wand2 className="h-3 w-3" />
                  一键转教学案例
                </Button>
                <span className="ml-auto text-[10.5px] text-slate-400">更新于 {c.updatedAt}</span>
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="col-span-2 rounded-lg border border-dashed border-slate-300 p-10 text-center text-[12.5px] text-slate-400">
              该筛选条件下暂无案例
            </div>
          )}
        </div>
      </div>

      {/* 右侧改写侧栏 */}
      {active && (
        <div className="flex w-[38%] min-w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900">教学案例</div>
              <div className="mt-0.5 truncate text-[11.5px] text-slate-500">
                {active.id} · {active.company}
              </div>
            </div>
            <button
              onClick={() => { setActive(null); setMd('') }}
              className="ml-auto rounded p-1 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading && !md && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  正在把企业语言改写为教学语言…
                </div>
                <BlockSkeleton lines={10} />
              </div>
            )}
            {md && (
              <div className={cn(streaming && 'typing-caret')}>
                <SourceMarkdown content={md} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
