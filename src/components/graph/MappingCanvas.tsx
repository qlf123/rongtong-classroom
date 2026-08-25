import { useEffect, useMemo, useRef } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import type { Mapping, StandardDim } from '@/types'
import { competencies, dimsOf, knowledgePoints } from '@/lib/data'
import { CI_COLOR, KP_COLOR, MAPPING_COLOR } from '@/lib/dims'
import { DIM_STRIP_H, DIM_STRIP_W, dimStripSvg } from '@/lib/dimSvg'

export type Selection =
  | { kind: 'kp'; id: string }
  | { kind: 'ci'; id: string }
  | { kind: 'mapping'; id: string }
  | null

/** 左右两列固定分区：左=知识点（学校语言），右=能力项（产业语言） */
const KP_X = 0
const CI_X = 480
const ROW_H = 46
const GAP_NODE = 'GAP-SRC'

function buildElements(
  mappings: Mapping[],
  chapter: string | null,
  dim: StandardDim | null,
): ElementDefinition[] {
  const cis = dim ? competencies.filter((c) => dimsOf(c).has(dim)) : competencies
  const ciIds = new Set(cis.map((c) => c.id))

  const live = mappings.filter((m) => m.status !== '已驳回' && ciIds.has(m.ciId))
  // 按四维筛选时，左列只保留仍有映射的知识点，视图才不会留下大片空白
  const kpAllowed = new Set(live.map((m) => m.kpId).filter(Boolean))
  const kps = knowledgePoints.filter(
    (k) => (!chapter || k.chapter === chapter) && (!dim || kpAllowed.has(k.id)),
  )
  const kpIds = new Set(kps.map((k) => k.id))

  const hasGap = live.some((m) => m.type === '缺口映射' || !m.kpId)
  const kpSlots = kps.length + (hasGap ? 1 : 0)
  const rows = Math.max(kpSlots, cis.length)
  const totalH = rows * ROW_H
  const yOf = (i: number, n: number) => ((i + 0.5) * totalH) / n

  const els: ElementDefinition[] = []

  kps.forEach((k, i) => {
    els.push({
      data: { id: k.id, label: k.name, kind: 'kp' },
      position: { x: KP_X, y: yOf(i, kpSlots) },
      classes: 'kp',
    })
  })

  cis.forEach((c, i) => {
    const covered = dimsOf(c)
    els.push({
      data: { id: c.id, label: c.name, kind: 'ci', strip: dimStripSvg(covered) },
      position: { x: CI_X, y: yOf(i, cis.length) },
      classes: `ci${covered.size === 4 ? ' full' : ''}`,
    })
  })

  // 缺口映射没有支撑知识点，用左列末位一个红色节点承载，让"缺口"在画布上看得见
  if (hasGap) {
    els.push({
      data: { id: GAP_NODE, label: '课程未覆盖\n（无支撑知识点）', kind: 'gap' },
      position: { x: KP_X, y: yOf(kpSlots - 1, kpSlots) },
      classes: 'gapnode',
    })
  }

  // 左列内部的先修关系（浅灰虚线）
  kps.forEach((k) => {
    k.prereq.forEach((p) => {
      if (!kpIds.has(p)) return
      els.push({ data: { id: `pre-${p}-${k.id}`, source: p, target: k.id }, classes: 'prereq' })
    })
  })

  live.forEach((m) => {
    const isGap = m.type === '缺口映射' || !m.kpId
    if (!isGap && !kpIds.has(m.kpId)) return
    const cls = [
      m.type === '支撑映射' ? 'support' : m.type === '场景映射' ? 'scene' : 'gap',
      m.status === '待审' ? 'pending' : '',
      m.status === '转专家标注' ? 'expert' : '',
      m.status === '复审中' ? 'recheck' : '',
    ]
      .filter(Boolean)
      .join(' ')
    els.push({
      data: {
        id: m.id,
        source: isGap ? GAP_NODE : m.kpId,
        target: m.ciId,
        w: 1 + m.confidence * 3,
        kind: 'mapping',
      },
      classes: cls,
    })
  })

  return els
}

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      shape: 'round-rectangle',
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '164px',
      'font-size': '13px',
      'font-family': 'system-ui, sans-serif',
      color: '#ffffff',
      'text-valign': 'center',
      'text-halign': 'center',
      width: 186,
      height: 36,
      'border-width': 0,
    },
  },
  { selector: 'node.kp', style: { 'background-color': KP_COLOR } },
  {
    selector: 'node.ci',
    style: {
      'background-color': CI_COLOR,
      width: 244,
      'text-max-width': '172px',
      'text-margin-x': -28,
      'background-image': 'data(strip)',
      'background-image-containment': 'over',
      'background-fit': 'none',
      'background-width': `${DIM_STRIP_W}px`,
      'background-height': `${DIM_STRIP_H}px`,
      'background-position-x': '100%',
      'background-position-y': '50%',
      'background-offset-x': -6,
      'background-clip': 'none',
    },
  },
  // 四维全覆盖 = 金色外环
  { selector: 'node.full', style: { 'border-width': 3, 'border-color': '#F59E0B' } },
  // 缺口能力项加红色描边
  {
    selector: 'node.gapci',
    style: { 'border-width': 2.5, 'border-color': '#DC2626', 'border-style': 'dashed' },
  },
  {
    selector: 'node.gapnode',
    style: {
      'background-color': '#FEF2F2',
      'border-width': 1.5,
      'border-color': '#DC2626',
      'border-style': 'dashed',
      color: '#B91C1C',
      'font-size': '11px',
      width: 148,
      height: 38,
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      width: 'data(w)',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.7,
      opacity: 0.85,
    },
  },
  {
    selector: 'edge.prereq',
    style: {
      'curve-style': 'unbundled-bezier',
      'control-point-distances': [-92],
      'control-point-weights': [0.5],
      width: 1,
      'line-color': '#CBD5E1',
      'line-style': 'dashed',
      'target-arrow-color': '#CBD5E1',
      'arrow-scale': 0.6,
      opacity: 0.8,
    },
  },
  {
    selector: 'edge.support',
    style: { 'line-color': MAPPING_COLOR.支撑映射, 'target-arrow-color': MAPPING_COLOR.支撑映射 },
  },
  {
    selector: 'edge.scene',
    style: { 'line-color': MAPPING_COLOR.场景映射, 'target-arrow-color': MAPPING_COLOR.场景映射 },
  },
  {
    selector: 'edge.gap',
    style: {
      'line-color': MAPPING_COLOR.缺口映射,
      'target-arrow-color': MAPPING_COLOR.缺口映射,
      'line-style': 'dashed',
      width: 2.5,
    },
  },
  // 待审：半透明黄色虚线
  {
    selector: 'edge.pending',
    style: {
      'line-color': '#F59E0B',
      'target-arrow-color': '#F59E0B',
      'line-style': 'dashed',
      opacity: 0.5,
    },
  },
  {
    selector: 'edge.expert',
    style: {
      'line-color': '#94A3B8',
      'target-arrow-color': '#94A3B8',
      'line-style': 'dotted',
      opacity: 0.55,
    },
  },
  {
    selector: 'edge.recheck',
    style: {
      'line-color': '#7C3AED',
      'target-arrow-color': '#7C3AED',
      'line-style': 'dashed',
      opacity: 0.7,
    },
  },
  { selector: '.faded', style: { opacity: 0.15 } },
  { selector: '.picked', style: { 'border-width': 3, 'border-color': '#0F172A' } },
  { selector: '.edge-picked', style: { opacity: 1, width: 5 } },
]

