const SRC_RE = /\[\[src:([A-Za-z0-9\-_]+)\]\]/g

/**
 * 溯源角标：模型输出中的 [[src:ID]] 先转成锚点链接，再由 Markdown 的 a 组件
 * 渲染成可悬停上标。走链接而不是原始 HTML，是为了在表格、列表内部也能正确渲染，
 * 且无需 rehype-raw；用 # 片段而不是自定义协议，是因为 react-markdown 会清洗掉未知协议。
 */
export function preprocessSources(md: string) {
  let n = 0
  const ids: string[] = []
  const text = md
    .replace(SRC_RE, (_m, id: string) => {
      n += 1
      ids.push(id)
      return `[${n}](#srcref-${n}-${id})`
    })
    // 流式过程中尚未闭合的角标先隐藏，避免屏幕上闪出裸标记
    .replace(/\[\[[^\]\n]*$/, '')
  return { text, ids }
}

export function countSources(md: string) {
  return (md.match(SRC_RE) ?? []).length
}

export const SRC_HREF_PREFIX = '#srcref-'
