import type { Citation } from 'shared-types/api'

export interface ChatStreamHandlers {
  onStart?: () => void
  onCitation?: (citations: Citation[]) => void
  onChunk?: (chunk: string) => void
  onDone?: (totalTokens?: number) => void
  onError?: (error: { code: string; message: string }) => void
}


/**
 * POST chat stream,解析 SSE 响应
 * - 支持 abort signal(取消生成)
 * - 返回一个 unsubscribe 函数,可在组件卸载时调用
 */
export function postChatStream(
  kbId: string,
  question: string,
  handlers: ChatStreamHandlers,
  options: {
    top_k?: number
    temperature?: number
    max_tokens?: number
    signal?: AbortSignal
  } = {}
): () => void {
  const controller = new AbortController()
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort())
  }

  void (async () => {
    try {
      const response = await fetch(`/api/kbs/${kbId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          question,
          top_k: options.top_k ?? 5,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2048,
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => response.statusText)
          handlers.onError?.({ code: `HTTP_${response.status}`, message: errText })
          return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE 事件边界:\n\n(空行分隔)
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue

          //解析event: +data: 两行
          const lines = eventBlock.split('\n')
          let eventName = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim()
            }
            else if (line.startsWith('data: ')) {
              dataLine += line.slice(6)
            }
          }

          if (!dataLine) continue

          try {
                const parsed = JSON.parse(dataLine)
                // 5 种事件分派
                if (eventName === 'start') handlers.onStart?.()
                else if (eventName === 'citation') handlers.onCitation?.(parsed.citations ?? [])
                else if (eventName === 'chunk') handlers.onChunk?.(parsed.content ?? '')
                else if (eventName === 'done') handlers.onDone?.(parsed.total_tokens)
                else if (eventName === 'error') handlers.onError?.(parsed.error ?? { code: 'UNKNOWN', message: 'Unknown error' })
            } catch (e) {
                console.warn('[chat] failed to parse SSE data:', dataLine, e)
            }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
          // 用户取消,不算错误
          return
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      handlers.onError?.({ code: 'NETWORK_ERROR', message })
    }
  })()
  // 返回取消函数
  return () => controller.abort()
}