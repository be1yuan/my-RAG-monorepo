<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import MessageBubble from '@/components/MessageBubble.vue'
import ChatInput from '@/components/ChatInput.vue'

const chatInputRef = ref<typeof ChatInput>()

const route = useRoute()
const chatStore = useChatStore()

const kbId = computed(() => (route.query.kb as string) ?? '')

function scrollToBottom() {
    const el = document.getElementById('messages')
    if (el) el.scrollTop = el.scrollHeight
}

watch(
    () => chatStore.messages.map((m) => m.content).join('|'),
    () => nextTick(scrollToBottom)
)

onMounted(() => {
    if (!kbId.value) {
      alert('请从知识库详情页进入问答')
    }
})

console.log('[ChatView] route.query.kb =', route.query.kb)
console.log('[ChatView] kbId.value =', kbId.value)
</script>

<template>
    <!-- ⭐ 套 opendesign .chat-shell 3 栏布局 -->
    <div class="chat-shell">
        <!-- 左 pane:KB 信息(M3 简化版,不做会话列表) -->
        <aside class="pane">
            <div class="conv-head">
                <h3>当前知识库</h3>
            </div>
            <div class="conv-list">
                <div class="conv-item active">
                    <div class="title">{{ kbId.slice(0, 8) }}…</div>
                    <div class="meta">M3 简化,无会话持久化</div>
                </div>
            </div>
        </aside>

        <!-- 中 pane:聊天 -->
        <section class="chat-main">
            <div class="chat-toolbar">
                <span class="kb-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <span>问答 · Atlas KB</span>
                </span>
                <span class="badge info"><span class="badge-dot"></span> qwen3-4b</span>
                <div style="flex:1"></div>
            </div>

            <div id="messages" class="messages">
                <MessageBubble
                    v-for="msg in chatStore.messages"
                    :key="msg.id"
                    :message="msg"
                />
                <div v-if="chatStore.messages.length === 0" class="empty">
                    <h2>开始对话</h2>
                    <p>输入问题,AI 会基于知识库内容回答</p>
                </div>
            </div>

            <ChatInput v-if="kbId" :kb-id="kbId" />
        </section>

        <!-- 右 pane:检索命中(M3 简化版,显示最后一条 assistant 的 citations) -->
        <aside class="pane right">
            <div class="right-pane-head">
                <h3>本次检索</h3>
                <span class="badge">
                    <span class="badge-dot"></span>
                    {{ chatStore.messages[chatStore.messages.length - 1]?.citations?.length ?? 0 }} 命中
                </span>
            </div>
            <div v-if="chatStore.messages[chatStore.messages.length - 1]?.citations" class="retrieval-section">
                <h4>命中切片(按相似度)</h4>
                <div
                    v-for="(hit, i) in chatStore.messages[chatStore.messages.length - 1].citations"
                    :key="hit.chunk_id"
                    class="hit"
                >
                    <div class="bar" :style="{ background: `oklch(${(70 + i * 5)}% 0.12 255)` }"></div>
                    <div class="info">
                        <div class="file">{{ hit.filename }} · #ch-{{ hit.chunk_index }}</div>
                        <div class="snippet">{{ hit.snippet }}</div>
                        <div class="meta">
                            <span class="score-bar" :style="{ width: `${hit.score * 50}px` }"></span>
                            {{ hit.score.toFixed(2) }} · vector
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="retrieval-section">
                <p style="color: var(--muted); font-size: 12px; padding: 16px;">尚无检索结果</p>
            </div>
        </aside>
    </div>
</template>

<style scoped>
/* ⭐ 套 opendesign 3 栏 grid 布局 */
.chat-shell {
    display: grid;
    grid-template-columns: 240px 1fr 320px;
    height: calc(100vh - 60px); /* 减去顶部 nav 高度 */
}
.pane {
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--surface);
}
.pane.right {
    border-right: 0;
    border-left: 1px solid var(--border);
    background: var(--surface-2);
}
.conv-head {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
}
.conv-head h3 {
    font-size: 13px;
    margin: 0;
}
.conv-list {
    padding: 8px;
}
.conv-item {
    padding: 10px 12px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background .15s var(--ease);
}
.conv-item.active {
    background: var(--surface-2);
}
.conv-item .title {
    font-size: 13px;
    font-weight: 500;
}
.conv-item .meta {
    font-size: 11.5px;
    color: var(--muted);
    margin-top: 2px;
}

.chat-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.chat-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
}
.kb-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
}

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 32px 0;
    scroll-behavior: smooth;
}
.empty {
    text-align: center;
    margin-top: 80px;
    color: var(--muted);
}
.empty h2 {
    font-size: 24px;
    margin-bottom: 12px;
}

/* ⭐ 右侧检索区(opendesign .right-pane-head + .retrieval-section + .hit) */
.right-pane-head {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
}
.right-pane-head h3 {
    font-size: 13px;
    margin: 0;
}
.retrieval-section {
    padding: 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
}
.retrieval-section h4 {
    font-size: 11.5px;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--font-mono);
    margin: 0 0 10px;
}
.hit {
    display: flex;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color .15s var(--ease);
}
.hit:hover {
    border-color: var(--accent);
}
.hit .bar {
    flex: 0 0 4px;
    background: var(--accent);
    border-radius: 2px;
}
.hit .info {
    flex: 1;
    min-width: 0;
}
.hit .file {
    font-size: 12px;
    font-weight: 500;
}
.hit .snippet {
    font-size: 11.5px;
    color: var(--muted);
    line-height: 1.5;
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.hit .meta {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
    font-family: var(--font-mono);
}
.score-bar {
    display: inline-block;
    height: 4px;
    background: linear-gradient(90deg, var(--accent), oklch(80% 0.10 255));
    border-radius: 2px;
    vertical-align: middle;
    margin-right: 6px;
}
</style>