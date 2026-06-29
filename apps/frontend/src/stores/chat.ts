import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Citation } from 'shared-types'
import { postChatStream } from '@/api/chat'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  streaming: boolean
  error?: { code: string; message: string }
  createdAt: string
}

export const useChatStore = defineStore('chat', ()=> {
  // == 状态 ==
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const currentKbId = ref<string | null>(null)
  let abortFn: (() => void) | null = null
  let streamMessageId: string | null = null  // 当前正在累积的流消息 id

  // == 操作 ==
  function sendMessage(kbId: string, question: string) {
    if (isStreaming.value || !question.trim()) return

    currentKbId.value = kbId

    //1. 加 user message
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      streaming: false,
      createdAt: new Date().toISOString(),
    })

    //2. 加 placeholder assistant message
    streamMessageId = crypto.randomUUID()
    messages.value.push({
        id: streamMessageId,
        role: 'assistant',
        content: '',
        streaming: true,
        createdAt: new Date().toISOString(),
    })

    isStreaming.value = true

    //3. 启动流
    abortFn = postChatStream(kbId, question, {
      onStart: () => {
        // 占位 message 已建好,无需额外操作
      },
      onCitation: (citations) => {
        const msg = messages.value.find((m) => m.id === streamMessageId)
        if (msg) msg.citations = citations
      },
      onChunk: (content) => {
        const msg = messages.value.find((m) => m.id === streamMessageId)
        if (msg) msg.content += content
      },
      onDone: () => {
        const msg = messages.value.find((m) => m.id === streamMessageId)
        if (msg) msg.streaming = false
        streamMessageId = null
        isStreaming.value = false
        abortFn = null
      },
      onError: (error) => {
        const msg = messages.value.find((m) => m.id === streamMessageId)
        if (msg) {
            msg.streaming = false
            msg.error = error
        }
        streamMessageId = null
        isStreaming.value = false
        abortFn = null
      },
    })
  }

  function stopStreaming() {
    abortFn?.()
    abortFn = null
    const msg = messages.value.find((m) => m.id === streamMessageId)
    if (msg) msg.streaming = false
    streamMessageId = null
    isStreaming.value = false
  }
  function clearMessages() {
    if (isStreaming.value) stopStreaming()
    messages.value = []
  }
  return {
    messages,
    isStreaming,
    currentKbId,
    sendMessage,
    stopStreaming,
    clearMessages,
  }
})