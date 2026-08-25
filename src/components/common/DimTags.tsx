import type { CompetencyItem, StandardDim } from '@/types'
import { DIMS, dimsOf } from '@/lib/data'
import { DIM_COLOR } from '@/lib/dims'
import { cn } from '@/lib/utils'

/**
 * 岗课赛证四维标签条 —— 全 Demo 的差异化标志。
 * 覆盖到的高亮（岗橙/课蓝/赛紫/证绿），未覆盖的灰色；四维全亮时加金色外环。
 */
export function DimTags({
  ci,
  size = 12,
  showRing = true,
  className,
}: {
  ci: CompetencyItem
  size?: number
  showRing?: boolean
  className?: string
}) {
  const covered = dimsOf(ci)
  const full = covered.size === 4
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded p-0.5',
        full && showRing && 'ring-1 ring-amber-400',
        className,
      )}
      title={ci.standardRefs.map((r) => `${r.dim}：${r.ref}`).join('\n')}
    >
      {DIMS.map((d) => (
        <span
          key={d}
          style={{
            width: size,
            height: size,
            fontSize: size - 3,
            background: covered.has(d) ? DIM_COLOR[d] : '#E2E8F0',
            color: covered.has(d) ? '#fff' : '#94A3B8',
          }}
          className="inline-flex items-center justify-center rounded-[2px] font-medium leading-none"
        >
          {d}
        </span>
      ))}
    </span>
  )
}

/** 单个维度的文字标签（用于条款号列表） */
export function DimChip({ dim, className }: { dim: StandardDim; className?: string }) {
  return (
    <span
      style={{ background: DIM_COLOR[dim] }}
      className={cn('inline-flex h-4 w-4 items-center justify-center rounded-[2px] text-[10px] font-medium text-white', className)}
    >
      {dim}
    </span>
  )
}
