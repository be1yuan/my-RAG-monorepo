import {
    pgTable, pgEnum, uuid, varchar, text, integer, bigint, jsonb, timestamp,
    index, uniqueIndex, vector, customType
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ---------- 自定义类型 ----------
// tsvector(Drizzle 没有内建)
const tsvector = customType<{ data: string }>({
    dataType() { return "tsvector" },
})

// ---------- 枚举 ----------
export const documentStatusEnum = pgEnum('document_status', [
    'pending', 'processing', 'ready', 'failed',
])

export const fileTypeEnum = pgEnum('file_type', [
    'pdf', 'docx', 'md', 'txt',
])

export const messageRoleEnum = pgEnum('message_role', [
    'user', 'assistant', 'system',
])

export const feedbackEnum = pgEnum('feedback', [
    'like', 'dislike',
])

export const jobStatusEnum = pgEnum('job_status', [
    'pending', 'processing', 'ready', 'failed',
])

// ============================================================
// knowledge_bases(知识库)
// P0-9 新增 owner_id
// ============================================================
export const knowledgeBases = pgTable('knowledge_bases', {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id'),  // ✅ 综合 P0-9,先不加 FK,后续接鉴权补
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    embeddingModel: varchar('embedding_model', { length: 100 })
        .notNull().default('nomic-embed-text-v1.5'),
    chatModel: varchar('chat_model', { length: 100 })
        .notNull().default('gemma-3-e2b'),
    chunkSize: integer('chunk_size').notNull().default(512),
    chunkOverlap: integer('chunk_overlap').notNull().default(64),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    uniqueIndex('idx_knowledge_bases_name_owner')
        .on(table.name, table.ownerId),  // 同一 owner 下 name 唯一
])

// ============================================================
// documents(文档元数据)
// P1-1 加 CHECK 约束 + P1-4 file_size CHECK
// ============================================================
export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    kbId: uuid('kb_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    fileType: fileTypeEnum('file_type').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    filePath: text('file_path').notNull(),
    status: documentStatusEnum('status').notNull().default('pending'),
    errorMsg: text('error_msg'),
    chunkCount: integer('chunk_count').default(0),  // ⚠️ P1-5 冗余字段,后续改 view
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
}, (table) => [
    index('idx_documents_kb_id').on(table.kbId),
    index('idx_documents_status').on(table.status),
])

// ============================================================
// chunks(切片 + embedding)
// HNSW 索引 + GIN 全文索引 + tsvector 触发器
// ============================================================
export const chunks = pgTable('chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull()
        .references(() => documents.id, { onDelete: 'cascade' }),
    kbId: uuid('kb_id').notNull()
        .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    contentTsv: tsvector('content_tsv'),  // ⚠️ P0-11 M5 前改为 jieba
    tokenCount: integer('token_count'),
    metadata: jsonb('metadata').default({}).$type<Record<string, unknown>>(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_chunks_document_id').on(table.documentId),
    index('idx_chunks_kb_id').on(table.kbId),
    // HNSW 向量索引在 migration 中用 raw SQL 加
    // GIN 全文索引在 migration 中用 raw SQL 加
])

// ============================================================
// conversations(会话)
// P1-2 加 user_id 索引
// ============================================================
export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    kbId: uuid('kb_id').notNull()
        .references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 100 }),  // MVP 用前端 UUID,后续接鉴权
    title: varchar('title', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_conversations_kb_id').on(table.kbId),
    index('idx_conversations_user_id').on(table.userId)
        .where(sql`${table.userId} IS NOT NULL`),  // ✅ P1-2 partial index
])

// ============================================================
// messages(消息)
// P1-1 加 role CHECK + P1-4 feedback_text CHECK
// 综合 P0-3 citations JSONB 结构对齐
// ============================================================
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull()
        .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    // ✅ 综合 P0-3:JSONB 结构明文对齐 SDD-03 CitationSchema
    citations: jsonb('citations').$type<Array<{
        chunk_id: string
        document_id: string
        kb_id: string        // 新增
        filename: string      // 新增
        snippet: string
        score: number
        chunk_index: number   // 新增
    }>>(),
    feedback: feedbackEnum('feedback'),
    feedbackText: text('feedback_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('idx_messages_conversation_id').on(table.conversationId),
])

// ============================================================
// embedding_jobs(向量化任务队列)
// P1-3 加 partial unique + 队列索引
// ============================================================
export const embeddingJobs = pgTable('embedding_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull()
        .references(() => documents.id, { onDelete: 'cascade' }),
    status: jobStatusEnum('status').notNull().default('pending'),
    progress: integer('progress').default(0),
    errorMsg: text('error_msg'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    // ✅ P1-3 同一文档同时只能有 1 个 active job
    uniqueIndex('idx_embedding_jobs_active_unique')
        .on(table.documentId)
        .where(sql`${table.status} IN ('pending', 'processing')`),
    // worker 拉取队列优化
    index('idx_embedding_jobs_queue')
        .on(table.status, table.createdAt)
        .where(sql`${table.status} = 'pending'`),
])

// ============================================================
// 类型导出(给 routes/services 用)
// ============================================================
export type KnowledgeBase = typeof knowledgeBases.$inferSelect
export type NewKnowledgeBase = typeof knowledgeBases.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type EmbeddingJob = typeof embeddingJobs.$inferSelect
export type NewEmbeddingJob = typeof embeddingJobs.$inferInsert