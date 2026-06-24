import { Hono } from "hono"
import { 
    KnowledgeBaseCreateSchema,
} from "shared-types"
import { db } from '../db/client'
import { knowledgeBases } from "../db/schema"
import { eq, desc } from "drizzle-orm"
import { Errors, pgUniqueViolationToApiError } from "../errors"


const router = new Hono()
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
    const ownerId = c.req.header('x-userd-id') || null
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
    if (!kb) {
        throw Errors.kbNotFound(kbId)
    }
    return c.json(kb)
})

export { router as kbsRouter };
