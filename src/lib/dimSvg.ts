import type { StandardDim } from '@/types'
import { DIM_COLOR } from '@/lib/dims'

const DIMS: StandardDim[] = ['岗', '课', '赛', '证']

const SQ = 13
const GAP = 2

/**
 * 能力项节点右侧的岗课赛证四维标签条。
 * Cytoscape 无法在节点内排版子元素，这里生成一张 SVG 贴图作为 background-image。
 */
export function dimStripSvg(covered: Set<StandardDim>): string {
  const w = DIMS.length * SQ + (DIMS.length - 1) * GAP + 6
  const h = SQ + 6
  const squares = DIMS.map((d, i) => {
    const on = covered.has(d)
    const x = 3 + i * (SQ + GAP)
    return (
      `<rect x="${x}" y="3" width="${SQ}" height="${SQ}" rx="2" fill="${on ? DIM_COLOR[d] : '#CBD5E1'}"/>` +
      `<text x="${x + SQ / 2}" y="${3 + SQ / 2 + 3.4}" font-size="9" font-family="system-ui,sans-serif" ` +
      `text-anchor="middle" fill="${on ? '#ffffff' : '#94A3B8'}">${d}</text>`
    )
  }).join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" rx="3" fill="#ffffff" fill-opacity="0.94"/>${squares}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const DIM_STRIP_W = DIMS.length * SQ + (DIMS.length - 1) * GAP + 6
export const DIM_STRIP_H = SQ + 6
