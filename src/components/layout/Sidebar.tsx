import { NavLink } from 'react-router-dom'
import { LayoutGrid, ClipboardCheck, Sparkles, Library, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/graph', label: '双图谱映射', icon: LayoutGrid },
  { to: '/review', label: '映射审核台', icon: ClipboardCheck },
  { to: '/prep', label: 'AI 备课助手', icon: Sparkles },
  { to: '/cases', label: '岗位案例库', icon: Library },
  { to: '/dashboard', label: '教学效果看板', icon: BarChart3 },
]

export function Sidebar() {
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-4 py-4">
        <div className="text-[19px] font-semibold tracking-wide text-slate-900">融通课堂</div>
        <div className="mt-0.5 text-[11px] leading-4 text-slate-500">岗课赛证融通 AI 教学平台</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                isActive ? 'bg-primary/10 font-medium text-primary' : 'text-slate-600 hover:bg-slate-50',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-3 text-[10px] leading-4 text-slate-400">
        V1.0 · 仅教师端
        <br />
        Ctrl+D 打开讲解模式
      </div>
    </aside>
  )
}
