import { create } from 'zustand'
import type { Mapping, MappingCandidate, MappingStatus, MappingType } from '@/types'
import { seedMappings } from '@/lib/data'

/** 负样本基线：上线前已沉淀 3 条，加上本次会话驳回的条数 */
const NEGATIVE_BASE = 3

interface Toast {
  id: number
  text: string
}

interface GraphState {
  mappings: Mapping[]
  /** 本次会话新增的候选（用于生成后高亮） */
  lastGenerated: string[]
  toasts: Toast[]

  /** 教案/案例的采纳记录，仅用于 toast 与看板口径展示 */
  adoptedCount: number
  rejectedContentCount: number

  addCandidates: (list: MappingCandidate[]) => { added: number; skipped: number }
  confirm: (id: string) => void
  reject: (id: string, reason: string) => void
  changeType: (id: string, type: MappingType) => void
  countByStatus: (s: MappingStatus) => number
  negativeSamples: () => number
  recordAdopt: () => void
  recordContentReject: () => void
  pushToast: (text: string) => void
  dismissToast: (id: number) => void
  resetDemo: () => void
}

const REVIEWER = '王××（专业带头人）· 刘××（××国旅 带团总监）'
const today = () => new Date().toISOString().slice(0, 10)
const clone = () => seedMappings.map((m) => ({ ...m }))

let toastSeq = 0

export const useGraphStore = create<GraphState>((set, get) => ({
  mappings: clone(),
  lastGenerated: [],
  toasts: [],
  adoptedCount: 0,
  rejectedContentCount: 0,

  addCandidates: (list) => {
    const existing = new Set(get().mappings.map((m) => `${m.kpId}|${m.ciId}`))
    const fresh: Mapping[] = []
    let skipped = 0
    let seq = get().mappings.length + 1
    for (const c of list) {
      const key = `${c.kpId ?? ''}|${c.ciId}`
      if (existing.has(key)) {
        skipped += 1
        continue
      }
      existing.add(key)
      fresh.push({
        id: `M-${String(seq++).padStart(3, '0')}`,
        kpId: c.kpId ?? '',
        ciId: c.ciId,
        type: c.type,
        confidence: c.confidence,
        // 分级处理规则：< 0.6 直接转专家人工标注，其余进入待审队列
        status: c.confidence < 0.6 ? '转专家标注' : '待审',
        source: 'AI候选',
        evidence: c.evidence,
      })
    }
    set((s) => ({ mappings: [...s.mappings, ...fresh], lastGenerated: fresh.map((f) => f.id) }))
    return { added: fresh.length, skipped }
  },

  confirm: (id) =>
    set((s) => ({
      mappings: s.mappings.map((m) =>
        m.id === id ? { ...m, status: '已确认', reviewer: REVIEWER, reviewedAt: today() } : m,
      ),
    })),

  reject: (id, reason) =>
    set((s) => ({
      mappings: s.mappings.map((m) =>
        m.id === id
          ? { ...m, status: '已驳回', rejectReason: reason, reviewer: REVIEWER, reviewedAt: today() }
          : m,
      ),
    })),

  changeType: (id, type) =>
    set((s) => ({ mappings: s.mappings.map((m) => (m.id === id ? { ...m, type } : m)) })),

  countByStatus: (st) => get().mappings.filter((m) => m.status === st).length,

  negativeSamples: () => NEGATIVE_BASE + get().mappings.filter((m) => m.status === '已驳回').length,

  recordAdopt: () => set((s) => ({ adoptedCount: s.adoptedCount + 1 })),
  recordContentReject: () => set((s) => ({ rejectedContentCount: s.rejectedContentCount + 1 })),

  pushToast: (text) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, text }] }))
    setTimeout(() => get().dismissToast(id), 3600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  /** 一键重置：审核状态、采纳记录恢复初始，方便讲第二遍 */
  resetDemo: () =>
    set({ mappings: clone(), lastGenerated: [], adoptedCount: 0, rejectedContentCount: 0, toasts: [] }),
}))
