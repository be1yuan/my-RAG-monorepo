import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { knowledgeBases } from '../db/schema'
import { ApiError, Errors } from '../errors'
import { ErrorCode } from 'shared-types'
import {
    createConversation,
    listConversations,
    getConversationDetail,
    updateConversationTitle,
    deleteConversation,
    toConvApi,
    toMsgApi,
} from '../services/conversations'

export const conversationsRouter = new Hono()
// ============ 路由顺序:静态路径在动态参数之前 ============
// GET /api/kbs/:kbId/conversations(列表)
conversationsRouter.get('/api/kbs/:kbId/conversations', async (c) => {
    const kbId = c.req.param('kbId')!

    // 1. KB 存在性校验
    const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) {
        throw Errors.kbNotFound(kbId)
    }

    const rows = await listConversations(kbId)
    return c.json({conversations: rows.map(toConvApi)}) // 2. 转换为 API 格式
})

// POST /api/kbs/:kbId/conversations(创建)
conversationsRouter.post('/api/kbs/:kbId/conversations', async (c) => {
    const kbId = c.req.param('kbId')!
    const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) throw Errors.kbNotFound(kbId)

    // const body = await c.req.json().catch(() => ({}))
    // MVP:userId 从 header X-User-Id 拿(沿用 M1 的 getUserId)
    const userId = c.req.header('X-User-Id') ?? null

    const row = await createConversation(kbId, userId)
    return c.json({conversation: toConvApi(row)}, 201)
})

// GET /api/kbs/:kbId/conversations/:convId(详情)
conversationsRouter.get('/api/kbs/:kbId/conversations/:convId', async (c) => {
    const convId = c.req.param('convId')!
    const kbId = c.req.param('kbId')!
    if (!kbId) throw Errors.kbNotFound(kbId)

    const detail = await getConversationDetail(convId)
    if (!detail) {
        throw new ApiError(
            ErrorCode.CONV_NOT_FOUND,
            404,
            `Conversation ${convId} not found`,
            'errors.conv_not_found',
            { conversation_id: convId }
        )
    }

    // 验证 convId 属于URL的 kbId
    if (detail.conversation.kbId !== kbId) {
        throw new ApiError(
            ErrorCode.FORBIDDEN,
            403,
            'Conversation does not belong to this KB',
            'errors.forbidden'
        )
    }

    return c.json({
        conversation: toConvApi(detail.conversation),
        messages: detail.messages.map(toMsgApi),
    })
})

// PATCH /api/kbs/:kbId/conversations/:convId(改标题)
conversationsRouter.patch('/api/kbs/:kbId/conversations/:convId', async (c) => {
    const convId = c.req.param('convId')!
    const body = await c.req.json()
    const parsed = z.object({title: z.string().min(1).max(200)}).safeParse(body)
    if (!parsed.success) throw Errors.invalidParams({ issues: parsed.error.issues })

    const row = await updateConversationTitle(convId, parsed.data.title)
    if (!row) {
        throw new ApiError(
            ErrorCode.CONV_NOT_FOUND,
            404,
            `Conversation ${convId} not found`,
            'errors.conv_not_found',
            { conversation_id: convId }
        )
    }

    return c.json({conversation: toConvApi(row)})
})
// DELETE /api/kbs/:kbId/conversations/:convId(级联删除)
conversationsRouter.delete('/api/kbs/:kbId/conversations/:convId', async (c) => {
    const convId = c.req.param('convId')!
    const ok = await deleteConversation(convId)
    if (!ok) throw new Error('Conversation not found')
    return c.json({ success: true })
})