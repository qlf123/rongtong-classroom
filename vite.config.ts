import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 前端只认 /api/llm。vite 把它转发给 server/proxy.mjs（Express），
  // 由代理注入 Authorization 头 —— 浏览器端始终不持有密钥，同时规避 CORS。
  // 代理未启动时请求会失败，前端自动降级为演示模式（不弹窗、不阻断）。
  const proxyPort = env.PROXY_PORT || '8787'
  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      port: 5180,
      proxy: {
        '/api/llm': {
          target: `http://localhost:${proxyPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
