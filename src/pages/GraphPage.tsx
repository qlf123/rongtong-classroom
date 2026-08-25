import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, Sparkles } from 'lucide-react'
import type { MappingCandidate, StandardDim } from '@/types'
import { MappingCanvas, type Selection } from '@/components/graph/MappingCanvas'
import { DetailPanel } from '@/components/graph/DetailPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { chat, parseJson } from '@/lib/llm'
import { buildCandidatePrompt } from '@/lib/prompts'
import { DIMS, chapters, competencies, isFullCoverage, knowledgePoints } from '@/lib/data'
import { DIM_COLOR, MAPPING_COLOR } from '@/lib/dims'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/utils'

function Chip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={cn('text-[12.5px] font-semibold text-slate-900', tone)}>{value}</span>
    </div>
  )
}

export function GraphPage() {
  const navigate = useNavigate()
  const { mappings, addCandidates, pushToast } = useGraphStore()
  const [selection, setSelection] = useState<Selection>(null)
  const [dimFilter, setDimFilter] = useState<StandardDim | null>(null)
  const [chapterFilter, setChapterFilter] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [openChapters, setOpenChapters] = useState<string[]>(chapters)

  const stats = useMemo(() => {
    const alive = mappings.filter((m) => m.status !== '已驳回')
    return {
      confirmed: alive.filter((m) => m.status === '已确认').length,
      pending: alive.filter((m) => m.status === '待审').length,
      gap: alive.filter((m) => m.type === '缺口映射').length,
      full: competencies.filter(isFullCoverage).length,
    }
  }, [mappings])

  async function generateCandidates() {
    setGenerating(true)
    try {
      const existing = mappings.map((m) => ({ kpId: m.kpId, ciId: m.ciId }))
      const res = await chat(buildCandidatePrompt(existing), {
        callPoint: 'candidateMappings',
        jsonMode: true,
      })
      const parsed = parseJson<{ mappings: MappingCandidate[] }>(res.content)
      if (!parsed?.mappings?.length) {
        pushToast('未解析到候选映射，请重试')
        return
      }
      const { added, skipped } = addCandidates(parsed.mappings)
      pushToast(
        `AI 生成 ${parsed.mappings.length} 条候选 · 新增 ${added} 条进入待审${
          skipped ? ` · ${skipped} 条已存在（跳过）` : ''
        }`,
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* 左栏：课程章节树 */}
      <div className="w-[22%] min-w-[220px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <div className="text-[12.5px] font-semibold text-slate-800">课程章节 · 知识点</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            《导游业务》64 学时 · {knowledgePoints.length} 个知识点
          </div>
          <button
            onClick={() => {
              setChapterFilter(null)
              setSelection(null)
            }}
            className={cn(
              'mt-2 w-full rounded-md px-2 py-1 text-left text-[11.5px]',
              chapterFilter === null
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            全部章节 · 全景视图
          </button>
        </div>
        {chapters.map((ch) => {
          const kps = knowledgePoints.filter((k) => k.chapter === ch)
          const open = openChapters.includes(ch)
          return (
            <div key={ch} className="border-b border-slate-50">
              <button
                onClick={() => {
                  setOpenChapters((s) => (open ? s : [...s, ch]))
                  setChapterFilter(chapterFilter === ch ? null : ch)
                  setSelection(null)
                }}
                className={cn(
                  'flex w-full items-center gap-1 px-3 py-2 text-left hover:bg-slate-50',
                  chapterFilter === ch && 'bg-primary/5',
                )}
              >
                <ChevronRight
                  className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-90')}
                />
                <span className="text-[12px] font-medium text-slate-700">{ch}</span>
                <span className="ml-auto text-[10.5px] text-slate-400">{kps.length}</span>
              </button>
              {open && (
                <div className="pb-1.5">
                  {kps.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => {
                        setChapterFilter(k.chapter)
                        setSelection({ kind: 'kp', id: k.id })
                      }}
                      className={cn(
                        'flex w-full items-center gap-1.5 py-1 pl-8 pr-3 text-left text-[11.5px] hover:bg-slate-50',
                        selection?.kind === 'kp' && selection.id === k.id
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-slate-600',
                      )}
                    >
                      <span className="truncate">{k.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-slate-400">{k.hours}h</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 中栏：画布 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
          <Chip label="知识点" value={String(knowledgePoints.length)} />
          <Chip label="能力项" value={String(competencies.length)} />
          <Chip
            label="映射"
            value={`已确认 ${stats.confirmed} / 待审 ${stats.pending} / 缺口 ${stats.gap}`}
          />
          <Chip label="四维全覆盖能力项" value={String(stats.full)} tone="text-amber-600" />
          <Button size="sm" className="ml-auto gap-1.5" disabled={generating} onClick={generateCandidates}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? 'AI 生成中…' : 'AI 生成候选映射'}
          </Button>
        </div>

        <div className="relative min-h-0 flex-1">
          <MappingCanvas
            mappings={mappings}
            selection={selection}
            onSelect={setSelection}
            chapterFilter={chapterFilter}
            dimFilter={dimFilter}
          />

          {/* 列标题 */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 flex justify-between px-6 py-2">
            <span className="rounded-md bg-indigo-50/90 px-2 py-1 text-[11px] font-medium text-indigo-700">
              课程知识点 · 学科知识体系（学校语言）
              {chapterFilter && <span className="ml-1 text-indigo-500">｜聚焦 {chapterFilter}</span>}
            </span>
            <span className="rounded-md bg-orange-50/90 px-2 py-1 text-[11px] font-medium text-orange-700">
              岗位能力项 · 岗位能力体系（产业语言）
            </span>
          </div>

          {generating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[12.5px] text-slate-700">
                  正在比对未映射知识点与 {competencies.length} 个能力项…
                </span>
              </div>
            </div>
          )}

          {/* 待审徽标 */}
          {stats.pending > 0 && (
            <button
              onClick={() => navigate('/review')}
              className="absolute right-4 top-11 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11.5px] font-medium text-amber-800 hover:bg-amber-100"
            >
              {stats.pending} 条候选映射待审 →
            </button>
          )}

          {/* 图例 */}
          <div className="pointer-events-none absolute bottom-3 right-4 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[10.5px] leading-4 text-slate-600">
            <div className="mb-1 font-medium text-slate-700">连线 = 映射（线宽 = 置信度）</div>
            {(['支撑映射', '场景映射', '缺口映射'] as const).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-5"
                  style={
                    t === '缺口映射'
                      ? {
                          backgroundImage: `repeating-linear-gradient(90deg, ${MAPPING_COLOR[t]} 0 3px, transparent 3px 6px)`,
                        }
                      : { background: MAPPING_COLOR[t] }
                  }
                />
                {t}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 bg-amber-400 opacity-60" />
              待审候选
            </div>
            <div className="mt-1 flex items-center gap-1.5 border-t border-slate-100 pt-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-amber-400" />
              四维全覆盖
            </div>
          </div>

          {/* 按四维筛选 —— 备赛场景入口 */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5">
            <span className="mr-0.5 text-[11px] text-slate-500">按四维筛选</span>
            <button
              onClick={() => setDimFilter(null)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px]',
                dimFilter === null ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              全部
            </button>
            {DIMS.map((d) => (
              <button
                key={d}
                onClick={() => setDimFilter(dimFilter === d ? null : d)}
                style={dimFilter === d ? { background: DIM_COLOR[d], color: '#fff' } : undefined}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px]',
                  dimFilter === d ? '' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {d}
              </button>
            ))}
            {dimFilter && (
              <Badge variant="outline" className="ml-1">
                仅显示被「{dimFilter}」标准覆盖的能力项
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 右栏：详情抽屉 */}
      <div className="w-[28%] min-w-[300px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
        <DetailPanel selection={selection} mappings={mappings} />
      </div>
    </div>
  )
}
