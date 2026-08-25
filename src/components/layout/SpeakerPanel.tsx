import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { speakerNotes } from '@/lib/data'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

const KEY_BY_PATH: Record<string, string> = {
  '/graph': 'graph',
  '/review': 'review',
  '/prep': 'prep',
  '/cases': 'cases',
  '/dashboard': 'dashboard',
}

/** Ctrl+D 打开的讲解模式侧栏，内容读自 src/data/speakerNotes.json */
export function SpeakerPanel() {
  const { speakerMode, toggleSpeakerMode } = useAppStore()
  const { pathname } = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        toggleSpeakerMode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSpeakerMode])

  const note = speakerNotes[KEY_BY_PATH[pathname] ?? 'graph']
  if (!speakerMode || !note) return null

  return (
    <div
      className={cn(
        'fixed right-4 top-16 z-40 w-[330px] rounded-lg border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-2xl',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[13px] font-semibold">{note.title}</div>
          <div className="text-[11px] text-slate-400">讲解模式 · 建议 {note.duration}</div>
        </div>
        <button onClick={toggleSpeakerMode} className="rounded p-1 hover:bg-slate-800">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {note.points.map((p, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-5 text-slate-200">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px]">
              {i + 1}
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
        Ctrl+D 关闭 · 仅演示者可见
      </div>
    </div>
  )
}
