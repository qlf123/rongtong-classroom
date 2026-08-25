import { create } from 'zustand'
import type { AiConfig, RunMode } from '@/types'

const LS_KEY = 'rongtong.aiConfig'

/** 默认走 DeepSeek；apiKey 永不硬编码，只来自 .env.local 或界面临时覆盖 */
export const DEFAULT_AI_CONFIG: AiConfig = {
  baseURL: import.meta.env.VITE_LLM_BASE_URL || 'https://api.deepseek.com/v1',
  apiKey: import.meta.env.VITE_LLM_API_KEY || '',
  model: import.meta.env.VITE_LLM_MODEL || 'deepseek-chat',
}

function loadConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) }
  } catch {
    /* localStorage 不可用时静默回退默认配置 */
  }
  return DEFAULT_AI_CONFIG
}

interface AppState {
  /** 演示模式为默认。检测不到 apiKey 时，真实模式会被静默拒绝切换 */
  mode: RunMode
  aiConfig: AiConfig
  /** 真实调用失败/超时后自动降级的提示（不弹窗、不阻断） */
  degradeNotice: string | null

  major: string
  course: string
  post: string

  speakerMode: boolean

  setMode: (m: RunMode) => void
  setAiConfig: (c: Partial<AiConfig>) => void
  resetAiConfig: () => void
  setDegradeNotice: (n: string | null) => void
  setMajor: (v: string) => void
  setCourse: (v: string) => void
  setPost: (v: string) => void
  toggleSpeakerMode: () => void
  hasApiKey: () => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'demo',
  aiConfig: loadConfig(),
  degradeNotice: null,

  major: '旅游管理/导游（高职）',
  course: '《导游业务》',
  post: '地陪导游员（初级）',

  speakerMode: false,

  setMode: (mode) => set({ mode, degradeNotice: null }),
  setAiConfig: (c) => {
    const next = { ...get().aiConfig, ...c }
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    set({ aiConfig: next })
  },
  resetAiConfig: () => {
    localStorage.removeItem(LS_KEY)
    set({ aiConfig: DEFAULT_AI_CONFIG })
  },
  setDegradeNotice: (degradeNotice) => set({ degradeNotice }),
  setMajor: (major) => set({ major }),
  setCourse: (course) => set({ course }),
  setPost: (post) => set({ post }),
  toggleSpeakerMode: () => set((s) => ({ speakerMode: !s.speakerMode })),
  hasApiKey: () => Boolean(get().aiConfig.apiKey?.trim()),
}))

/** 供非 React 环境（llm.ts）读取当前运行时配置 */
export const appStore = useAppStore
