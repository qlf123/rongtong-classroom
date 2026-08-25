import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  Presentation,
  Sparkles,
  Table2,
  Timer,
} from 'lucide-react'
import { chat } from '@/lib/llm'
import { buildLessonPrompt } from '@/lib/prompts'
import { cases, ciById, kpById, knowledgePoints, resourceName } from '@/lib/data'
import { DIM_BG } from '@/lib/dims'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BlockSkeleton } from '@/components/ui/skeleton'
import { DimTags } from '@/components/common/DimTags'
import { SourceMarkdown } from '@/components/common/SourceMarkdown'
import { countSources } from '@/lib/sources'
import { useGraphStore } from '@/store/graphStore'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

const STEPS = ['选择备课范围', '生成岗位化教案', '一键导出']
const DEFAULT_KP = 'KP-04-03'

function StepRail({ step, onPick }: { step: number; onPick: (n: number) => void }) {
  return (
    <div className="w-[168px] shrink-0 border-r border-slate-200 bg-white px-3 py-4">
      {STEPS.map((label, i) => {
        const active = step === i
        const done = step > i
        return (
          <button
            key={label}
            onClick={() => onPick(i)}
            className="flex w-full items-start gap-2 py-2 text-left"
          >
            <span
              className={cn(
                'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                active ? 'bg-primary text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('text-[12.5px] leading-5', active ? 'font-medium text-slate-900' : 'text-slate-500')}>
              {label}
            </span>
          </button>
        )
      })}
      <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[10.5px] leading-4 text-slate-500">
        V1.0 只做教师端。第一价值主张是帮教师减负，而不是帮学生学习。
      </div>
    </div>
  )
}

function ElapsedCard() {
  const start = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const sec = Math.floor((now - start.current) / 1000)
  return (
    <div className="fixed bottom-4 right-4 z-30 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
        <Timer className="h-3.5 w-3.5" />
        传统备课约 4.5 小时
      </div>
      <div className="mt-0.5 text-[13px] font-semibold text-emerald-900">
        本次耗时 {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}
      </div>
    </div>
  )
}

export function PrepPage() {
  const { mappings, pushToast, recordAdopt, recordContentReject } = useGraphStore()
  const mode = useAppStore((s) => s.mode)
  const [step, setStep] = useState(0)
  const [kpId, setKpId] = useState(DEFAULT_KP)
  const [hours, setHours] = useState('2')
  const [md, setMd] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const kp = kpById.get(kpId)!

  // Step 1 纯查图谱：从映射反查这节课对应的岗位能力项
  const relatedCis = useMemo(() => {
    const ids = mappings
      .filter((m) => m.kpId === kpId && m.status !== '已驳回' && m.type !== '缺口映射')
      .map((m) => m.ciId)
    return Array.from(new Set(ids)).map((id) => ciById.get(id)!).filter(Boolean)
  }, [mappings, kpId])

  const relatedCases = useMemo(() => cases.filter((c) => c.kpIds.includes(kpId)), [kpId])

  const resourceIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...kp.resources.filter((r) => r.resourceId).map((r) => r.resourceId as string),
          ...relatedCis.flatMap((c) => c.linkedResources),
        ]),
      ),
    [kp, relatedCis],
  )

  const srcCount = countSources(md)

  async function generate() {
    setLoading(true)
    setStreaming(true)
    setMd('')
    try {
      const res = await chat(
        buildLessonPrompt({
          chapter: `${kp.chapter} · ${kp.name}`,
          hours: Number(hours),
          kps: [kp, ...kp.prereq.map((p) => kpById.get(p)!).filter(Boolean)],
          cis: relatedCis,
          relatedCases,
          resourceIds,
        }),
        {
          callPoint: 'lessonPlan',
          stream: true,
          onToken: (_chunk, full) => setMd(full),
        },
      )
      setMd(res.content)
      pushToast(`教案生成完成 · ${res.via === 'live' ? '真实 API' : '演示模式'}`)
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full">
      <StepRail step={step} onPick={setStep} />

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {/* ── Step 1 ─────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-[13px] font-semibold text-slate-900">选择备课范围</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-slate-500">章节 / 知识点</span>
                  <Select value={kpId} onValueChange={setKpId}>
                    <SelectTrigger className="h-8 w-[330px] text-[12.5px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[360px]">
                      {knowledgePoints.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.chapter.slice(0, 3)} · {k.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-slate-500">目标岗位</span>
                  <Badge variant="outline">地陪导游员（初级）</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-slate-500">课时</span>
                  <Select value={hours} onValueChange={setHours}>
                    <SelectTrigger className="h-8 w-[92px] text-[12.5px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '4'].map((h) => (
                        <SelectItem key={h} value={h}>{h} 课时</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="ml-auto" onClick={() => setStep(1)}>
                  下一步 · 生成教案
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-slate-900">本节关联的岗位能力项</h3>
              <Badge variant="outline">{relatedCis.length} 项 · 由已确认映射反查</Badge>
              <span className="text-[11px] text-slate-400">此步不调用 AI，纯查图谱</span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-3">
              {relatedCis.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-medium text-slate-900">{c.name}</div>
                      <div className="mt-0.5 text-[10.5px] text-slate-400">
                        {c.id} · {c.kind} · {c.level}
                      </div>
                    </div>
                    <DimTags ci={c} size={12} />
                  </div>

                  <div className="mt-2.5 space-y-1">
                    {c.standardRefs.map((r, i) => (
                      <div key={i} className={cn('flex items-start gap-1.5 rounded-md border px-1.5 py-1', DIM_BG[r.dim])}>
                        <span className="shrink-0 text-[11px] font-semibold">{r.dim}</span>
                        <span className="text-[11px] leading-4">{r.ref}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5">
                    <div className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
                      岗位真实任务
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {c.workTasks.slice(0, 2).map((t, i) => (
                        <li key={i} className="flex gap-1.5 text-[11.5px] leading-4 text-slate-600">
                          <span className="text-orange-500">·</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
                      可调用的实训资源
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.linkedResources.length ? (
                        c.linkedResources.map((r) => (
                          <Badge key={r} variant="vendor" className="gap-1">
                            <Boxes className="h-2.5 w-2.5" />
                            {resourceName(r)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-amber-700">暂无实训软件支撑</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!relatedCis.length && (
                <div className="col-span-2 rounded-lg border border-dashed border-slate-300 p-6 text-center text-[12.5px] text-slate-400">
                  该知识点当前没有已确认的能力项映射，请先在映射审核台确认候选。
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="pb-16">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="text-[12.5px] text-slate-700">
                <span className="font-medium text-slate-900">{kp.chapter} · {kp.name}</span>
                <span className="ml-2 text-slate-500">{hours} 课时 · 地陪导游员（初级）</span>
              </div>
              <Badge variant="outline" className="ml-1">{mode === 'demo' ? '演示模式' : '真实 API'}</Badge>
              <Button size="sm" className="ml-auto gap-1.5" disabled={loading} onClick={generate}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loading ? '生成中…' : md ? '重新生成' : '生成教案'}
              </Button>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                <span className="text-[12.5px] font-medium text-slate-800">岗位化教案</span>
                <span className="text-[11px] text-emerald-700">
                  本次生成引用来源 {srcCount} 处 · 全部来自已审核内容库
                </span>
              </div>

              <div className="px-4 py-3">
                {!md && loading && <BlockSkeleton lines={12} />}
                {!md && !loading && (
                  <div className="py-14 text-center text-[12.5px] text-slate-400">
                    点击「生成教案」，AI 将基于已审核的教材、能力标准、企业案例与实训资源生成七段式教案。
                    <div className="mt-1 text-[11.5px]">所有内容带溯源角标，可悬停查看原文出处。</div>
                  </div>
                )}
                {md && (
                  <div className={cn(streaming && 'typing-caret')}>
                    <SourceMarkdown content={md} />
                  </div>
                )}
              </div>
            </div>

            {md && !loading && (
              <div className="sticky bottom-0 mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3.5 py-2.5 backdrop-blur">
                <span className="text-[11.5px] text-slate-500">AI 只出初稿，教师终审后方可入库</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      recordAdopt()
                      pushToast('已记录 · 本月 AI 内容采纳率 78%，二次编辑率 41%')
                      setStep(2)
                    }}
                  >
                    采纳并保存
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      recordAdopt()
                      pushToast('已记录 · 本月 AI 内容采纳率 78%，二次编辑率 41%')
                      setStep(2)
                    }}
                  >
                    编辑后采纳
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting((v) => !v)}>
                    驳回
                  </Button>
                </div>
              </div>
            )}

            {rejecting && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50/60 p-3">
                <Textarea
                  className="bg-white text-[12px]"
                  placeholder="驳回原因：例如「情境导入与本校线路不符」「实训任务未落到具体软件」"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!rejectReason.trim()}
                    onClick={() => {
                      recordContentReject()
                      setRejecting(false)
                      setRejectReason('')
                      pushToast('已记录驳回原因 · 计入 AI 内容驳回率并回流提示词优化')
                    }}
                  >
                    确认驳回
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(false)}>
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3 ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-[13px] font-semibold text-slate-900">一键导出</div>
              <div className="mt-0.5 text-[11.5px] text-slate-500">
                四份材料同源于本次生成的教案与图谱数据，导出后可直接用于课堂与实训室。
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[
                  { icon: FileText, name: '教案', desc: '七段式 · 含溯源角标' },
                  { icon: Presentation, name: '课件大纲', desc: '按讲解要点分屏' },
                  { icon: ClipboardList, name: '实训任务书', desc: '基础/进阶/挑战三档' },
                  { icon: Table2, name: '评分量规', desc: '对齐赛项评分表条款' },
                ].map(({ icon: Icon, name, desc }) => (
                  <button
                    key={name}
                    onClick={() => pushToast(`${name} 已导出（演示）`)}
                    className="rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="mt-2 text-[12.5px] font-medium text-slate-900">{name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{desc}</div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
                      <Download className="h-3 w-3" />
                      预览 / 导出
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {md && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2 text-[12.5px] font-medium text-slate-800">
                  教案预览
                </div>
                <div className="max-h-[52vh] overflow-y-auto px-4 py-3">
                  <SourceMarkdown content={md} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ElapsedCard />
    </div>
  )
}
