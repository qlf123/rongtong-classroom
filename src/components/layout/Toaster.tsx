import { useGraphStore } from '@/store/graphStore'

export function Toaster() {
  const toasts = useGraphStore((s) => s.toasts)
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg bg-slate-900/92 px-3.5 py-2 text-[12.5px] text-white shadow-lg"
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
