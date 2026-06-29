/**
 * LM Studio OpenAI 兼容 chat API 客户端
 * POST {LMSTUDIO_BASE_URL}/chat/completions
 */
import { config } from '../config'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatCompletionOptions {
    model: string
    messages: ChatMessage[]
    temperature?: number
    max_tokens?: number
    stream?: boolean
}

export interface ChatCompletionChunk {
    content: string
    done: boolean
}
/**
 * 流式 chat completion,逐 chunk 回调
 * SSE 协议: data: {json}\n\n  /  data: [DONE]\n\n
 */
export async function streamChatCompletion (
    option: ChatCompletionOptions,
    onChunk: (chunk: ChatCompletionChunk) => Promise<void> | void,
): Promise<void> {
    const response = await fetch(`${config.LMSTUDIO_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: option.model,
            messages: option.messages,
            temperature: option.temperature ?? 0.7,
            max_tokens: option.max_tokens ?? 2048,
            stream: true,
        }),
    })

    if (!response.ok) { 
        const errText = await response.text().catch(() => '未知错误')
        throw new Error(`LM Studio chat API 失败: ${response.status} ${errText}`)
    }

    if (!response.body) {
        throw new Error('LM Studio chat API 返回空 body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value} = await reader.read()
            if (done) break
            buffer += decoder.decode(value, {stream: true})

            // SSE跨chunk边界处理： 切分后保留最后一行
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith('data:')) continue
                const data = trimmed.slice(6)
                if (data === '[DONE]') {
                    await onChunk({ content: '', done: true})
                    return
                }
                try {
                    const json = JSON.parse(data)
                    // OpenAI 协议: choices[0].delta.content(流式增量)
                    const content = json.choices?.[0]?.delta?.content ?? ''
                    if (content) {
                        await onChunk({ content, done: false})
                    }
                } catch (err) {
                    // skip malformed lines
                    continue
                }
            }
        }
        await onChunk({ content: '', done: true})
    } catch (err) {
        console.error('LM Studio chat API 流式返回错误:', err)
        throw err
    } finally {
        reader.releaseLock()
    }
}