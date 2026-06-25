import { Hono } from "hono"
import { 
    KnowledgeBaseCreateSchema,
    KnowledgeBaseUpdateSchema
} from "shared-types"
import { db } from '../db/client'
import { knowledgeBases } from "../db/schema"
import { eq, desc } from "drizzle-orm"
import { Errors, pgUniqueViolationToApiError } from "../errors"


const router = new Hono()
// ============ Helper:owner 校验 ============
// KB 有 owner_id 时,当前 userId 必须匹配;KB 没 owner 时跳过(MVP 简化)
function assertKbOwner(kb: { ownerId: string | null, }, currentUserId: string | null) {
    if (kb.ownerId && kb.ownerId !== currentUserId) {
        throw Errors.kbOwnerMismatch(kb.ownerId, currentUserId)
    }
}


function getUserId(c: any): string | null {
    return c.req.header("x-user-id") || null;
}

// ============ GET /api/kbs 列表 ============
router.get('/api/kbs', async (c) => {
    const rows = await db
        .select()
        .from(knowledgeBases)
        .orderBy(desc(knowledgeBases.createdAt))
        .limit(100)
    return c.json({kbs: rows})
})

// ============ POST /api/kbs 创建 ===========
router.post('/api/kbs', async (c) => {
    // 1. 解析 body(Content-Type 校验)
    if (!c.req.header('Content-Type')?.includes('application/json')) {
        throw Errors.invalidParams({reason: 'Content-Type 必须为 application/json'})
    }

    const body = await c.req.json()

    // 2. zod 校验(自动抛 ZodError,被 errorHandler 捕获)
    const parsed = KnowledgeBaseCreateSchema.safeParse(body)
    if (!parsed.success) {
        throw Errors.invalidParams({issues: parsed.error.issues})
    }

    // 3. owner_id 从 header 取(MVP 用前端 UUID,后续接鉴权)
    const ownerId = getUserId(c)
    // if (!ownerId) {
    //     throw Errors.invalidParams({reason: 'owner_id 必须'})
    // }

    // 4. 插入数据库
    try {
        const [kb] = await db
            .insert(knowledgeBases)
            .values({...parsed.data, ownerId})
            .returning()
        return c.json(kb, 201)
    } catch (e: any) {
        pgUniqueViolationToApiError(e, () => Errors.kbAlreadyExists(parsed.data.name));
    }
})

// ============ GET /api/kbs/:kbId 详情 ============
router.get('/api/kbs/:kbId', async (c) => {
    const kbId = c.req.param('kbId')
    if (!kbId) {
        throw Errors.invalidParams({reason: 'kbId 必须'})
    }
    const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) throw Errors.kbNotFound(kbId)
    assertKbOwner(kb, getUserId(c))
    return c.json(kb)
})

// ⭐ PATCH /api/kbs/:kbId 更新(新增)
router.patch('/api/kbs/:kbId', async (c) => {
    if (!c.req.header('Content-Type')?.includes('application/json')) {
        throw Errors.invalidParams({reason: 'Content-Type 必须为 application/json'})
    }
    const kbId = c.req.param('kbId')
    const body = await c.req.json()
    const parsed = KnowledgeBaseUpdateSchema.safeParse(body)
    if (!parsed.success) {
        throw Errors.invalidParams({issues: parsed.error.issues})
    }

    // 先查存在(404 优先于 500)
    const [existing] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!existing) throw Errors.kbNotFound(kbId)
    // ⭐ owner 校验
    assertKbOwner(existing, getUserId(c))
    // 更新(自动更新 updated_at)
    const [kb] = await db
        .update(knowledgeBases)
        .set({
            ...parsed.data,
            updatedAt: new Date(),
        })
        .where(eq(knowledgeBases.id, kbId))
        .returning()
    return c.json(kb)
})

// ⭐ DELETE /api/kbs/:kbId 删除(新增)
router.delete('/api/kbs/:kbId', async (c) => {
    const kbId = c.req.param('kbId')
    if (!kbId) {
        throw Errors.invalidParams({reason: 'kbId 必须'})
    }
    // 先查存在(404 优先)
    const [existing] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!existing) throw Errors.kbNotFound(kbId)
    // 删除(ON DELETE CASCADE 会级联删 documents/chunks/conversations/messages)
    // ⭐ owner 校验
    assertKbOwner(existing, getUserId(c))
    await db
        .delete(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
    return c.body(null, 204)
})

export { router as kbsRouter };
