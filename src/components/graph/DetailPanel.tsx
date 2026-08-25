import { useState } from 'react'
import { AlertTriangle, Boxes, Loader2, Sparkles } from 'lucide-react'
import type { GapSuggestion, Mapping } from '@/types'
import type { Selection } from './MappingCanvas'
import { ciById, competencies, kpById, resById, resourceName } from '@/lib/data'
import { CONF_CLASS, DIM_BG, MAPPING_COLOR, confidenceTone } from '@/lib/dims'
import { chat, parseJson } from '@/lib/llm'
import { buildGapPrompt } from '@/lib/prompts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlockSkeleton } from '@/components/ui/skeleton'
import { DimTags } from '@/components/common/DimTags'
import { useGraphStore } from '@/store/graphStore'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{title}</div>
      {children}
    </div>
  )
}

function ResourceRow({ id }: { id: string }) {
  const r = resById.get(id)
  if (!r) return null
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <Boxes className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <span className="truncate text-[12px] text-slate-700">{r.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline">{r.kind}</Badge>
        <Badge variant="vendor">自有产品</Badge>
      </div>
    </div>
  )
}

/* ── 知识点详情 ───────────────────────────────────────────── */

function KpDetail({ id, mappings }: { id: string; mappings: Mapping[] }) {
  const kp = kpById.get(id)
  if (!kp) return null
  const linked = mappings.filter((m) => m.kpId === id && m.status !== '已驳回')
  const linkedCis = linked.map((m) => ciById.get(m.ciId)).filter(Boolean)
  const resIds = Array.from(
    new Set([
      ...kp.resources.filter((r) => r.resourceId).map((r) => r.resourceId as string),
      ...linkedCis.flatMap((c) => c!.linkedResources),
    ]),
  )

  return (
    <div className="pb-6">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge>知识点</Badge>
          <span className="text-[11px] text-slate-400">{kp.id}</span>
        </div>
        <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900">{kp.name}</h3>
        <div className="mt-1 text-[11.5px] text-slate-500">
          {kp.chapter} · {kp.level} 级颗粒度 · {kp.hours} 学时
        </div>
        <p className="mt-2 text-[12.5px] leading-5 text-slate-600">{kp.desc}</p>
      </div>

      <Section title="知识结构">
        <div className="space-y-1.5 text-[12px]">
          <div>
            <span className="text-slate-400">先修　</span>
            {kp.prereq.length ? kp.prereq.map((p) => kpById.get(p)?.name ?? p).join('、') : '—'}
          </div>
          <div>
            <span className="text-slate-400">包含　</span>
            {kp.contains.join('、') || '—'}
          </div>
          <div>
            <span className="text-slate-400">易混　</span>
            {kp.confusable.join('、') || '—'}
          </div>
        </div>
      </Section>

      <Section title="这个知识点用在哪些岗位任务上">
        {linkedCis.length ? (
          <div className="space-y-2">
            {linkedCis.map((c) => (
              <div key={c!.id} className="rounded-md border border-slate-200 p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-slate-800">{c!.name}</span>
                  <DimTags ci={c!} size={11} />
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {c!.workTasks.map((t, i) => (
                    <li key={i} className="flex gap-1.5 text-[11.5px] leading-4 text-slate-600">
                      <span className="text-orange-500">·</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-slate-400">该知识点暂无已确认的岗位能力映射</div>
        )}
      </Section>

      <Section title="可调用的实训资源">
        {resIds.length ? (
          <div className="space-y-1.5">
            {resIds.map((r) => (
              <ResourceRow key={r} id={r} />
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-slate-400">暂无挂载的实训软件</div>
        )}
      </Section>

      <Section title="教学资源">
        <div className="space-y-1 text-[12px] text-slate-600">
          {kp.resources.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Badge variant="outline">{r.type}</Badge>
              <span className="truncate">{r.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">{r.ref}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ── 能力项详情 ───────────────────────────────────────────── */

function CiDetail({ id, mappings }: { id: string; mappings: Mapping[] }) {
  const ci = ciById.get(id)
  const pushToast = useGraphStore((s) => s.pushToast)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<GapSuggestion[] | null>(null)

  if (!ci) return null
  const gap = mappings.find((m) => m.ciId === id && m.type === '缺口映射' && m.status !== '已驳回')
  const supporting = mappings.filter(
    (m) => m.ciId === id && m.type !== '缺口映射' && m.status !== '已驳回',
  )

  async function generate() {
    setLoading(true)
    setSuggestions(null)
    try {
      const res = await chat(buildGapPrompt(ci!), { callPoint: 'gapSuggestions', jsonMode: true })
      const parsed = parseJson<{ suggestions: GapSuggestion[] }>(res.content)
      if (!parsed?.suggestions?.length) {
        pushToast('未解析到有效建议，请重试')
        return
      }
      setSuggestions(parsed.suggestions)
      pushToast(`已生成 ${parsed.suggestions.length} 条补齐方案 · ${res.via === 'live' ? '真实 API' : '演示模式'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-6">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-100 text-orange-700">能力项</Badge>
          <span className="text-[11px] text-slate-400">{ci.id}</span>
          <DimTags ci={ci} size={12} className="ml-auto" />
        </div>
        <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900">{ci.name}</h3>
        <div className="mt-1 text-[11.5px] text-slate-500">
          {ci.kind} · {ci.level} · {ci.post}
        </div>
      </div>

      {gap && (
        <div className="mx-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            该能力项当前课程未覆盖 · 建议纳入人才培养方案修订
          </div>
          <p className="mt-1.5 text-[11.5px] leading-4 text-red-700/85">{gap.evidence}</p>

          <div className="mt-2.5 rounded-md border border-emerald-200 bg-emerald-50 p-2">
            <div className="text-[11.5px] font-medium text-emerald-800">已有实训资源可支撑：</div>
            <div className="mt-1 space-y-1">
              {ci.linkedResources.map((r) => (
                <div key={r} className="flex items-center gap-1.5 text-[11.5px] text-emerald-900">
                  <Boxes className="h-3 w-3" />
                  {resourceName(r)}
                  <Badge variant="vendor" className="ml-auto">自有产品</Badge>
                </div>
              ))}
            </div>
            <div className="mt-1.5 text-[10.5px] leading-4 text-emerald-700">
              教学缺口存在，但工具已就位 —— 缺的是把工具接进课程体系的机制。
            </div>
          </div>

          <Button size="sm" className="mt-2.5 w-full gap-1.5" disabled={loading} onClick={generate}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? '生成中…' : '生成补充教学建议'}
          </Button>

          {loading && (
            <div className="mt-3">
              <BlockSkeleton lines={5} />
            </div>
          )}

          {suggestions && (
            <div className="mt-3 space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-1.5">
                    <Badge>{s.level}</Badge>
                    <span className="text-[11px] text-slate-500">预估 {s.hours} 课时</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-4 text-slate-700">{s.action}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.useResources.map((r) => (
                      <Badge key={r} variant="vendor">{r}</Badge>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[11px] leading-4 text-amber-700">风险：{s.risk}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Section title="岗课赛证 四维标准来源">
        <div className="space-y-1.5">
          {ci.standardRefs.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md border px-2 py-1.5 ${DIM_BG[r.dim]}`}
            >
              <span className="mt-px shrink-0 text-[12px] font-semibold">{r.dim}</span>
              <span className="text-[11.5px] leading-4">{r.ref}</span>
            </div>
          ))}
          {ci.standardRefs.length < 4 && (
            <div className="text-[11px] text-slate-400">
              未覆盖维度：
              {(['岗', '课', '赛', '证'] as const)
                .filter((d) => !ci.standardRefs.some((r) => r.dim === d))
                .join('、')}
            </div>
          )}
        </div>
      </Section>

      <Section title="岗位真实任务">
        <ul className="space-y-1">
          {ci.workTasks.map((t, i) => (
            <li key={i} className="flex gap-1.5 text-[12px] leading-5 text-slate-700">
              <span className="text-orange-500">·</span>
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="常见错误">
        <ul className="space-y-1">
          {ci.commonErrors.map((t, i) => (
            <li key={i} className="flex gap-1.5 text-[12px] leading-5 text-slate-600">
              <span className="text-red-400">·</span>
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="挂载的实训资源">
        {ci.linkedResources.length ? (
          <div className="space-y-1.5">
            {ci.linkedResources.map((r) => (
              <ResourceRow key={r} id={r} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11.5px] text-amber-800">
            该能力项当前无实训软件支撑 → 产品线机会
          </div>
        )}
      </Section>

      <Section title="课程支撑（映射）">
        {supporting.length ? (
          <div className="space-y-1">
            {supporting.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 text-[12px]">
                <span style={{ color: MAPPING_COLOR[m.type] }}>●</span>
                <span className="truncate text-slate-700">{kpById.get(m.kpId)?.name ?? m.kpId}</span>
                <Badge variant="outline" className="ml-auto shrink-0">{m.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-red-600">当前无课程知识点支撑</div>
        )}
      </Section>
    </div>
  )
}

/* ── 映射详情 ─────────────────────────────────────────────── */

function MappingDetail({ id, mappings }: { id: string; mappings: Mapping[] }) {
  const m = mappings.find((x) => x.id === id)
  if (!m) return null
  const tone = CONF_CLASS[confidenceTone(m.confidence)]
  const kp = kpById.get(m.kpId)
  const ci = ciById.get(m.ciId)

  return (
    <div className="pb-6">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge style={{ background: `${MAPPING_COLOR[m.type]}1a`, color: MAPPING_COLOR[m.type] }}>
            {m.type}
          </Badge>
          <Badge variant="outline">{m.status}</Badge>
          <span className="ml-auto text-[11px] text-slate-400">{m.id}</span>
        </div>
        <div className="mt-3 space-y-1.5 text-[12.5px]">
          <div className="rounded-md bg-indigo-50 px-2 py-1.5 text-indigo-900">
            {kp ? `${kp.id} ${kp.name}` : '（无支撑知识点）'}
          </div>
          <div className="pl-2 text-slate-400">↓</div>
          <div className="rounded-md bg-orange-50 px-2 py-1.5 text-orange-900">
            {ci?.id} {ci?.name}
          </div>
        </div>
      </div>

      <Section title="置信度">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${m.confidence * 100}%` }} />
          </div>
          <span className={`text-[12px] font-medium ${tone.text}`}>{m.confidence.toFixed(2)}</span>
        </div>
      </Section>

      <Section title="AI 判定依据">
        <p className="text-[12px] leading-5 text-slate-700">{m.evidence}</p>
        <div className="mt-1.5 text-[11px] text-slate-400">来源：{m.source}</div>
      </Section>

      <Section title="审核记录">
        {m.reviewer ? (
          <div className="space-y-1 text-[12px] text-slate-700">
            <div>
              <span className="text-slate-400">审核人　</span>
              {m.reviewer}
            </div>
            <div>
              <span className="text-slate-400">审核时间</span> {m.reviewedAt ?? '—'}
            </div>
            {m.rejectReason && (
              <div className="mt-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-[11.5px] leading-4 text-red-700">
                驳回理由：{m.rejectReason}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-amber-700">尚未审核 · 在映射审核台处理</div>
        )}
      </Section>

      <Section title="教师采纳率">
        {typeof m.teacherAdoptRate === 'number' ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${m.teacherAdoptRate < 0.4 ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${m.teacherAdoptRate * 100}%` }}
              />
            </div>
            <span className="text-[12px] text-slate-700">{Math.round(m.teacherAdoptRate * 100)}%</span>
            {m.teacherAdoptRate < 0.4 && (
              <Badge variant="danger">低于 40% 阈值 · 已进入复审</Badge>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-slate-400">上线后开始统计</div>
        )}
      </Section>
    </div>
  )
}

/* ── 空态 ─────────────────────────────────────────────────── */

function EmptyState() {
  const gapCount = competencies.filter((c) => c.standardRefs.length < 3).length
  return (
    <div className="px-4 py-6 text-[12.5px] leading-6 text-slate-500">
      <div className="text-[13px] font-medium text-slate-700">点击画布查看详情</div>
      <ul className="mt-2 space-y-1.5">
        <li>· 点<span className="text-indigo-600">蓝色知识点</span>：看它用在哪些岗位任务上、能调用哪套实训软件</li>
        <li>· 点<span className="text-orange-600">橙色能力项</span>：看它的岗课赛证四维标准条款号</li>
        <li>· 点<span className="text-emerald-600">连线</span>：看映射的 AI 判定依据与双方审核记录</li>
      </ul>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11.5px] leading-5">
        产教脱节的本质，是「学科知识体系」和「岗位能力体系」两套语言之间缺翻译机制。
        产品的核心资产不是两侧的图谱，而是中间这层经过校验的映射关系。
        <div className="mt-1.5 text-slate-400">当前共 {competencies.length} 个能力项，其中 {gapCount} 个标准维度覆盖不足。</div>
      </div>
    </div>
  )
}

export function DetailPanel({ selection, mappings }: { selection: Selection; mappings: Mapping[] }) {
  if (!selection) return <EmptyState />
  if (selection.kind === 'kp') return <KpDetail id={selection.id} mappings={mappings} />
  if (selection.kind === 'ci') return <CiDetail key={selection.id} id={selection.id} mappings={mappings} />
  return <MappingDetail id={selection.id} mappings={mappings} />
}
