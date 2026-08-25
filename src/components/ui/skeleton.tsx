import { cn } from '@/lib/utils'

/** AI 请求期间的骨架屏：不出现白屏，也不让按钮无反馈 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />
}

export function BlockSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i % 3 === 2 ? 'w-3/5' : i % 3 === 1 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  )
}
