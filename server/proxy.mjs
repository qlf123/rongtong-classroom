// 现场演示用的极简代理：注入 Authorization 头，规避浏览器 CORS，且密钥不进浏览器。
import express from 'express'
import dotenv from 'dotenv'

// 注意：dotenv 默认只读 .env。README 让用户把密钥写进 .env.local（不入库），
// 所以这里显式按优先级加载：.env.local 覆盖 .env。
dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()
const PORT = process.env.PROXY_PORT || 8787
const DEFAULT_BASE = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'

app.use(express.json({ limit: '4mb' }))

app.all('/api/llm/*', async (req, res) => {
  const base = (req.headers['x-llm-base-url'] || DEFAULT_BASE).toString().replace(/\/$/, '')
  const key = (req.headers['x-llm-api-key'] || process.env.LLM_API_KEY || '').toString()
  const url = base + req.originalUrl.replace(/^\/api\/llm/, '')

  // 前端有 15s 超时，超时会 abort 请求；这里跟着中断上游，避免连接空转
  const ac = new AbortController()
  res.on('close', () => ac.abort())

  try {
    const upstream = await fetch(url, {
      method: req.method,
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body),
    })

    res.status(upstream.status)
    upstream.headers.forEach((v, k) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) res.setHeader(k, v)
    })

    if (!upstream.body) return res.end()
    // 流式转发，前端才能拿到逐字输出
    const reader = upstream.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (res.writableEnded) break
      res.write(Buffer.from(value))
    }
    if (!res.writableEnded) res.end()
  } catch (err) {
    // 关键：流已开始转发时响应头早已发出，此时再 res.json() 会抛
    // ERR_HTTP_HEADERS_SENT 并让整个代理进程退出——现场演示中一次超时就会把代理打死。
    if (res.headersSent) {
      if (!res.writableEnded) res.end()
    } else {
      res.status(502).json({ error: String(err) })
    }
    // 前端会自动降级到演示模式，这里只记一行，不影响后续请求
    console.warn(`  [proxy] 转发失败：${String(err).slice(0, 120)}`)
  }
})

// 现场演示的最后一道保险：任何漏网的异常都不允许让代理进程退出
process.on('uncaughtException', (err) => {
  console.warn(`  [proxy] 已忽略未捕获异常：${String(err).slice(0, 160)}`)
})
process.on('unhandledRejection', (err) => {
  console.warn(`  [proxy] 已忽略未处理的 Promise 拒绝：${String(err).slice(0, 160)}`)
})

app.listen(PORT, () => {
  console.log(`\n  融通课堂 · LLM 代理已启动  http://localhost:${PORT}`)
  console.log(`  上游 ${DEFAULT_BASE}  密钥 ${process.env.LLM_API_KEY ? '已注入' : '未配置（前端将走演示模式）'}\n`)
})
