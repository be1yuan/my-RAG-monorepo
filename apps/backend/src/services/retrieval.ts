/**
 * pgvector cosine 距离向量检索
 * 1 - (embedding <=> query) = cosine_similarity (0-1)
 */
import { db } from '../db/client'
import { sql } from 'drizzle-orm'
import { embedQuery } from './embedding'

export interface RetrievaedChunk {
    id: string
    document_id: string
    kb_id: string
    chunk_index: number
    content: string
    filename: string
    score:number
    snippet: string
}

export async function retrieveChunks (
    kbId: string,
    query: string,
    topK: number = 5,
): Promise<RetrievaedChunk[]> {
    //1 计算 query embedding
    const queryEmbedding = await embedQuery(query)
    // pgvector 接收 string 格式
    const embeddingStr = `[${queryEmbedding.join(',')}]`
    // 2. pgvector cosine 距离检索 + JOIN documents 拿 filename
    const result = await db.execute(sql `
        SELECT
            c.id, c.document_id, c.kb_id, c.chunk_index, c.content, 
            d.filename,
            1 - (c.embedding <=> ${embeddingStr}:: vector) AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.kb_id = ${kbId}::uuid
        AND d.status = 'ready'
        ORDER BY c.embedding <=> ${embeddingStr}:: vector
        LIMIT ${topK}
    `)

    return (result.rows as any[]).map((row) => ({
        id: row.id,
        document_id: row.document_id,
        kb_id: row.kb_id,
        chunk_index: row.chunk_index,
        content: row.content,
        filename: row.filename,
        score: Number(row.score),
        snippet: row.content.length >200 ? row.content.slice(0, 200) + '...' : row.content,
    }))
}