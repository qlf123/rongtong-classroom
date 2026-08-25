import type { ChatMessage, ChatOptions, ChatResult } from '@/types'
import { appStore } from '@/store/appStore'
import { MOCKS, typewrite, sleep } from '@/mock'

/** 真实调用超时阈值：超过即降级到演示模式 */
const LIVE_TIMEOUT_MS = 15_000
/** 开发期经 Vite server.proxy / 现场经 Express 代理转发，规避 CORS 并注入 Authorization */
const PROXY_PATH = '/api/llm/chat/completions'

/** 演示模式：预置内容 + 打字机，观感与真实流式一致 */
async function runDemo(opts: ChatOptions): Promise<string> {
  const text = MOCKS[opts.callPoint]
  if (opts.stream) return typewrite(text, opts.onToken, { signal: opts.signal })
  await sleep(900, opts.signal)
  opts.onToken?.(text, text)
  return text
}

/** 解析 OpenAI 兼容的 SSE 流 */
async function readStream(
  res: Response,
  onToken?: (chunk: string, full: string) => void,
): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应无可读流')
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onToken?.(delta, full)
        }
      } catch {
        /* 忽略心跳与不完整分片 */
      }
    }
  }
  return full
}

async function runLive(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const { aiConfig } = appStore.getState()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), LIVE_TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })

  try {
    const res = await fetch(PROXY_PATH, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        // 代理优先使用服务端环境变量；界面临时覆盖时才透传这两个头
        'x-llm-base-url': aiConfig.baseURL,
        ...(aiConfig.apiKey ? { 'x-llm-api-key': aiConfig.apiKey } : {}),
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        stream: Boolean(opts.stream),
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!res.ok) throw new Error(`LLM ${res.status}`)

    if (opts.stream) return await readStream(res, opts.onToken)
    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    opts.onToken?.(content, content)
    return content
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 统一入口。演示模式与真实模式返回同构结果，上层组件不需要分支。
 * 真实调用失败或超过 15s，自动降级到演示模式并写入降级提示（不弹窗、不阻断）。
 */
export async function chat(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
  const { mode, setDegradeNotice } = appStore.getState()

  // 默认演示模式；真实模式下密钥可能只存在于代理服务端，此处不再前置校验，
  // 调用失败会在下方自动降级。
  if (mode === 'demo') {
    const content = await runDemo(opts)
    return { content, via: 'demo' }
  }

  try {
    const content = await runLive(messages, opts)
    if (!content.trim()) throw new Error('空响应')
    return { content, via: 'live' }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError' && opts.signal?.aborted) throw err
    const reason = (err as Error)?.message?.includes('aborted') ? '请求超时（>15s）' : '接口调用失败'
    setDegradeNotice(`${reason} · 已自动降级为演示模式`)
    const content = await runDemo(opts)
    return { content, via: 'fallback' }
  }
}

/** 宽容解析模型返回的 JSON（真实模型偶尔会包 ```json 围栏） */
export function parseJson<T>(raw: string): T | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T
      } catch {
        return null
      }
    }
    return null
  }
}
