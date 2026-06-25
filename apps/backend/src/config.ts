import { z } from "zod"
import { config as loadDotenv } from "dotenv"

// 1. 加载 .env 文件
loadDotenv()

// 2. 单一 ConfigSchema,所有环境变量在一个地方定义
const ConfigSchema = z.object({
    // ============ 应用 ============
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // ============ CORS ============
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    // 生产可填多个,逗号分隔:'https://kb.your-domain.com,https://kb2.your-domain.com'

    // ============ 数据库 ============
    DATABASE_URL: z.string().url(),  // ✅ 必填
    DB_POOL_MIN: z.coerce.number().int().default(2),
    DB_POOL_MAX: z.coerce.number().int().default(20),

    // ============ Redis(BullMQ 依赖) ============
    REDIS_URL: z.string().url().optional(),
    // 可选,如果用 BullMQ 就必填;不用则填 'not_required'

    // ============ LLM 推理服务 ============
    // 选项 A:LM Studio(本地)
    LMSTUDIO_BASE_URL: z.string().url().optional(),
    EMBED_MODEL: z.string().default('nomic-embed-text-v1.5'),
    CHAT_MODEL: z.string().default('gemma-3-e2b'),

    // 选项 B:Ollama(本地,Docker 友好)—— 综合审查推荐
    //OLLAMA_BASE_URL: z.string().url().optional(),

    // 启动时校验模型是否加载
    LLM_REQUIRED_MODELS: z.string().default('nomic-embed-text-v1.5,gemma-3-e2b'),
    // 逗号分隔,启动时调 /v1/models 检查

    // ============ 嵌入模型参数 ============
    EMBEDDING_DIM: z.coerce.number().int().default(768),  // nomic-embed-text-v1.5 = 768
    EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(20),

    // ============ 检索参数 ============
    DEFAULT_TOP_K: z.coerce.number().int().min(1).max(50).default(5),
    DEFAULT_THRESHOLD: z.coerce.number().min(0).max(1).default(0),
    DEFAULT_HYBRID_WEIGHT: z.coerce.number().min(0).max(1).default(0.5),

    // ============ HNSW 索引参数 ============
    HNSW_M: z.coerce.number().int().min(4).max(64).default(16),
    HNSW_EF_CONSTRUCTION: z.coerce.number().int().min(8).max(256).default(64),
    HNSW_EF_SEARCH: z.coerce.number().int().min(10).max(200).default(40),

    // ============ 切片参数(默认值,可被 KB 配置覆盖) ============
    DEFAULT_CHUNK_SIZE: z.coerce.number().int().min(128).max(2048).default(512),
    DEFAULT_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(512).default(64),

    // ============ 上传限制 ============
    MAX_UPLOAD_SIZE: z.coerce.number().int().min(1024).default(20971520),  // 20MB
    ALLOWED_FILE_TYPES: z.string().default('pdf,docx,md,txt'),  // 逗号分隔

    // ============ 会话限制 ============
    MAX_CONTEXT_TOKENS: z.coerce.number().int().min(1024).default(8000),  // gemma 3 2B = 8K
    CONTEXT_COMPRESS_THRESHOLD: z.coerce.number().int().min(2).default(6),  // 超过 6 轮触发压缩

    // ============ LLM 超时 ============
    LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),  // 60s
    LLM_STREAM_CHUNK_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),

    // ============ 限流(综合审查 P0-8 工程 P0)============
    RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(30),  // 每用户/IP 每分钟 30 次
    RATE_LIMIT_MESSAGE_PER_MIN: z.coerce.number().int().min(1).default(10),  // 问答更严格


    // ============ 文件存储 ============
    UPLOAD_DIR: z.string().default('./uploads'),
    UPLOAD_DIR_MAX_SIZE: z.coerce.number().int().min(1024).default(10737418240),  // 10GB

    // ============ 可观测性(可选)============
    SENTRY_DSN: z.string().url().optional(),
})

// 3. 启动时安全解析
function loadConfig() {
    const result = ConfigSchema.safeParse(process.env)
    if (!result.success) {
        console.error('❌ Invalid configuration:')
        console.error(result.error.format())
        process.exit(1);  // ✅ 启动失败立即退出
    }
    return result.data
}

export const config = loadConfig()

// 4. 派生:把 ALLOWED_FILE_TYPES 字符串解析为数组
export const allowedFileTypes = config.ALLOWED_FILE_TYPES.split(',').map((s) => s.trim())
export const requiredModels = config.LLM_REQUIRED_MODELS.split(',').map((s) => s.trim())

