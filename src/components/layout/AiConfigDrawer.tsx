import { useState } from 'react'
import { RotateCcw, Settings2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/appStore'
import { useGraphStore } from '@/store/graphStore'

export function AiConfigDrawer() {
  const { aiConfig, setAiConfig, resetAiConfig } = useAppStore()
  const resetDemo = useGraphStore((s) => s.resetDemo)
  const pushToast = useGraphStore((s) => s.pushToast)
  const [draft, setDraft] = useState(aiConfig)

  return (
    <Sheet onOpenChange={(o) => o && setDraft(aiConfig)}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          AI 配置
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px]">
        <SheetHeader>
          <SheetTitle>AI 配置</SheetTitle>
          <SheetDescription>
            OpenAI Chat Completions 兼容格式，DeepSeek / 通义千问 / 智谱 GLM / Kimi 均可直接接入。
            此处填写的值仅存于本机 localStorage，不写入源码。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="baseURL">Base URL</Label>
            <Input
              id="baseURL"
              value={draft.baseURL}
              onChange={(e) => setDraft({ ...draft, baseURL: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="deepseek-chat"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              placeholder="留空则使用代理服务端 .env.local 中的密钥"
            />
            <p className="text-[11px] leading-4 text-slate-500">
              推荐把密钥写进 <code className="rounded bg-slate-100 px-1">.env.local</code> 的{' '}
              <code className="rounded bg-slate-100 px-1">LLM_API_KEY</code>，由代理注入
              Authorization 头，浏览器端不持有密钥。
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setAiConfig(draft)
                pushToast('AI 配置已保存到本机')
              }}
            >
              保存配置
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetAiConfig()
                setDraft(useAppStore.getState().aiConfig)
                pushToast('已恢复默认配置')
              }}
            >
              恢复默认
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="text-[13px] font-medium text-amber-900">现场演示保障</div>
          <p className="mt-1 text-[11px] leading-4 text-amber-800">
            把审核状态、采纳记录、生成的候选映射恢复到初始，便于重讲一遍。
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 gap-1.5 border-amber-300 bg-white"
            onClick={() => {
              resetDemo()
              pushToast('演示数据已重置')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置演示数据
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
