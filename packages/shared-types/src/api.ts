import { z } from 'zod'

// ============================================================
// 通用
// ============================================================
export const UuidSchema = z.string().uuid()

// ============================================================
// Knowledge Base
// ============================================================
export const KnowledgeBaseSchema = z.object({
    id: UuidSchema,
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    ownerId: UuidSchema.nullable().optional(),  // ⭐ M1: 加上 ownerId
    embedding_model: z.string(),
    chat_model: z.string(),
    chunk_size: z.number().int().min(128).max(2048),
    chunk_overlap: z.number().int().min(0).max(512),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
})
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>

export const KnowledgeBaseCreateSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    embedding_model: z.string().default('nomic-embed-text-v1.5'),
    chat_model: z.string().default('qwen3-4b-thinking-2507'),
    chunk_size: z.number().int().min(128).max(2048).default(512),
    chunk_overlap: z.number().int().min(0).max(512).default(64),
})
export type KnowledgeBaseCreate = z.infer<typeof KnowledgeBaseCreateSchema>

export const KnowledgeBaseUpdateSchema = KnowledgeBaseCreateSchema.partial()
export type KnowledgeBaseUpdate = z.infer<typeof KnowledgeBaseUpdateSchema>

export const KnowledgeBaseDetailSchema = KnowledgeBaseSchema.extend({
    status: z.object({
        document_count: z.number().int(),
        chunk_count: z.number().int(),
        total_size_bytes: z.number().int(),
    }),
})
export type KnowledgeBaseDetail = z.infer<typeof KnowledgeBaseDetailSchema>

// ============================================================
// Document
// ============================================================
export const DocumentStatusSchema = z.enum(['pending', 'processing', 'ready', 'failed'])
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>

export const FileTypeSchema = z.enum(['pdf', 'docx', 'md', 'txt'])

export const DocumentSchema = z.object({
    id: UuidSchema,
    kb_id: UuidSchema,
    filename: z.string(),
    file_type: FileTypeSchema,
    file_size: z.number().int().min(1).max(20 * 1024 * 1024),  // ≤ 20MB
    status: DocumentStatusSchema,
    error_msg: z.string().nullable().optional(),
    chunk_count: z.number().int().default(0),
    created_at: z.string().datetime(),
    processed_at: z.string().datetime().nullable().optional(),
})
export type Document = z.infer<typeof DocumentSchema>

export const ChunkSchema = z.object({
    id: UuidSchema,
    document_id: UuidSchema,
    kb_id: UuidSchema,
    chunk_index: z.number().int().nonnegative(),
    content: z.string(),
    token_count: z.number().int().nullable().optional(),
    metadata: z.record(z.string(),z.unknown()).default({}),
})
export type Chunk = z.infer<typeof ChunkSchema>

export const DocumentDetailSchema = DocumentSchema.extend({
    chunks: z.array(ChunkSchema),
})
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>

// ============================================================
// Search
// ============================================================
export const SearchRequestSchema = z.object({
    query: z.string().min(1).max(2000),
    top_k: z.number().int().min(1).max(50).default(5),
    threshold: z.number().min(0).max(1).default(0),
    hybrid_weight: z.number().min(0).max(1).default(0.5),
})
export type SearchRequest = z.infer<typeof SearchRequestSchema>

export const ChunkWithScoreSchema = ChunkSchema.extend({
    score: z.number(),
    filename: z.string(),
    snippet: z.string(),
})
export type ChunkWithScore = z.infer<typeof ChunkWithScoreSchema>

export const SearchResponseSchema = z.object({
    chunks: z.array(ChunkWithScoreSchema),
    total: z.number().int(),
    latency_ms: z.number().int(),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

// ============================================================
// Conversation & Message
// ============================================================
export const ConversationSchema = z.object({
    id: UuidSchema,
    kb_id: UuidSchema,
    title: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
})
export type Conversation = z.infer<typeof ConversationSchema>

export const ConversationCreateSchema = z.object({
    title: z.string().max(200).optional(),
})
export type ConversationCreate = z.infer<typeof ConversationCreateSchema>

export const CitationSchema = z.object({
    chunk_id: UuidSchema,
    document_id: UuidSchema,
    kb_id: UuidSchema,                  // 关键!综合审查 P0-3 显式补
    filename: z.string(),                // 关键!综合审查 P0-3 显式补
    snippet: z.string(),
    score: z.number().min(0).max(1),
    chunk_index: z.number().int().nonnegative(),
})
export type Citation = z.infer<typeof CitationSchema>

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system'])

export const MessageSchema = z.object({
    id: UuidSchema,
    conversation_id: UuidSchema,
    role: MessageRoleSchema,
    content: z.string(),
    citations: z.array(CitationSchema).nullable().optional(),
    feedback: z.enum(['like', 'dislike']).nullable().optional(),
    feedback_text: z.string().max(2000).nullable().optional(),
    created_at: z.string().datetime(),
})
export type Message = z.infer<typeof MessageSchema>

export const ConversationDetailSchema = ConversationSchema.extend({
    messages: z.array(MessageSchema),
})
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>

export const MessageCreateSchema = z.object({
    content: z.string().min(1).max(4000),
})
export type MessageCreate = z.infer<typeof MessageCreateSchema>

// ============================================================
// System
// ============================================================
export const HealthStatusSchema = z.object({
    status: z.enum(['ok', 'degraded', 'down']),
    checks: z.object({
        postgres: z.enum(['ok', 'down']),
        lm_studio: z.enum(['ok', 'down']),
        redis: z.enum(['ok', 'down', 'not_required']),
    }),
})
export type HealthStatus = z.infer<typeof HealthStatusSchema>

export const ModelSchema = z.object({
    id: z.string(),
    type: z.enum(['embedding', 'chat']),
    state: z.enum(['loaded', 'not_loaded']),
})
export type Model = z.infer<typeof ModelSchema>

export const EmbeddingJobSchema = z.object({
    id: UuidSchema,
    document_id: UuidSchema,
    status: DocumentStatusSchema,
    progress: z.number().int().min(0).max(100),
    error_msg: z.string().nullable().optional(),
    created_at: z.string().datetime(),
})
export type EmbeddingJob = z.infer<typeof EmbeddingJobSchema>

// ============================================================
// chat (m3)
// ============================================================
export const ChatRequestSchema = z.object({
    question: z.string().min(1).max(4000),
    top_k: z.number().int().min(1).max(20).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(8192).optional()
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
// M4 扩展:支持多轮对话
export const ChatRequestWithConvSchema = ChatRequestSchema.extend({
    conversation_id: UuidSchema.optional(),
})
export type ChatRequestWithConv = z.infer<typeof ChatRequestWithConvSchema>