import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AiConfigDrawer } from './AiConfigDrawer'
import { useAppStore } from '@/store/appStore'
import { useGraphStore } from '@/store/graphStore'

const MAJORS = ['旅游管理/导游（高职）', '酒店管理与数字化运营（高职）', '研学旅行管理与服务（高职）']
const COURSES = ['《导游业务》', '《全国导游基础知识》', '《旅游政策法规》']
const POSTS = ['地陪导游员（初级）', '全陪导游员（初级）', '研学导师（初级）']

export function TopBar() {
  const { mode, setMode, major, course, post, setMajor, setCourse, setPost, degradeNotice, hasApiKey } =
    useAppStore()
  const pushToast = useGraphStore((s) => s.pushToast)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">专业</span>
        <Select value={major} onValueChange={setMajor}>
          <SelectTrigger className="h-8 w-[196px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAJORS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">课程</span>
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="h-8 w-[168px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COURSES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">目标岗位</span>
        <Select value={post} onValueChange={setPost}>
          <SelectTrigger className="h-8 w-[164px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSTS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {degradeNotice && (
          <span className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            {degradeNotice}
          </span>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1">
          {mode === 'demo' ? (
            <WifiOff className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <span className="text-[12px] text-slate-600">{mode === 'demo' ? '演示模式' : '真实 API'}</span>
          <Switch
            checked={mode === 'live'}
            onCheckedChange={(on) => {
              setMode(on ? 'live' : 'demo')
              if (on && !hasApiKey()) {
                pushToast('已切换真实 API · 将使用代理服务端的密钥，失败会自动降级为演示模式')
              }
            }}
          />
        </div>

        <AiConfigDrawer />
      </div>
    </header>
  )
}
