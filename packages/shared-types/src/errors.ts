import { z } from "zod";

// ErrorCode 错误码
export const ErrorCode = {
    // 通用 1xxx
    INVALID_PARAMS: 10001, // 请求参数校验失败
    MISSING_REQUIRED_FIELD: 10002, // 必填字段缺失
    INVALID_CONTENT_TYPE: 10003, // Content-Type 不对(非 application/json)
    RATE_LIMIT_EXCEEDED: 10004, // 触发限流
    REQUEST_TOO_LARGE: 10005, // 请求体过大
    METHOD_NOT_ALLOWED: 10006, // HTTP method 不支持

    // 认证 2xxx(MVP 暂不实现,留接口)
    UNAUTHORIZED: 20001,
    FORBIDDEN: 20002, // 无权访问(如访问别人的 KB)
    TOKEN_EXPIRED: 20003,

    // 知识库 3xxx
    KB_NOT_FOUND: 30001,
    KB_ALREADY_EXISTS: 30002,
    KB_INVALID_CONFIG: 30003, // chunk_size 非法等
    KB_OWNER_MISMATCH: 30004, // 当前用户不是该 KB 的 owner

    // 文档 4xxx
    DOC_NOT_FOUND: 40001,
    DOC_FILE_TOO_LARGE: 40002, // > 20MB
    DOC_UNSUPPORTED_FORMAT: 40003, // 非 PDF/DOCX/MD/TXT
    DOC_UPLOAD_FAILED: 40004,
    DOC_PARSE_FAILED: 40005, // pdf-parse / mammoth 报错
    DOC_ENCRYPTED: 40006, // 加密 PDF
    DOC_ALREADY_PROCESSING: 40007, // 已有 active job

    // 检索 / 问答 5xxx
    LLM_UNREACHABLE: 50001, // LM Studio 离线
    LLM_MODEL_NOT_LOADED: 50002, // embedding 或 chat 模型未加载
    LLM_TIMEOUT: 50003, // 60s 内未首字
    LLM_STREAM_BROKEN: 50004, // 流式断连
    EMBEDDING_DIM_MISMATCH: 50005, // 知识库声明 768 但模型输出 1024
    SEARCH_EMPTY: 50006, // 检索无结果(不是错,只是 info)
    KB_HAS_NO_DOCS: 50007, // 知识库还没上传文档

    // 会话 6xxx
    CONV_NOT_FOUND: 60001,
    CONV_BELONGS_TO_DELETED_KB: 60002,
    CONTEXT_TOO_LONG: 60003, // > 8000 tokens
    USER_ABORTED: 60004, // 用户主动中断生成

    // 系统 9xxx
    DB_UNREACHABLE: 90001,
    REDIS_UNREACHABLE: 90002,
    INTERNAL_ERROR: 99999,
}as const

// ErrorCode 错误码类型
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// ====== ErrorResponse 结构 ======
export const ErrorResponseSchema = z.object ({
    error: z.object({
        code: z.number().int().positive(), // 错误码
        message: z.string(), // 人类可读(英文为主)
        i18n_key: z.string().nullable().optional(), // 前端 i18n 翻译 key,如 'errors.doc_too_large'
        details: z.record(z.string(),z.unknown()).optional(), // 上下文(字段名、限制值等)
        request_id: z.string(), // 用于日志关联
    }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;