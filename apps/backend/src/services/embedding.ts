/**
 * LM Studio OpenAI 兼容 embedding API 客户端
 * POST {LMSTUDIO_BASE_URL}/embeddings
 * 文档: https://lmstudio.ai/docs/app
 */

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL ?? 'http://localhost:1234/v1'
const EMBEDDING_MODEL = process.env.LMSTUDIO_EMBEDDING_MODEL ?? 'text-embedding-nomic-embed-text-v1.5'
const EMBEDDING_DIM = 768
const BATCH_SIZE = 10


/**
 * 批量 embedding:一次请求最多 BATCH_SIZE 条
 * 失败抛错,由 caller 决定怎么处理(整个 doc 失败回滚 / 跳过等)
 */
export async function embedBatch (texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const allEmbeddings: number[][] = []
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE)
        const embeddings = await embedOne(batch)
        allEmbeddings.push(...embeddings)
    }
    return allEmbeddings
}

async function embedOne (texts: string[]): Promise<number[][]> {
    const res = await fetch(`${LMSTUDIO_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts,
        }),
    })
    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`LM Studio OpenAI embedding API 失败: ${res.status} ${errText}`)
    }

    const data = await res.json() as {
        data: Array<{
            embedding: Array<number>
        }>
        usage?: {
            total_tokens: number
        }
    }
    
    return data.data.map((d) => d.embedding)
}

export { EMBEDDING_DIM, BATCH_SIZE, LMSTUDIO_BASE_URL, EMBEDDING_MODEL }