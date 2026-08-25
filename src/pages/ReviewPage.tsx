import { useState } from 'react'
import { Check, Info, X } from 'lucide-react'
import type { Mapping, MappingStatus, MappingType } from '@/types'
import { ciById, dashboard, kpById } from '@/lib/data'
import { CONF_CLASS, MAPPING_COLOR, confidenceTone } from '@/lib/dims'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DimTags } from '@/components/common/DimTags'
import { useGraphStore } from '@/store/graphStore'
import { cn } from '@/lib/utils'

const TABS: { key: MappingStatus; label: string }[] = [
  { key: '待审', label: '待审' },
  { key: '转专家标注', label: '转专家标注' },
  { key: '已确认', label: '已确认' },
  { key: '复审中', label: '复审中' },
]

const REJECT_PRESETS = [
  '语义相关但不构成教学支撑关系',
  '知识点颗粒度过粗，无法对应该岗位动作',
  '该能力项应由其他知识点支撑，映射对象错误',
  '岗位任务已变更，标准条款失效',
]

function ConfidenceBar({ value }: { value: number }) {
  const tone = CONF_CLASS[confidenceTone(value)]
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={cn('w-8 text-[11.5px] font-medium', tone.text)}>{value.toFixed(2)}</span>
    </div>
  )
}

function RejectBox({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (r: string) => void }) {
  const [preset, setPreset] = useState(REJECT_PRESETS[0])
  const [extra, setExtra] = useState('')
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
      <div className="text-[12px] font-medium text-red-800">驳回必须填写理由 · 该条将进入负样本集</div>
      <div className="mt-2 flex gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="h-8 w-[320px] bg-white text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REJECT_PRESETS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        className="mt-2 bg-white text-[12px]"
        placeholder="补充说明（可选）：写清专家判定的依据，便于下一轮提示词与规则优化"
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="destructive" onClick={() => onSubmit(extra ? `${preset}。${extra}` : preset)}>
          确认驳回
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}

function Row({ m }: { m: Mapping }) {
  const { confirm, reject, changeType, pushToast } = useGraphStore()
  const [rejecting, setRejecting] = useState(false)
  const kp = kpById.get(m.kpId)
  const ci = ciById.get(m.ciId)
  const actionable = m.status === '待审' || m.status === '转专家标注' || m.status === '复审中'

  return (
    <>
      <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
        <td className="px-3 py-2.5">
          <div className="text-[12.5px] text-slate-800">{kp ? kp.name : '（无支撑知识点）'}</div>
          <div className="text-[10.5px] text-slate-400">{kp ? `${kp.id} · ${kp.chapter}` : m.id}</div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] text-slate-800">{ci?.name}</span>
            {ci && <DimTags ci={ci} size={10} />}
          </div>
          <div className="text-[10.5px] text-slate-400">{ci?.id}</div>
        </td>
        <td className="px-3 py-2.5">
          {actionable ? (
            <Select value={m.type} onValueChange={(v) => { changeType(m.id, v as MappingType); pushToast(`已改为${v}`) }}>
              <SelectTrigger className="h-7 w-[104px] text-[11.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['支撑映射', '场景映射', '缺口映射'] as const).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge style={{ background: `${MAPPING_COLOR[m.type]}1a`, color: MAPPING_COLOR[m.type] }}>
              {m.type}
            </Badge>
          )}
        </td>
        <td className="px-3 py-2.5">
          <ConfidenceBar value={m.confidence} />
        </td>
        <td className="max-w-[300px] px-3 py-2.5 text-[11.5px] leading-4 text-slate-600">
          {m.evidence}
          {m.rejectReason && (
            <div className="mt-1 text-[11px] text-red-600">驳回：{m.rejectReason}</div>
          )}
          {typeof m.teacherAdoptRate === 'number' && m.teacherAdoptRate < 0.4 && (
            <div className="mt-1 text-[11px] text-violet-700">
              触发原因：教师采纳率 {Math.round(m.teacherAdoptRate * 100)}% 低于阈值 40%
            </div>
          )}
        </td>
        <td className="px-3 py-2.5">
          <Badge variant={m.source === 'AI候选' ? 'warning' : 'default'}>{m.source}</Badge>
          {m.reviewer && <div className="mt-1 text-[10.5px] leading-4 text-slate-500">{m.reviewer}</div>}
        </td>
        <td className="px-3 py-2.5">
          {actionable ? (
            <div className="flex gap-1.5">
              <Button
                size="xs"
                className="gap-1"
                onClick={() => { confirm(m.id); pushToast(`${m.id} 已确认 · 双人签署已记录`) }}
              >
                <Check className="h-3 w-3" />
                确认
              </Button>
              <Button size="xs" variant="outline" className="gap-1" onClick={() => setRejecting(true)}>
                <X className="h-3 w-3" />
                驳回
              </Button>
            </div>
          ) : (
            <Badge variant="success">{m.status}</Badge>
          )}
        </td>
      </tr>
      {rejecting && (
        <tr>
          <td colSpan={7} className="px-3 pb-3">
            <RejectBox
              onCancel={() => setRejecting(false)}
              onSubmit={(r) => {
                reject(m.id, r)
                setRejecting(false)
                pushToast('已驳回 · 该条已进入负样本集')
              }}
            />
          </td>
        </tr>
      )}
    </>
  )
}

export function ReviewPage() {
  const { mappings, countByStatus, negativeSamples } = useGraphStore()
  const [tab, setTab] = useState<MappingStatus>('待审')
  const rows = mappings.filter((m) => m.status === tab)
  const g = dashboard.graph

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* 规则说明横幅 —— 写死在界面上的产品逻辑 */}
      <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-[12px] leading-5 text-slate-700">
          <span className="font-medium text-slate-900">分级处理规则：</span>
          置信度 ≥ 0.85 进入待审队列（专家快审）；0.6–0.85 需双人确认（校方专业带头人 + 企业专家）；
          &lt; 0.6 直接转专家人工标注。上线后，教师采纳率连续低于 40% 的映射自动进入复审。
          <div className="mt-1 text-slate-500">
            AI 只出候选，人做终审。被驳回的候选进入负样本集，用于下一轮提示词与规则优化。
          </div>
        </div>
        <div className="ml-auto shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
          <div className="text-[10.5px] text-slate-500">当前映射准确率（只读）</div>
          <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
            P={g.precision} / R={g.recall} / F1={g.f1}
          </div>
          <div className="text-[10px] text-slate-400">
            基准：专家标注金标准集 {g.goldStandardSize} 条
          </div>
        </div>
      </div>

      <div className="mt-3.5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as MappingStatus)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                <span className="rounded bg-slate-200/80 px-1 text-[10.5px] text-slate-600">
                  {countByStatus(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">知识点</th>
              <th className="px-3 py-2 text-left font-medium">能力项</th>
              <th className="px-3 py-2 text-left font-medium">映射类型</th>
              <th className="px-3 py-2 text-left font-medium">置信度</th>
              <th className="px-3 py-2 text-left font-medium">AI 判定依据</th>
              <th className="px-3 py-2 text-left font-medium">来源 / 审核人</th>
              <th className="px-3 py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((m) => <Row key={m.id} m={m} />)
            ) : (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-[12.5px] text-slate-400">
                  该队列已清空
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-600">
        <Badge variant="danger">负样本集</Badge>
        已沉淀负样本 {negativeSamples()} 条 → 用于下一轮提示词与规则优化
        <span className="ml-auto text-[11px] text-slate-400">
          已驳回 {countByStatus('已驳回')} 条（本轮）· 历史沉淀 3 条
        </span>
      </div>
    </div>
  )
}
