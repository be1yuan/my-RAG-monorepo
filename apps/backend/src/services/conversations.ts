/**
 * Conversation + Message CRUD 服务
 * - API 字段 snake_case(共享类型驱动)
 * - 级联删除(conversations 删了 messages 自动 cascade)
 */
import { eq, desc, asc } from 'drizzle-orm'
import { db } from '../db/client'
import { conversations, messages } from '../db/schema'
import type { Conversation, Message } from '../db/schema'
import type { Citation } from 'shared-types/api'
import type { Message as ApiMessage } from 'shared-types/api'


// ============================================================
// API 转换层(camelCase Drizzle row -> snake_case API)
// ============================================================
export function toConvApi(row: Conversation): {
    id: string
    kb_id: string
    user_id: string | null
    title: string | null
    created_at: string
    updated_at: string
} {
    return {
        id: row.id,
        kb_id: row.kbId,
        user_id: row.userId,
        title: row.title,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
    }
}

export function toMsgApi(row: Message): ApiMessage{
    return {
        id: row.id,
        conversation_id: row.conversationId,
        role: row.role,
        content: row.content,
        citations: (row.citations ?? null) as ApiMessage['citations'],
        feedback: row.feedback ?? null,
        feedback_text: row.feedbackText ?? null,
        created_at: row.createdAt.toISOString(),
    }
}

// ============================================================
// Conversation CRUD
// ============================================================
/** 创建空会话(title 暂时 null,Step 4.3 LLM 自动生成) */
export async function createConversation(kbId: string, userId: string | null = null): Promise<Conversation> {
    const [row] = await db
        .insert(conversations)
        .values({ kbId, userId, title: null})
        .returning()
    if (!row) throw new Error('createConversation failed')
    return row
}
/** 列出 KB 下所有会话(按 updated_at 倒序) */
export async function listConversations(kbId: string): Promise<Conversation[]> {
    return await db
        .select()
        .from(conversations)
        .where(eq(conversations.kbId, kbId))
        .orderBy(desc(conversations.updatedAt))
}
/** 获取会话详情(包含 messages 列表) */
export async function getConversationDetail(convId: string): Promise<{
    conversation: Conversation
    messages: Message[]
} | null> {
    const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, convId))
        .limit(1) // 只取一个
    if (!conv) return null

    const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convId))
        .orderBy(asc(messages.createdAt)) // ⭐ 旧 -> 新 顺序
    return {
        conversation: conv,
        messages: msgs,
    }
}
/** 更新会话标题(LLM 自动生成后回写) */
export async function updateConversationTitle(convId: string, title: string): Promise<Conversation | null> {
    const [row] = await db
        .update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(conversations.id, convId))
        .returning()
    if (!row) return null
    return row
}
/** 删除会话(DB 级联删除 messages) */
export async function deleteConversation(convId: string): Promise<boolean> {
    const result = await db
        .delete(conversations)
        .where(eq(conversations.id, convId))
        .returning({id: conversations.id})
    return result.length > 0
}
// ============================================================
// Message CRUD
// ============================================================
/** 添加消息到会话 */
export async function addMessage(
    convId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    citations?: Citation[],
): Promise<Message> {
    const [row] = await db
        .insert(messages)
        .values({
            conversationId: convId,
            role,
            content,
            citations: citations ?? null,
        })
        .returning()
    if (!row) throw new Error('addMessage failed')
    
    // ⭐ 同时更新会话的 updated_at(列表按 updated_at 排序)
    await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, convId))
    return row
}