export function MappingCanvas({
  mappings,
  selection,
  onSelect,
  chapterFilter,
  dimFilter,
}: {
  mappings: Mapping[]
  selection: Selection
  onSelect: (s: Selection) => void
  chapterFilter: string | null
  dimFilter: StandardDim | null
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const selectionRef = useRef(selection)
  selectionRef.current = selection

  const elements = useMemo(
    () => buildElements(mappings, chapterFilter, dimFilter),
    [mappings, chapterFilter, dimFilter],
  )
  const gapCiIds = useMemo(
    () => mappings.filter((m) => m.type === '缺口映射' && m.status !== '已驳回').map((m) => m.ciId),
    [mappings],
  )

  useEffect(() => {
    if (!boxRef.current) return
    const cy = cytoscape({
      container: boxRef.current,
      elements,
      style: STYLE,
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 2,
      boxSelectionEnabled: false,
      autoungrabify: true,
    })
    cyRef.current = cy
    // 开发期调试句柄，便于在控制台检查高亮/筛选是否生效
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__cy = cy
    gapCiIds.forEach((id) => cy.getElementById(id).addClass('gapci'))

    /**
     * 初始化时容器可能还没拿到最终尺寸（此时 fit 会失效，画布看起来是空的）。
     * 用 ResizeObserver 兜住：它在 observe 时立刻触发一次，之后窗口变化也会重新适配；
     * 有选中时不抢镜头，避免和"点开放大到相关子图"的动画打架。
     */
    let raf = 0
    const ro = new ResizeObserver(() => {
      cy.resize()
      // 紧跟 resize 调 fit 会读到旧的画布尺寸，推到下一帧才拿得到最终值
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!selectionRef.current) cy.fit(undefined, 42)
      })
    })
    ro.observe(boxRef.current)

    cy.on('tap', 'node', (e) => {
      const kind = e.target.data('kind')
      if (kind === 'gap') return
      selectRef.current({ kind, id: e.target.id() } as Selection)
    })
    cy.on('tap', 'edge', (e) => {
      if (e.target.hasClass('prereq')) return
      selectRef.current({ kind: 'mapping', id: e.target.id() })
    })
    cy.on('tap', (e) => {
      if (e.target === cy) selectRef.current(null)
    })

    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      cy.destroy()
      cyRef.current = null
    }
  }, [elements, gapCiIds])

  /**
   * 选中高亮：相关元素保持不变，其余降到 15% 透明度；
   * 同时把视图收到相关子图上 —— 全景下文字偏小，点开即放大到可读。
   */
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded picked edge-picked')

    if (!selection) {
      cy.animate({ fit: { eles: cy.elements(), padding: 42 }, duration: 260 })
      return
    }

    const el = cy.getElementById(selection.id)
    if (!el.length) return

    if (selection.kind === 'mapping') {
      const keep = el.union(el.connectedNodes())
      cy.elements().not(keep).addClass('faded')
      el.addClass('edge-picked')
      cy.animate({ fit: { eles: keep, padding: 130 }, duration: 260 })
      return
    }

    const edges = el.connectedEdges().not('.prereq')
    const keep = el.union(edges).union(edges.connectedNodes())
    cy.elements().not(keep).addClass('faded')
    el.addClass('picked')
    cy.animate({ fit: { eles: keep, padding: 60 }, duration: 260 })
  }, [selection, elements])

  return <div ref={boxRef} className="h-full w-full bg-white" />
}
