/**
 * 用 LLM 总结 5-10 字标题(异步,不阻塞主流程)
 * 第一轮对话完成后触发
 */
import { config } from '../config'
import { updateConversationTitle } from './conversations'


/**
 * 异步生成并设置会话标题
 * - 不抛错(失败仅 console.warn)
 * - 截断 prompt 避免 token 浪费
 */
export async function generateAndSetTitle(
    conversation_id: string,
    question: string,
    answer: string
): Promise<void> {
    try {
        const prompt = `请根据以下用户问题和 AI 回答,生成一个简洁的 5-10 字中文标题(只输出标题本身,不要解释、不要标点):
            【用户问题】
            ${question}
            【AI 回答】
            ${answer.slice(0, 500)}`
        const response = await fetch(`${config.LMSTUDIO_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: config.CHAT_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 50,
                temperature: 0.3,
            }),
        })
        if (!response.ok) {
            console.warn(`[title] LLM 生成标题失败, status: ${response.status}`)
        }
        const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>
        }
        const title = data.choices?.[0]?.message?.content?.trim().replace(/[。.,!?;:]+$/, '').slice(0, 200) ?? null
        if (title) {
            await updateConversationTitle(conversation_id, title)
            console.log(`[title] conv=${conversation_id} title="${title}"`)
        }
    }catch (e) {
        console.warn('[title] generation failed:', e instanceof Error ? e.message : e)
    }
}