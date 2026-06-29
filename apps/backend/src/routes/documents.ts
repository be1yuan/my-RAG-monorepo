import { Hono } from 'hono'
import { db } from '../db/client'
import { documents, knowledgeBases, chunks } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { Errors } from '../errors'
import { saveDocument, deleteDocument } from '../services/storage'
import { enqueueIngestion } from '../services/ingestion'
// import { getUserId, assertKbOwner } from '../routes/kbs'

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

// ============ SSE 文档状态流 ============
// GET /api/kbs/:kbId/documents/events
// 每 2s 轮询 documents 表,status 变化时推 SSE event
router.get('/api/kbs/:kbId/documents/events', async (c) => {
    const kbId = getKbId(c)

    // 验证 KB 存在 + owner 校验
    const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, kbId))
        .limit(1)
    if (!kb) throw Errors.kbNotFound(kbId)
    // assertKbOwner(kb, getUserId(c))

     // SSE 设置
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('X-Accel-Buffering', 'no')  // nginx 不缓冲

    const encoder = new TextEncoder()
    let intervalId: NodeJS.Timeout | null = null

    const stream = new ReadableStream({
        start(controller) {
            const send = (event: string, data: unknown) => {
                try {
                    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
                    controller.enqueue(encoder.encode(chunk))
                } catch (e) {
                    console.error(`[SSE] error: ${e}`)
                }
            }

             // 初始连接
            send('connect', { kbId, timestamp: Date.now() })

            // MVP 简化:每 2s 轮询 status 变化
            // 生产环境用 PG LISTEN/NOTIFY(更实时)
            const lastStatuses = new Map<string, string>()
            intervalId = setInterval(async () => {  
                // 简化:每 2s 查一次 status != ready/processing 的文档
                // 真实场景用 PG LISTEN/NOTIFY
                try {
                    const docs = await db
                        .select({
                            id: documents.id,
                            status: documents.status,
                            chunkCount: documents.chunkCount,
                            errorMsg: documents.errorMsg,
                        })
                        .from(documents)
                        .where(eq(documents.kbId, kbId))
                    for (const doc of docs) {
                        const prev = lastStatuses.get(doc.id)
                        if (prev !== doc.status) {
                            send('document.statusChanged', {
                            id: doc.id,
                            status: doc.status,
                            chunk_count: doc.chunkCount ?? 0,
                            error_msg: doc.errorMsg,
                            timestamp: Date.now(),
                        })
                        lastStatuses.set(doc.id, doc.status)
                        }
                    }
                } catch (e) {
                    console.error(`[SSE] error: ${e}`)
                }
            }, 2000)

            // 客户端断开清理定时器
            c.req.raw.signal.addEventListener('abort', () => {
                if (intervalId) clearInterval(intervalId)
                controller.close()
            })
        },
        cancel() {
            if (intervalId) clearInterval(intervalId)
        }
    })
    return new Response(stream, { headers: c.res.headers })
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

// DELETE /api/kbs/:kbId/documents/:docId
router.delete('/api/kbs/:kbId/documents/:docId', async (c) => {
    const kbId = getKbId(c)
    const docId = c.req.param('docId')
    if (!docId) throw Errors.invalidParams({ reason: 'docId 必须' })
    // 查文档
    const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId))
        .limit(1)
    if (!doc) throw Errors.docNotFound(docId)
    if (doc.kbId !== kbId) throw Errors.docNotFound(docId)  // KB 不匹配 → 404
    // ⭐ MVP 简化:注释 owner 校验(单用户本地演示)
    // TODO 真实部署前恢复:
    // const [kb] = await db
    //   .select()
    //   .from(knowledgeBases)
    //   .where(eq(knowledgeBases.id, kbId))
    //   .limit(1)
    // if (!kb) throw Errors.kbNotFound(kbId)
    // assertKbOwner(kb, getUserId(c))
    // 删文件 + 删 chunks + 删 documents 行
    try {
        await deleteDocument(doc.filePath)  // 删磁盘文件
    } catch { /* ignore file delete failure */ }
    await db.delete(chunks).where(eq(chunks.documentId, docId))
    await db.delete(documents).where(eq(documents.id, docId))
    return c.body(null, 204)
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
