/**
 * 演示模式的打字机：模拟 600ms 首字延迟 + 每 12ms 一个字符。
 *
 * 游标按真实时间推进（而不是逐字符 setTimeout），长文本不会因定时器堆积而失速。
 * 用 setInterval 而不是 rAF：窗口失焦或被遮挡时 rAF 会被完全暂停，教案就冻在半句话上；
 * 定时器只会被降频，配合"按 elapsed 算目标位置"，切回来时一次补齐，不会卡死。
 */
export const FIRST_TOKEN_DELAY_MS = 600
export const CHAR_INTERVAL_MS = 12

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function typewrite(
  text: string,
  onToken?: (chunk: string, full: string) => void,
  opts: { charInterval?: number; firstDelay?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const interval = opts.charInterval ?? CHAR_INTERVAL_MS
  const firstDelay = opts.firstDelay ?? FIRST_TOKEN_DELAY_MS
  await sleep(firstDelay, opts.signal)
  if (!onToken) return text

  return new Promise<string>((resolve, reject) => {
    const start = performance.now()
    let emitted = 0
    let timer: ReturnType<typeof setInterval>

    const onAbort = () => {
      clearInterval(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    opts.signal?.addEventListener('abort', onAbort, { once: true })

    const step = () => {
      const target = Math.min(text.length, Math.floor((performance.now() - start) / interval) + 1)
      if (target > emitted) {
        const chunk = text.slice(emitted, target)
        emitted = target
        onToken(chunk, text.slice(0, emitted))
      }
      if (emitted >= text.length) {
        clearInterval(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        resolve(text)
      }
    }

    timer = setInterval(step, interval)
    step()
  })
}
