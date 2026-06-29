<script setup lang="ts">
import type { ChatMessage } from '@/stores/chat'

defineProps<{
    message: ChatMessage
}>()

function copyContent(content: string) {
    void navigator.clipboard?.writeText(content)
}
</script>

<template>
    <div class="message-wrap">
        <!-- ⭐ 套 opendesign .message 结构 -->
        <div :class="['message', message.role]">
            <div class="avatar">{{ message.role === 'user' ? '你' : 'A' }}</div>
            <div class="body">
                <div class="role">
                    {{
                        message.role === 'user'
                            ? '你'
                            : message.streaming
                                ? 'Atlas KB · 正在生成…'
                                : `Atlas KB · 引用了 ${message.citations?.length ?? 0} 个切片`
                    }}
                </div>
                <div :class="['content', { cursor: message.streaming }]">
                    <template v-if="message.error">
                        <span style="color: var(--error-color);">⚠ {{ message.error.message }}</span>
                    </template>
                    <template v-else>
                        <p>{{ message.content }}</p>
                    </template>

                    <!-- ⭐ 引用胶囊(opendesign .citations-inline) -->
                    <div v-if="message.citations && message.citations.length > 0" class="citations-inline">
                        <button
                            v-for="(cite, i) in message.citations"
                            :key="cite.chunk_id"
                            class="cite"
                            :title="cite.snippet"
                        >
                            <span class="num">{{ i + 1 }}</span>
                            {{ cite.filename }} · 0.{{ Math.round(cite.score * 100) }}
                        </button>
                    </div>

                    <!-- ⭐ 操作按钮(opendesign .msg-actions) -->
                    <div v-if="!message.streaming && !message.error" class="msg-actions">
                        <button class="icon-btn" title="复制" @click="copyContent(message.content)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="icon-btn" title="点赞">👍</button>
                        <button class="icon-btn" title="点踩">👎</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ⭐ 套 opendesign .message-wrap + .message 样式 */
.message-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 8px 24px;
}
.message {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}
.message + .message {
    margin-top: 16px;
}
.message .avatar {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 600;
}
.message.user .avatar {
    background: var(--surface-2);
    color: var(--muted);
}
.message.assistant .avatar {
    background: var(--fg);
    color: var(--accent-fg-on);
}
.message .body {
    flex: 1;
    min-width: 0;
}
.message .role {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 4px;
}
.message .content {
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--fg);
}
.message .content p {
    margin: 0;
}

/* ⭐ 流式光标(opendesign .cursor) */
.cursor::after {
    content: "▍";
    color: var(--accent);
    animation: blink 1s steps(2) infinite;
    margin-left: 2px;
}
@keyframes blink {
    50% { opacity: 0; }
}

/* ⭐ 引用胶囊(opendesign .citations-inline) */
.citations-inline {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
}
.cite {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    background: var(--surface);
    cursor: pointer;
    transition: border-color .15s var(--ease), background .15s var(--ease);
}
.cite:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
}
.cite .num {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 600;
}

/* ⭐ 操作按钮(opendesign .msg-actions) */
.msg-actions {
    display: flex;
    gap: 4px;
    margin-top: 8px;
    opacity: 0;
    transition: opacity .15s var(--ease);
}
.message:hover .msg-actions {
    opacity: 1;
}
.msg-actions .icon-btn {
    width: 26px;
    height: 26px;
}
</style>