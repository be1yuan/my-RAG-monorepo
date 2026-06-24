import { z } from 'zod'
import { CitationSchema } from './api'
import { ErrorResponseSchema } from './errors'

// ============================================================
// 定义 SSE 事件的结构server send event
// ============================================================
export const SSEEventSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('start') }),
    z.object({
        type: z.literal('chunk'),
        content: z.string(),
    }),
    z.object({
        type: z.literal('citation'),
        citations: z.array(CitationSchema),
    }),
    z.object({
        type: z.literal('done'),
        total_tokens: z.number().int().optional(),
    }),
    z.object({
        type: z.literal('error'),
        error: ErrorResponseSchema.shape.error,
    }),
]);
export type SSEEvent = z.infer<typeof SSEEventSchema>;
// 解析 SSE data 行(前后端共用)
export function parseSSEData(raw: string): SSEEvent | null {
    if (!raw.startsWith("data: ")) return null;
    try {
        const json = JSON.parse(raw.slice(6));
        const parsed = SSEEventSchema.safeParse(json);
        if (!parsed.success) {
            console.warn("Invalid SSE event:", parsed.error.issues);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}