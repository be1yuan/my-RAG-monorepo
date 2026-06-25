import { Context } from "hono"
import { ErrorCode, type ErrorResponse, type ErrorCodeType } from "shared-types";

// 1. ApiError 类(throw 用)
export class ApiError extends Error {
    constructor(
        public code: ErrorCodeType,
        public httpStatus: number,
        message: string,
        public i18nKey?: string,
        public details?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'ApiError'
    }

    toResponse(requestId: string): ErrorResponse {
        return {
            error: {
                code: this.code,
                message: this.message,
                i18n_key: this.i18nKey,
                details: this.details,
                request_id: requestId,
            }
        }
    }
}

// 2. 工厂函数(让 throw 更简洁)
export const Errors = {
    invalidParams: (details?: Record<string, unknown>) => 
        new ApiError(ErrorCode.INVALID_PARAMS, 400, 'Request validation failed','errors.invalid_params', 
            details),

    rateLimit: (retryAfterSec?: number) => 
        new ApiError(ErrorCode.RATE_LIMIT_EXCEEDED, 429, 'Too many requests','errors.rate_limit_exceeded', 
            retryAfterSec ? { retry_after_seconds: retryAfterSec } : undefined),

    kbNotFound: (kbId: string) => 
        new ApiError(ErrorCode.KB_NOT_FOUND, 404, `Knowledge base ${kbId} not found`,"errors.kb_not_found", 
            { kb_id: kbId }),

    kbAlreadyExists: (name: string) =>
        new ApiError(ErrorCode.KB_ALREADY_EXISTS, 409, `Knowledge base "${name}" already exists`,"errors.kb_already_exists", 
            { name }),
    docNotFound: (docId: string) =>
        new ApiError(ErrorCode.DOC_NOT_FOUND, 404, `Document ${docId} not found`,"errors.doc_not_found", 
            { document_id: docId }),
    docTooLarge: (actualSize: number, maxSize: number) =>
        new ApiError(ErrorCode.DOC_FILE_TOO_LARGE, 413,
        `File size ${actualSize} exceeds limit ${maxSize}`,"errors.doc_too_large", 
            { actual_size: actualSize, max_size: maxSize }),
    docUnsupportedFormat: (actual: string, allowed: string[]) =>
        new ApiError(ErrorCode.DOC_UNSUPPORTED_FORMAT, 415,
        `Unsupported format: .${actual}`,"errors.doc_unsupported_format", 
            { actual, allowed }),
    llmUnreachable: (baseURL: string) =>
        new ApiError(ErrorCode.LLM_UNREACHABLE, 503,
        `LLM service unreachable: ${baseURL}`,"errors.llm_unreachable", 
            { base_url: baseURL }),
    llmModelNotLoaded: (required: string[], loaded: string[]) =>
        new ApiError(ErrorCode.LLM_MODEL_NOT_LOADED, 503,
        `Required model not loaded: ${required.join(", ")}`,"errors.llm_model_not_loaded", 
            { required, loaded }),
    internal: (msg: string = "Internal server error") =>
        new ApiError(ErrorCode.INTERNAL_ERROR, 500, msg,"errors.internal"),
    kbOwnerMismatch: (kbOwnerId: string, currentUserId: string | null) =>
        new ApiError(ErrorCode.KB_OWNER_MISMATCH, 403, `Current user (${currentUserId ?? "anonymous"}) is not the owner of this KB`,"errors.kb_owner_mismatch", 
            { kb_owner_id: kbOwnerId, current_user_id: currentUserId }),
}

// 3. Hono 全局 Error Middleware
export async function errorHandler(err: Error, c: Context): Promise<Response> {
    const requestId = c.get('requestId') || crypto.randomUUID()
    if (err instanceof ApiError) {
        console.warn(`[${requestId}] ApiError:`, err.code, err.message, err.details)
        return c.json(err.toResponse(requestId), err.httpStatus as any)
    }

     // Zod 校验错误
    if (err.name === 'ZodError') {
        const issues = (err as any).issues || []
        console.warn(`[${requestId}] ZodError:`, issues)
        return c.json(
            Errors.invalidParams({ issues }).toResponse(requestId),
            400
        )
    }

     // 兜底
    console.error(`[${requestId}] Unhandled error:`, err)
    return c.json(Errors.internal(err.message).toResponse(requestId), 500)
}

// 包装 PG 23505 错误 → 转 kbAlreadyExists(或更通用的 ApiError)
export function pgUniqueViolationToApiError(e: unknown, factory: () => ApiError): never {
    const pgCode = (e as any)?.cause?.code || (e as any)?.code;
    if (pgCode === "23505") {
        throw factory();
    }
    throw e;  // 重新抛非 unique 错误
}
