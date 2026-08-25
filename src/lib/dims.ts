import type { MappingType, StandardDim } from '@/types'

/** 岗课赛证四维配色 —— 全站唯一来源，画布与标签条共用 */
export const DIM_COLOR: Record<StandardDim, string> = {
  岗: '#EA580C',
  课: '#2563EB',
  赛: '#7C3AED',
  证: '#059669',
}

export const DIM_BG: Record<StandardDim, string> = {
  岗: 'bg-orange-50 text-orange-700 border-orange-200',
  课: 'bg-blue-50 text-blue-700 border-blue-200',
  赛: 'bg-violet-50 text-violet-700 border-violet-200',
  证: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export const MAPPING_COLOR: Record<MappingType, string> = {
  支撑映射: '#059669',
  场景映射: '#2563EB',
  缺口映射: '#DC2626',
}

/** 置信度分档配色：≥0.85 绿、0.6–0.85 黄、<0.6 红 */
export function confidenceTone(c: number): 'high' | 'mid' | 'low' {
  if (c >= 0.85) return 'high'
  if (c >= 0.6) return 'mid'
  return 'low'
}

export const CONF_CLASS: Record<'high' | 'mid' | 'low', { bar: string; text: string }> = {
  high: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
  mid: { bar: 'bg-amber-500', text: 'text-amber-700' },
  low: { bar: 'bg-red-500', text: 'text-red-600' },
}

export const KP_COLOR = '#4F46E5'
export const CI_COLOR = '#EA580C'
