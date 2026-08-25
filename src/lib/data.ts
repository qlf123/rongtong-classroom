import type {
  CompetencyItem,
  EnterpriseCase,
  KnowledgePoint,
  Mapping,
  StandardDim,
  TrainingResource,
} from '@/types'
import resourcesRaw from '@/data/resources.json'
import kpRaw from '@/data/knowledgePoints.json'
import ciRaw from '@/data/competencyItems.json'
import mappingsRaw from '@/data/mappings.json'
import casesRaw from '@/data/cases.json'
import dashboardRaw from '@/data/dashboard.json'
import speakerNotesRaw from '@/data/speakerNotes.json'

export const resources = resourcesRaw as TrainingResource[]
export const knowledgePoints = kpRaw as KnowledgePoint[]
export const competencies = ciRaw as CompetencyItem[]
export const seedMappings = mappingsRaw as Mapping[]
export const cases = casesRaw as EnterpriseCase[]
export const dashboard = dashboardRaw
export const speakerNotes = speakerNotesRaw as Record<
  string,
  { title: string; duration: string; points: string[] }
>

export const DIMS: StandardDim[] = ['岗', '课', '赛', '证']

export const kpById = new Map(knowledgePoints.map((k) => [k.id, k]))
export const ciById = new Map(competencies.map((c) => [c.id, c]))
export const resById = new Map(resources.map((r) => [r.id, r]))
export const caseById = new Map(cases.map((c) => [c.id, c]))

export const chapters = Array.from(new Set(knowledgePoints.map((k) => k.chapter)))

/** 某能力项覆盖到的维度集合 */
export function dimsOf(ci: CompetencyItem): Set<StandardDim> {
  return new Set(ci.standardRefs.map((r) => r.dim))
}

/** 四维全覆盖 = 专业建设的核心能力，画布上加金色外环 */
export function isFullCoverage(ci: CompetencyItem): boolean {
  return dimsOf(ci).size === 4
}

export function resourceName(id: string): string {
  return resById.get(id)?.name ?? id
}

/** 溯源角标 [[src:ID]] 的来源解析：知识点 / 能力项 / 案例 / 实训资源 */
export function resolveSource(id: string): { label: string; detail: string } | null {
  const kp = kpById.get(id)
  if (kp) return { label: `《导游业务》${kp.chapter} · ${kp.name}`, detail: kp.resources[0]?.ref ?? kp.desc }
  const ci = ciById.get(id)
  if (ci) return { label: `能力项 ${ci.id} · ${ci.name}`, detail: ci.standardRefs.map((r) => `${r.dim}：${r.ref}`).join('；') }
  const cs = caseById.get(id)
  if (cs) return { label: `企业案例库 ${cs.id} · ${cs.company}${cs.desensitized ? ' 已脱敏' : ''}`, detail: cs.title }
  const rs = resById.get(id)
  if (rs) return { label: `实训资源 ${rs.name}`, detail: `${rs.kind} · 自有产品` }
  return null
}
