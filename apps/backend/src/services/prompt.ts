/**
 * Chat prompt 模板
 * - system: 角色 + 规则(必须基于参考资料,不编造)
 * - user: 参考资料(带编号) + 问题
 */
import type { RetrievaedChunk } from "./retrieval"

export interface ChatPrompt {
    systemPrompt: string
    userPrompt: string
}

export function buildChatPrompt(
    question: string,
    chunks: RetrievaedChunk[],
): ChatPrompt {
    const systemPrompt = `你是一个基于知识库的问答助手。请严格基于提供的"参考资料"回答用户问题:
        1. 答案必须从参考资料中提取,不要编造信息
        2. 如参考资料不包含答案,直接说"参考资料中没有相关信息"
        3. 回答末尾用 [1] [2] [3] 标注引用源(对应参考资料的编号)
        4. 用中文回答,简洁清晰`

    const contextText = chunks.length === 0
        ? '(无相关参考资料)'
        : chunks.map((chunk, i) =>
            `[${i + 1}] 文件: ${chunk.filename}\n${chunk.content}`
        ).join('\n\n---\n\n')
    const userPrompt = `参考资料:\n${contextText}\n\n问题: ${question}\n\n回答:`
    return { systemPrompt, userPrompt }
}