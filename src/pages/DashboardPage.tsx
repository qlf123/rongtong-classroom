import { useMemo } from 'react'
import { AlertOctagon, Info } from 'lucide-react'
import { competencies, dashboard, resources } from '@/lib/data'
import { DIM_COLOR } from '@/lib/dims'
import { Badge } from '@/components/ui/badge'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/utils'

const pct = (v: number) => `${Math.round(v * 100)}%`

function Metric({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'good' | 'warn'
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div
        className={cn(
          'mt-1 text-[22px] font-semibold leading-7',
          tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-900',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10.5px] text-slate-400">{sub}</div>}
    </div>
  )
}

function Panel({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="text-[12.5px] font-semibold text-slate-900">{title}</span>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ── 柱状图：班级知识掌握度 ─────────────────────────────── */

function MasteryBars() {
  const data = dashboard.knowledgeMastery
  const W = 420
  const H = 190
  const pad = { l: 34, r: 8, t: 10, b: 46 }
  const bw = (W - pad.l - pad.r) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
        const y = pad.t + (1 - g) * (H - pad.t - pad.b)
        return (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
            <text x={pad.l - 6} y={y + 3} fontSize="9" fill="#94A3B8" textAnchor="end">
              {g * 100}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const h = d.mastery * (H - pad.t - pad.b)
        const x = pad.l + i * bw + bw * 0.22
        const y = H - pad.b - h
        return (
          <g key={d.chapter}>
            <rect x={x} y={y} width={bw * 0.56} height={h} rx="3" fill="#4F46E5" opacity={0.85} />
            <text x={x + bw * 0.28} y={y - 4} fontSize="9.5" fill="#334155" textAnchor="middle">
              {pct(d.mastery)}
            </text>
            <text x={x + bw * 0.28} y={H - pad.b + 13} fontSize="9" fill="#64748B" textAnchor="middle">
              {d.chapter.slice(0, 3)}
            </text>
            <text x={x + bw * 0.28} y={H - pad.b + 24} fontSize="8.5" fill="#94A3B8" textAnchor="middle">
              {d.chapter.slice(4, 11)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── 雷达图：岗位能力达成度 ─────────────────────────────── */

function AttainmentRadar() {
  const data = dashboard.competencyAttainment
  // viewBox 留出四周文字空间，否则外圈轴标签会被裁掉
  const W = 300
  const H = 214
  const cx = W / 2
  const cy = H / 2
  const r = 62
  const n = data.length
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const
  }
  const poly = data.map((d, i) => pt(i, d.value).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px]">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon
          key={g}
          points={data.map((_, i) => pt(i, g).join(',')).join(' ')}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E2E8F0" strokeWidth="1" />
      })}
      <polygon points={poly} fill="#EA580C" fillOpacity="0.18" stroke="#EA580C" strokeWidth="1.6" />
      {data.map((d, i) => {
        const [x, y] = pt(i, d.value)
        return <circle key={i} cx={x} cy={y} r="2.4" fill="#EA580C" />
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.22)
        const anchor = x > cx + 6 ? 'start' : x < cx - 6 ? 'end' : 'middle'
        return (
          <text key={d.axis} x={x} y={y + 3} fontSize="9" fill="#475569" textAnchor={anchor}>
            {d.axis} {pct(d.value)}
          </text>
        )
      })}
    </svg>
  )
}

/* ── 岗课赛证四维覆盖度：环形进度 ───────────────────────── */

function DimRing({ dim, value }: { dim: string; value: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const color = DIM_COLOR[dim as keyof typeof DIM_COLOR]
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 68 68" className="h-[68px] w-[68px]">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${circ * value} ${circ}`}
          transform="rotate(-90 34 34)"
        />
        <text x="34" y="38" fontSize="13" fontWeight="600" fill="#0F172A" textAnchor="middle">
          {Math.round(value * 100)}
        </text>
      </svg>
      <div className="mt-1 flex items-center gap-1">
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-[2px] text-[10px] text-white"
          style={{ background: color }}
        >
          {dim}
        </span>
        <span className="text-[11px] text-slate-600">{pct(value)}</span>
      </div>
    </div>
  )
}

/* ── 实训资源覆盖热力矩阵 ───────────────────────────────── */

function ResourceHeatMatrix() {
  const { noSupport, unmounted } = useMemo(() => {
    const used = new Set(competencies.flatMap((c) => c.linkedResources))
    return {
      noSupport: competencies.filter((c) => c.linkedResources.length === 0),
      unmounted: resources.filter((r) => !used.has(r.id)),
    }
  }, [])

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        {/* table-fixed + w-full：让 12 列均分剩余宽度，而不是按内容收缩后在右侧留白 */}
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[214px]" />
            {resources.map((r) => (
              <col key={r.id} />
            ))}
          </colgroup>
          <thead>
            {/* 表头高度必须容得下最长的纵排列名，否则文字会溢出压到第一批数据行上 */}
            <tr className="h-[186px]">
              <th className="align-bottom px-2 pb-1.5 text-left text-[10.5px] font-medium text-slate-400">
                能力项 \ 实训软件
              </th>
              {resources.map((r) => (
                <th key={r.id} className="px-0.5 pb-1.5 align-bottom">
                  <div
                    className="mx-auto flex h-[176px] items-end justify-center whitespace-nowrap text-[9.5px] leading-none text-slate-500"
                    style={{ writingMode: 'vertical-rl' }}
                    title={r.name}
                  >
                    {r.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competencies.map((c) => {
              const empty = c.linkedResources.length === 0
              return (
                <tr key={c.id} className="group">
                  <td
                    className={cn(
                      'truncate py-0.5 pr-3 text-[11px] group-hover:bg-slate-50',
                      empty ? 'text-red-600' : 'text-slate-600',
                    )}
                    title={c.name}
                  >
                    {c.name}
                  </td>
                  {resources.map((r) => {
                    const on = c.linkedResources.includes(r.id)
                    return (
                      <td key={r.id} className="p-[2px]">
                        <div
                          className={cn(
                            'h-4 w-full rounded-[3px]',
                            on ? 'bg-indigo-500' : 'bg-slate-100',
                          )}
                          title={on ? `${c.name} ← ${r.name}` : `${c.name} 未挂载 ${r.name}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="w-[210px] shrink-0 space-y-2.5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <div className="text-[12px] font-medium text-amber-900">
            无软件支撑的能力项：{noSupport.length} 个
          </div>
          <div className="mt-1 space-y-0.5">
            {noSupport.map((c) => (
              <div key={c.id} className="text-[11px] leading-4 text-amber-800">· {c.name}</div>
            ))}
          </div>
          <div className="mt-1.5 text-[10.5px] text-amber-700">→ 产品线机会</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[12px] font-medium text-slate-800">
            未被任何能力项挂载的软件：{unmounted.length} 个
          </div>
          <div className="mt-1 space-y-0.5">
            {unmounted.map((r) => (
              <div key={r.id} className="text-[11px] leading-4 text-slate-600">· {r.name}</div>
            ))}
          </div>
          <div className="mt-1.5 text-[10.5px] text-slate-500">→ 该软件的教学定位需重新梳理</div>
        </div>

        <div className="rounded-lg bg-indigo-50 p-2.5 text-[10.5px] leading-4 text-indigo-900">
          40 余款实训软件按知识点与能力项挂载上来之后，才算得出这两笔账 ——
          从「卖软件」升级为「卖专业解决方案」。
        </div>
      </div>
    </div>
  )
}

/* ── 页面 ───────────────────────────────────────────────── */

export function DashboardPage() {
  const t = dashboard.teacher
  const g = dashboard.graph
  const neg = dashboard.negative
  const gapCount = useGraphStore((s) => s.mappings.filter((m) => m.type === '缺口映射' && m.status !== '已驳回').length)

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* ① 教师侧指标 —— 第一优先级 */}
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-semibold text-slate-900">教师侧指标</h2>
        <Badge variant="outline">第一优先级 · 教师是成败关键</Badge>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-3">
        <Metric label="备课时长节省率" value={pct(t.prepTimeSaved)} sub="4.5 小时 → 约 1.4 小时" tone="good" />
        <Metric label="AI 内容采纳率" value={pct(t.aiAdoptRate)} sub="教师终审后入库" />
        <Metric label="二次编辑率" value={pct(t.reEditRate)} sub="采纳前经过人工修改" />
        <Metric label="周活跃教师" value={`${t.weeklyActive.active}/${t.weeklyActive.total}`} sub="试点教研室" />
        <Metric label="次月留存率" value={pct(t.nextMonthRetention)} sub="北极星指标之一" tone="good" />
      </div>

      {/* ② 教学与图谱侧 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Panel title="班级知识掌握度" extra={<Badge variant="outline">按章节</Badge>}>
          <MasteryBars />
        </Panel>
        <Panel title="岗位能力达成度" extra={<Badge variant="outline">按任务域</Badge>}>
          <div className="flex items-center justify-center">
            <AttainmentRadar />
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-3">
        <Panel title="图谱质量">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="图谱覆盖度" value={pct(g.coverage)} />
            <Metric label="映射准确率 F1" value={String(g.f1)} sub={`P=${g.precision} / R=${g.recall}`} />
            <Metric label="缺口能力项数" value={String(gapCount)} sub="课程未覆盖" tone="warn" />
          </div>
        </Panel>

        <Panel
          title="岗课赛证 四维覆盖度"
          extra={<Badge variant="outline">本 Demo 的差异化指标</Badge>}
        >
          <div className="flex items-center justify-around">
            {dashboard.dimCoverage.map((d) => (
              <DimRing key={d.dim} dim={d.dim} value={d.value} />
            ))}
          </div>
          <div className="mt-3 rounded-md bg-violet-50 px-2.5 py-1.5 text-[11.5px] text-violet-800">
            {dashboard.dimCoverageNote}
          </div>
        </Panel>
      </div>

      {/* ③ 实训资源覆盖热力 */}
      <div className="mt-3">
        <Panel
          title="实训资源覆盖热力"
          extra={<Badge variant="outline">能力项 × 自有实训软件 · 服务产品规划决策</Badge>}
        >
          <ResourceHeatMatrix />
        </Panel>
      </div>

      {/* ④ 负向指标监控 */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <AlertOctagon className="h-4 w-4 text-red-500" />
          <span className="text-[12.5px] font-semibold text-slate-900">负向指标监控</span>
          <Badge variant="outline">与正向指标同权重看</Badge>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <Metric label="AI 内容驳回率" value={pct(neg.aiRejectRate)} sub="驳回原因回流提示词优化" />
            <Metric label="教师弃用率" value={pct(neg.teacherChurnRate)} sub="连续两周未使用" />
            <Metric label="低采纳率映射数" value={String(neg.lowAdoptMappings)} sub="已自动进入复审" tone="warn" />
            <Metric
              label="AI 生成内容无来源占比"
              value={pct(neg.unsourcedContentRate)}
              sub="无来源内容不允许出现在界面上"
              tone="good"
            />
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-[12px] leading-5 text-slate-700">{dashboard.northStar}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
