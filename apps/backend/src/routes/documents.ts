import { Hono } from 'hono'
import { db } from '../db/client'
import { documents } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { Errors } from '../errors'
import { saveDocument } from '../services/storage'
import { enqueueIngestion } from '../services/ingestion'

const router = new Hono()

// ============ Helpers ============
function getKbId(c: any): string {
    const id = c.req.param('kbId') 
    if (!id) {
        throw Errors.invalidParams({ reason: 'kbId is required' })
    }
    return id
}

function getExt(filename: string): 'pdf' | 'docx' | 'txt' | 'md' {
    const m = filename.toLowerCase().match(/\.(pdf|docx|txt|md)$/)
    if (!m) {
        throw Errors.docUnsupportedFormat(filename.split('.').pop() || 'unknown', ['pdf', 'docx', 'txt', 'md'])
    }
    return m[1] as any
}

const MAX_FILE_SIZE = 1024 * 1024 * 20 // 20MB 限制

// ============ POST /api/kbs/:kbId/documents 上传 ============
router.post('/api/kbs/:kbId/documents', async (c) => {
    const kbId = getKbId(c)

    if (!c.req.header('content-type')?.startsWith('multipart/form-data')) {
        throw Errors.invalidParams({ reason: 'content-type 必须为 multipart/form-data' })
    }

    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) {
        throw Errors.invalidParams({ reason: '缺少 file 字段' })
    }
    if (file.size > MAX_FILE_SIZE) {
        throw Errors.docTooLarge(file.size, MAX_FILE_SIZE)
    }
    const ext = getExt(file.name) // 文档扩展名
    const buffer = Buffer.from(await file.arrayBuffer())
    // 3 步事务:insert → 存文件 → update filePath → select 最新行
    const result = await db.transaction(async (tx) => {
        const [doc] = await tx
            .insert(documents)
            .values({
                 kbId,                          // ⭐ 实际字段
                filename: file.name,
                fileType: ext,
                fileSize: file.size,
                filePath: 'pending',           // 占位,稍后 update
                status: 'pending',
            })
            .returning()
        // 用 doc.id 存文件
        const filePath = await saveDocument(kbId, doc.id, file.name, buffer)

        //update filePath
        await tx
            .update(documents)
            .set({ filePath })
            .where(eq(documents.id, doc.id))

        const [finalDoc] = await tx       // ⭐ 这行之前你漏了
            .select()
            .from(documents)
            .where(eq(documents.id, doc.id))
            .limit(1)
        return finalDoc
    })

    // ⭐ 同步处理文档(2a)
    // try {
    //     const { chunkCount } = await processDocument(result.id)
    //     console.log(`[ingestion] doc=${result.id} chunks=${chunkCount}`)
    // } catch(e: any) {
    //     console.error(`[ingestion] doc=${result.id} failed: ${e?.message}`)
    //     // 不抛错,documents.status 已经是 'failed',DB 里有记录
    // }

    // 再 select 一次拿最新状态
     // 重新查最新状态(ready / failed)
    const [latestDoc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, result.id))
        .limit(1)

    // ⭐ 异步派发(不阻塞,worker 后台跑)
    enqueueIngestion(result.id)
    return c.json(toDocApi(latestDoc), 201)
})

// ============ GET /api/kbs/:kbId/documents 列表 ============
router.get('/api/kbs/:kbId/documents', async (c) => {
    const kbId = getKbId(c)
    const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.kbId, kbId))
        .orderBy(desc(documents.createdAt))
        .limit(100)
    return c.json({ documents: rows.map(toDocApi) })
})

// ============ GET /api/kbs/:kbId/documents/:docId 单个 ============
router.get('/api/kbs/:kbId/documents/:docId', async (c) => {
    const kbId = getKbId(c)
    const docId = c.req.param('docId')
    if (!docId) {
        throw Errors.invalidParams({ reason: 'docId is required' })
    }

    const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId))
        .limit(1)
    if (!doc) throw Errors.docNotFound(docId)
    if (doc.kbId !== kbId) throw Errors.docNotFound(docId) // 文档不属于该知识库
    return c.json(toDocApi(doc))
})

// ============ Drizzle → API 转换 ==========
type DocRow = typeof documents.$inferSelect
function toDocApi(row: DocRow) {
    return {
        id: row.id,
        kb_id: row.kbId,
        filename: row.filename,
        file_type: row.fileType,
        file_size: row.fileSize,
        status: row.status,
        error_msg: row.errorMsg,
        chunk_count: row.chunkCount ?? 0,
        created_at: row.createdAt.toISOString(),
        processed_at: row.processedAt?.toISOString() ?? null,
    }
}

export { router as documentsRouter }
