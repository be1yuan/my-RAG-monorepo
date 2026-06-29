<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{ kbId: string }>()

const chatStore = useChatStore()
const question = ref('')

function handleSend() {
    const trimmed = question.value.trim()
    if (!trimmed || chatStore.isStreaming) return
    chatStore.sendMessage(props.kbId, trimmed)
    question.value = ''
    autoResize()
}

function handleStop() {
    chatStore.stopStreaming()
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
    }
}

function autoResize() {
    // textarea 自动增高(opendesign 行为)
    const ta = document.getElementById('chat-textarea') as HTMLTextAreaElement | null
    if (ta) {
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }
}
</script>

<template>
    <!-- ⭐ 套 opendesign .input-bar + .input-bar-inner -->
    <div class="input-bar">
        <div class="input-bar-inner">
            <textarea
                id="chat-textarea"
                v-model="question"
                rows="1"
                placeholder="向知识库提问…(Enter 发送 · Shift+Enter 换行)"
                :disabled="chatStore.isStreaming"
                @keydown="handleKeydown"
                @input="autoResize"
            ></textarea>
            <div class="tools">
                <div class="left">
                    <button class="icon-btn" title="上传临时文档(暂未实现)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                </div>
                <span class="kbd-hint">
                    <span class="kbd">Enter</span>
                    <span>发送 ·</span>
                    <span class="kbd">Shift+Enter</span>
                    <span>换行</span>
                </span>
                <button v-if="!chatStore.isStreaming" class="btn btn-primary btn-sm" @click="handleSend">
                    <span>发送</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button v-else class="btn btn-danger btn-sm" @click="handleStop">
                    <span>停止</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ⭐ 套 opendesign .input-bar 样式(完整复用) */
.input-bar {
    border-top: 1px solid var(--border);
    padding: 16px 24px 24px;
    background: var(--surface);
}
.input-bar-inner {
    max-width: 720px;
    margin: 0 auto;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: 12px 14px;
    transition: border-color .15s var(--ease), box-shadow .15s var(--ease);
}
.input-bar-inner:focus-within {
    border-color: var(--fg);
    box-shadow: 0 0 0 3px var(--accent-soft);
}
.input-bar textarea {
    width: 100%;
    border: 0;
    outline: 0;
    resize: none;
    background: transparent;
    font: inherit;
    min-height: 24px;
    max-height: 200px;
    line-height: 1.55;
}
.input-bar .tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
}
.input-bar .tools .left {
    display: inline-flex;
    gap: 4px;
}
.kbd-hint {
    font-size: 11px;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.kbd {
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    background: var(--surface-2);
}
</style>