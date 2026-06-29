import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { eq } from 'drizzle-orm'
import { ChatRequestSchema } from 'shared-types/api'
import { db } from '../db/client'
import { knowledgeBases } from '../db/schema'
import { Errors } from '../errors'
import { retrieveChunks } from '../services/retrieval'
import { buildChatPrompt } from '../services/prompt'
import { streamChatCompletion } from '../services/llm'

export const chatRouter = new Hono()

// POST /api/kbs/:kbId/chat/stream(SSE 流式响应)
chatRouter.post('/api/kbs/:kbId/chat/stream', async (c) => {
    const kbId = c.req.param('kbId')!
    const body = await c.req.json()
    const parsed = ChatRequestSchema.safeParse(body)
    if (!parsed.success) {
        throw Errors.invalidParams({ issues: parsed.error.issues })
    }

    const { question, top_k, temperature, max_tokens } = parsed.data

    // 1. 查 KB
    const [kb] = await db.select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) {
        throw Errors.kbNotFound(kbId)
    }

    //2. 检索相关chunks
    const chunks = await retrieveChunks(kbId, question, top_k ?? 5)

    // 3. 拼 prompt
    const { systemPrompt, userPrompt } = buildChatPrompt(question, chunks)

    //4. SSE流式响应
    return streamSSE(c, async (stream) => {
        //4a. start 事件
        await stream.writeSSE({
            event: 'start',
            data: JSON.stringify({ type: 'start' }),
        })

        //4b. citation 事件（检索结果）
        if (chunks.length > 0) {
            await stream.writeSSE({
                event: 'citation',
                data: JSON.stringify({ 
                type: 'citation',
                    citations: chunks.map((chunk) => ({
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

        // 4c. 流式 LLM 推 chunk 事件
        try {
            let totalChunks = 0
            await streamChatCompletion(
                {
                    model: kb.chatModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: temperature ?? 0.7,
                    max_tokens: max_tokens ?? 2048,
                },
                async (c2) => {
                    if (c2.content) {
                        totalChunks++
                        await stream.writeSSE({
                            event: 'chunk',
                            data: JSON.stringify({type: 'chunk', content: c2.content }),
                        })
                    }
                    if (c2.done) {
                        await stream.writeSSE({
                            event: 'done',
                            data: JSON.stringify({type: 'done', total_tokens: totalChunks}),
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