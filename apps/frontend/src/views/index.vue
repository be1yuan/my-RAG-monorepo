<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToKBList = () => {
  router.push({ name: 'kb-list' })
}
</script>

<template>
  <div class="page">
    <section class="launcher-hero">
      <div class="eyebrow" data-zh="本地大模型驱动的 RAG 全栈实战" data-en="Local-LLM RAG, end-to-end stack">本地大模型驱动的 RAG 全栈实战</div>
      <h1 data-zh="让知识可以被问、被引、被追溯" data-en="Make knowledge askable, citable, traceable.">让知识可以被问、被引、被追溯</h1>
      <p class="lead" data-zh="Atlas KB 是一个基于 PostgreSQL + pgvector + 本地大模型(LM Studio / Ollama)构建的知识库问答系统。文档解析 → 向量化 → 检索增强 → 流式回答 → 引用溯源,整套链路本地化运行,数据不出网。" data-en="Atlas KB is a RAG question-answering system built on PostgreSQL + pgvector + a local LLM (LM Studio / Ollama). Document parsing → embedding → retrieval-augmented → streaming answer → citation, the whole pipeline runs locally.">Atlas KB 是一个基于 PostgreSQL + pgvector + 本地大模型(LM Studio / Ollama)构建的知识库问答系统。文档解析 → 向量化 → 检索增强 → 流式回答 → 引用溯源,整套链路本地化运行,数据不出网。</p>

      <dl class="meta-row">
        <div>
          <dt data-zh="后端" data-en="Backend">后端</dt>
          <dd>Hono · Drizzle · PostgreSQL/pgvector</dd>
        </div>
        <div>
          <dt data-zh="前端" data-en="Frontend">前端</dt>
          <dd>Vue 3 · TypeScript · Pinia · Vite</dd>
        </div>
        <div>
          <dt data-zh="LLM" data-en="LLM">LLM</dt>
          <dd>nomic-embed + qwen3-4b</dd>
        </div>
        <div>
          <dt data-zh="进度" data-en="Milestone">进度</dt>
          <dd data-zh="M2 完成 · M3 进行中" data-en="M2 done · M3 in progress">M2 完成 · M3 进行中</dd>
        </div>
      </dl>
    </section>

    <section class="screen-grid" aria-label="Screens">
      <a class="screen-card" @click="goToKBList">
        <span class="num">01</span>
        <h3 data-zh="知识库列表" data-en="Knowledge Bases">知识库列表</h3>
        <p class="desc" data-zh="管理所有知识库:创建、查看文档数 / 切片数、进入详情。" data-en="Manage all knowledge bases — create, inspect doc / chunk counts, jump to detail.">管理所有知识库:创建、查看文档数 / 切片数、进入详情。</p>
        <span class="open" data-zh="打开" data-en="Open">打开</span>
      </a>
      <a class="screen-card" href="/kbs/:id">
        <span class="num">02</span>
        <h3 data-zh="知识库详情" data-en="KB Detail">知识库详情</h3>
        <p class="desc" data-zh="单库详情:文档上传、解析状态、嵌入进度、M3 检索 / 问答 tab。" data-en="Per-KB view: upload documents, watch parse / embed progress, M3 retrieval / chat tab.">单库详情:文档上传、解析状态、嵌入进度、M3 检索 / 问答 tab。</p>
        <span class="open" data-zh="打开" data-en="Open">打开</span>
      </a>
      <a class="screen-card" href="chat.html">
        <span class="num">03</span>
        <h3 data-zh="问答对话" data-en="Q&A Chat">问答对话</h3>
        <p class="desc" data-zh="流式问答 + 引用溯源 + 检索命中可视化(综合 P0-3 重点展示)。" data-en="Streaming answer + citation + retrieval-hit visualization (P0-3 highlight).">流式问答 + 引用溯源 + 检索命中可视化(综合 P0-3 重点展示)。</p>
        <span class="open" data-zh="打开" data-en="Open">打开</span>
      </a>
      <a class="screen-card" href="settings.html">
        <span class="num">04</span>
        <h3 data-zh="设置" data-en="Settings">设置</h3>
        <p class="desc" data-zh="模型 / 嵌入 / 检索 / 限流等 30+ 项运行时配置,启动 fail-fast 校验。" data-en="Model / embedding / retrieval / rate-limit + 30+ runtime knobs, fail-fast at boot.">模型 / 嵌入 / 检索 / 限流等 30+ 项运行时配置,启动 fail-fast 校验。</p>
        <span class="open" data-zh="打开" data-en="Open">打开</span>
      </a>
    </section>
  </div>
</template>

<style scoped lang="scss">
.launcher-hero {
  max-width: 1200px; margin: 0 auto;
  padding: 96px 24px 64px;
}
.launcher-hero .eyebrow {
  font-family: var(--font-mono);
  font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 20px;
}
.launcher-hero h1 {
  font-size: 56px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  max-width: 18ch;
  margin-bottom: 24px;
}
.launcher-hero .lead {
  font-size: 17px; color: var(--muted);
  max-width: 60ch; line-height: 1.55;
}
.meta-row {
  display: flex; gap: 28px; flex-wrap: wrap;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
  font-size: 13px; color: var(--muted);
}
.meta-row dt {
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--subtle);
  margin-bottom: 4px;
}
.meta-row dd { margin: 0 0 12px 0; color: var(--fg); font-weight: 500; }

.screen-grid {
  max-width: 1200px; margin: 0 auto;
  padding: 0 24px 96px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.screen-card {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition: border-color .2s var(--ease), box-shadow .2s var(--ease), transform .15s var(--ease);
  display: flex; flex-direction: column; gap: 12px;
  position: relative;
}
.screen-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}
.screen-card .num {
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: 0.08em;
  color: var(--subtle);
}
.screen-card h3 { font-size: 18px; }
.screen-card .desc { color: var(--muted); font-size: 13px; line-height: 1.55; flex: 1; }
.screen-card .open {
  margin-top: 4px;
  font-size: 12.5px; color: var(--fg);
  display: inline-flex; align-items: center; gap: 4px;
}
.screen-card .open::after {
  content: "→";
  transition: transform .15s var(--ease);
}
.screen-card:hover .open::after { transform: translateX(2px); }

.stage-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px; font-weight: 500;
  letter-spacing: 0.02em;
}
.stage-pill::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
}
</style>
