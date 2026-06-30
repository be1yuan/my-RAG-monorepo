import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { eq } from 'drizzle-orm'
import { ChatRequestWithConvSchema } from 'shared-types/api'
import { db } from '../db/client'
import { knowledgeBases } from '../db/schema'
import { Errors, ApiError } from '../errors'
import { retrieveChunks } from '../services/retrieval'
import { buildChatMessages } from '../services/prompt'
import { streamChatCompletion } from '../services/llm'
import { generateAndSetTitle } from '../services/title-generator'
import {
    createConversation,
    getConversationDetail,
    addMessage,
} from '../services/conversations'
import type { RetrievedChunk } from '../services/retrieval'
import { ErrorCode } from 'shared-types'

export const chatRouter = new Hono()

// POST /api/kbs/:kbId/chat/stream(SSE 流式响应)
chatRouter.post('/api/kbs/:kbId/chat/stream', async (c) => {
    const kbId = c.req.param('kbId')!
    const body = await c.req.json()
    const parsed = ChatRequestWithConvSchema.safeParse(body)
    if (!parsed.success) {
        throw Errors.invalidParams({ issues: parsed.error.issues })
    }

    const { conversation_id: inputConvId, question, top_k, temperature, max_tokens } = parsed.data

    // 1. 查 KB
    const [kb] = await db.select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) {
        throw Errors.kbNotFound(kbId)
    }

    // 2.会话管理
    let conversationId = ''  // ⭐ 加 = '' 初始值
    let historyMessages: Awaited<ReturnType<typeof getConversationDetail>> extends infer T 
        ? T extends null ? never : T extends { messages: infer M } ? M : never
        : never = [] as never
    let isFirstTurn = false

    if (inputConvId) {
        const detail = await getConversationDetail(inputConvId)
        if (!detail) {
            throw new ApiError(
                ErrorCode.CONV_NOT_FOUND,
                404,
                `Conversation ${conversationId} not found`,
                'errors.conv_not_found',
                { conversationId }
            )
        }
        if (detail.conversation.kbId !== kbId) {
            throw new ApiError(
                ErrorCode.FORBIDDEN,
                403,
                'Conversation does not belong to this KB',
                'errors.forbidden'
            )
        }
        conversationId = inputConvId
        historyMessages = detail.messages
    }else {
        // ⭐ 没有 conversation_id → 自动创建(简化前端流程)
        const userId = c.req.header('X-User-Id') ?? null
        const conv = await createConversation(kbId, userId)
        conversationId = conv.id
        isFirstTurn = true
    }

    //3. 检索相关chunks
    const chunks = await retrieveChunks(kbId, question, top_k ?? 5)

    // ⭐ 4. 拼 messages 数组(多轮上下文)
    const messages = buildChatMessages(question, chunks, historyMessages as never)

    // ⭐ 5. 立刻写 user message(失败回滚复杂,MVP 简化:写失败不阻塞流式)
    void addMessage(conversationId, 'user', question ).catch((e) => {
        console.warn('[chat] failed to write user message:', e)
    })

    //6. SSE流式响应
    return streamSSE(c, async (stream) => {
        // 6a. start 事件(包含 conversation_id,前端可缓存)
        await stream.writeSSE({
            event: 'start',
            data: JSON.stringify({ type: 'start', conversation_id: conversationId }),
        })

       // 6b. citation 事件
        if (chunks.length > 0) {
            await stream.writeSSE({
                event: 'citation',
                data: JSON.stringify({ 
                type: 'citation',
                    citations: chunks.map((chunk: RetrievedChunk) => ({
                        chunk_id: chunk.id,
                        document_id: chunk.document_id,
                        kb_id: chunk.kb_id,
                        filename: chunk.filename,
                        snippet: chunk.snippet,
                        score: chunk.score,
                        chunk_index: chunk.chunk_index,
                    })),
                }),
            })
        }

        // 6c. 流式 LLM
        let totalChunks = 0
        let fullContent = ''  // ⭐ 收集完整 content 用于写 assistant message
        try {
            await streamChatCompletion(
                {
                    model: kb.chatModel,
                    messages,
                    temperature: temperature ?? 0.7,
                    max_tokens: max_tokens ?? 2048,
                },
                async (c2) => {
                    if (c2.content) {
                        totalChunks++
                        fullContent += c2.content
                        await stream.writeSSE({
                            event: 'chunk',
                            data: JSON.stringify({type: 'chunk', content: c2.content }),
                        })
                    }
                    if (c2.done) {
                        // ⭐ 6d. 写 assistant message(含 citations)
                        try {
                            await addMessage(
                                conversationId,
                                'assistant',
                                fullContent,
                                chunks.map((chunk: RetrievedChunk) => ({
                                    chunk_id: chunk.id,
                                    document_id: chunk.document_id,
                                    kb_id: chunk.kb_id,
                                    filename: chunk.filename,
                                    snippet: chunk.snippet,
                                    score: chunk.score,
                                    chunk_index: chunk.chunk_index,
                                }))
                            )
                        }catch (e) {
                            console.warn('[chat] failed to write assistant message:', e)
                        }
                        // ⭐ 6e. 自动生成标题(异步,不阻塞 done 事件)
                        if (isFirstTurn) {
                            void generateAndSetTitle(conversationId, question, fullContent)
                        }

                        await stream.writeSSE({
                            event: 'done',
                            data: JSON.stringify({
                                type: 'done',
                                total_tokens: totalChunks,
                                conversation_id: conversationId,
                            })
                        })
                    }
                }
            )
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            await stream.writeSSE({
                event: 'error',
                data: JSON.stringify({
                    type: 'error',
                    error: { code: 'CHAT_FAILED', message },
                }),
            })
        }
    })
})