/**
 * Worker 线程:接收 parent 派发的 ingestion 任务,跑解析+分块+写 chunks
 * 通过 parentPort 通信
 *   parent -> worker: { type: 'process', docId: string }
 *   worker -> parent: { type: 'ready' } | { type: 'done', docId, chunkCount } | { type: 'error', docId, message }
 */
import { parentPort } from 'worker_threads'
import { promises as fs } from 'fs'
import { db } from '../db/client'
import { documents, chunks } from '../db/schema'
import { eq } from 'drizzle-orm'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PDFParse } from 'pdf-parse'
import { embedBatch } from './embedding'

type FileType = 'pdf' | 'docx' | 'md' | 'txt'
async function extractText (filePath: string, fileType: FileType): Promise<string> {
    if (fileType === 'pdf') {
        const buffer = await fs.readFile(filePath)
        const parser = new PDFParse({
            data: new Uint8Array(buffer),
        })
        const result = await parser.getText()
        console.log(`[debug] file=${filePath} text_len=${result.text.length} pages=${result.pages?.length}`)
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

async function processOne (docId: string): Promise<{chunkCount: number}> {
    const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId))
        .limit(1)
    if (!doc) throw new Error (`doc not found: ${docId}`)   

    await db
        .update(documents)
        .set({ status: 'processing' })
        .where(eq(documents.id, docId))
        
    try {
        const text = await extractText(doc.filePath, doc.fileType)
        if (!text) throw new Error ('文档内容为空')
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        })
        const splitTexts: string[] =  await splitter.splitText(text)
        // 5. ⭐ Step 3:调 LM Studio embedding
        let embeddings: number[][]
        try {
            embeddings = await embedBatch(splitTexts)
            console.log(`[worker] embedded doc=${docId} count=${embeddings.length}`)
        } catch (e: any) {
            // embedding 失败 → 整个 doc 标记 failed(MVP 简化:不重试)
            await db
                .update(documents)
                .set({
                    status: 'failed',
                    errorMsg: `embedding failed: ${e?.message ?? 'unknown'}`,
                    processedAt: new Date(),
                })
                .where(eq(documents.id, docId))
            throw e
        }
        // 6. 写 chunks(用真实 embedding)
        const chunkRows = splitTexts.map((content, i) => ({
            documentId: docId,
            kbId: doc.kbId,
            chunkIndex: i,
            content,
            contentTsv: null,
            tokenCount: content.length,
            metadata: {
                source: doc.filename,
                chunk_size: 512,
                chunk_overlap: 64,
                embedding_model: 'text-embedding-nomic-embed-text-v1.5',
            } as Record<string, unknown>,
            embedding: embeddings[i],  
        }))

        if (chunkRows.length > 0) await db.insert(chunks).values(chunkRows)

        await db
            .update(documents)
            .set({ status: 'ready', chunkCount: chunkRows.length, processedAt: new Date() })
            .where(eq(documents.id, docId))
        return { chunkCount: chunkRows.length }
    } catch (e: any) {
        await db
            .update(documents)
            .set({ status: 'failed', errorMsg: e?.message ?? 'unknown error', processedAt: new Date() })
            .where(eq(documents.id, docId))
        throw e
    }
}

if (parentPort) {
    parentPort.on('message', async (msg: {type: string; docId?: string}) => {
        if (msg.type === 'process' && msg.docId) {
            try {
                const result = await processOne(msg.docId)
                parentPort!.postMessage({ type: 'done', docId: msg.docId, ...result })
            } catch (e: any) {
                parentPort!.postMessage({ type: 'error', docId: msg.docId, message: e?.message ?? 'unknown error' })
            }
        }
    })
    // 通知 parent worker 已就绪
    parentPort.postMessage({ type: 'ready' })
} else {
    console.error('[worker] no parentPort, this file must be run as a worker')
    process.exit(1)
}