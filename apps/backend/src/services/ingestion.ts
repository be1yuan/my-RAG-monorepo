/**
 * Ingestion service
 * - startIngestionWorker() 启动后台 worker 线程(Node 启动时调一次)
 * - enqueueIngestion(docId) 派发任务到 worker(不阻塞)
 * - processDocument(docId) 同步处理(debug 用,可选)
 */
import { promises as fs, existsSync } from 'fs'
import { db } from '../db/client'
import { documents, chunks } from '../db/schema'
import { eq } from 'drizzle-orm'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Errors } from '../errors'
import { PDFParse } from 'pdf-parse'
import { Worker } from 'worker_threads'
import * as path from 'path'
import { fileURLToPath } from 'url';

const FONT_PATH = path.resolve(
    process.cwd(),
    'node_modules/pdfjs-dist/standard_fonts/'
) + '/'

type FileType = 'pdf' | 'docx' | 'md' | 'txt'

const EMBEDDING_DIM = 768 // 假设嵌入维度为 768

// 在文件顶部添加
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ Worker 管理 ============
let workerInstance: Worker | null = null
const taskQueue: Array<{docId: string}> = []
let isWorkerReady = false  // 是否就绪

export function startIngestionWorker() {
    if (workerInstance) return // 幂等

    // ⭐ 路径兼容:dev 模式用 .tsx(后端用 tsx 跑),prod 用 .js(先 build)
    const workerPath = path.join(__dirname, 'ingestion.worker.js')
    // 检查 .js 是否存在,不存在则用 .ts(假设 dev 模式用 tsx)
    const finalPath = existsSync(workerPath) ? workerPath : workerPath.replace('.js', '.ts')

    workerInstance = new Worker(finalPath)
    workerInstance.on('message', (msg: any) => {
        if (msg.type === 'ready') {
            isWorkerReady = true
            console.log('[worker] ready')
            flushQueue()
        } else if (msg.type === 'done') {
            console.log(`[worker] done doc=${msg.docId} chunks=${msg.chunkCount}`)
        } else if (msg.type === 'error') {
            console.error(`[worker] error doc=${msg.docId} message=${msg.message}`)
        }
    })

    workerInstance.on('error', (e) => {
        console.error('[worker] crashed:', e)
        workerInstance = null
        isWorkerReady = false
    })

    workerInstance.on('exit', (code) => {
        if (code !== 0) console.warn(`[worker] exited with code=${code}`)
        workerInstance = null
        isWorkerReady = false
    })
}

function flushQueue() {
    if (!workerInstance || !isWorkerReady) return
    while (taskQueue.length > 0) {
        const task = taskQueue.shift()!
        workerInstance.postMessage({ type: 'process', docId: task.docId })
    }
}

export function enqueueIngestion(docId: string): void {
    taskQueue.push({ docId })
    flushQueue()
}

/**
 * 提取文档纯文本
 */
// ============ 同步处理(debug 用,Step 2a 留下) ============
async function extractText (filePath: string, fileType: FileType): Promise<string> {
    if (fileType === 'pdf') {
        const buffer = await fs.readFile(filePath)
        const parser = new PDFParse({
            data: new Uint8Array(buffer),           // ⭐ data 字段在对象里
        })
        const result = await parser.getText()
        return result.text
    } 
    if (fileType === 'docx') {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ path: filePath })
        return result.value
    }
    // md / txt: 直接读
    return await fs.readFile(filePath, 'utf-8')
}

/**
 * 同步处理一个文档:解析 + 分块 + 写 chunks(embedding 占位)
 * Step 2a:同步执行;Step 2b 改成 worker_threads
 */
export async function processDocument (docId: string): Promise<{chunkCount: number}> {
    // 1. 查 documents
    const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId))
        .limit(1)
    if (!doc) throw Errors.docNotFound(docId)

    // 2. status = processing
    await db.update(documents)
        .set({ status: 'processing' })
        .where(eq(documents.id, docId))

    try {
        // 3. 解析
        const text = await extractText(doc.filePath, doc.fileType as FileType)
        if (!text || !text.trim()) throw new Error('extractText failed: empty text')

        // 4. 分块(用 doc 自带的 chunk_size / chunk_overlap,Step 3 用)
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
            chunkOverlap: 64,
        })
        const splitTexts: string[] = await splitter.splitText(text)

         // 5. 写 chunks(embedding 占位 0 向量,Step 3 替换)
        const zeroVector: number[] = new Array(EMBEDDING_DIM).fill(0) // 0 向量

        const chunkRows = splitTexts.map((content, i) => ({
            documentId: docId,
            kbId: doc.kbId,
            chunkIndex: i,
            content,
            contentTsv: null,                       // ⭐ tsvector 列,如有 trigger 由 PG 生成
            tokenCount: content.length,             // ⭐ 简化:用 char count
            metadata: {
                source: doc.filename,
                chunk_size: 512,
                chunk_overlap: 64,
            } as Record<string, unknown>,
            embedding: zeroVector, 
        }))

        if (chunkRows.length > 0) await db.insert(chunks).values(chunkRows)

        // 6. status = ready + chunk_count
        await db
            .update(documents)
            .set({ status: 'ready', chunkCount: chunkRows.length, processedAt: new Date() })
            .where(eq(documents.id, docId))
        return { chunkCount: chunkRows.length }
    } catch (e: any) {
        // 失败 → status = failed
        await db
        .update(documents)
        .set({
            status: 'failed',
            errorMsg: e?.message ?? 'Unknown error',
            processedAt: new Date(),
        })
        .where(eq(documents.id, docId))
        throw e
    }
}