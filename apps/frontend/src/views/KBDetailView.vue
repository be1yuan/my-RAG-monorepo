<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { kbsApi } from "@/api/kbs"
import { ApiError } from "@/api/client"
import type { KnowledgeBase } from "shared-types"
import { fmtDate } from "@/utils/index"
import KDretrieval from "@/components/KbDetails/KDretrieval.vue"
import KDsetting from "@/components/KbDetails/KDsetting.vue"
import KDdocuments from "@/components/KbDetails/KDdocuments.vue"
import { useKbStore } from "@/stores/kbs"


const route = useRoute()
const router = useRouter()
const store = useKbStore()
const id = route.params.id as string

const kb = ref<KnowledgeBase | null>(null)
const loading = ref(false)
const editing = ref(false)

const form = reactive({
  name: "",
  description: "",
  embedding_model: "nomic-embed-text-v1.5",
  chat_model: "qwen3-4b-thinking-2507",
  chunk_size: 512,
  chunk_overlap: 64,
})

const activeTab = ref('docs')

const tabs = [
  { key: 'docs', label: '文档管理', zh: '文档管理', en: 'Documents' },
  { key: 'search', label: '检索调试', zh: '检索调试', en: 'Retrieval' },
  { key: 'settings', label: '配置', zh: '配置', en: 'Config' }
]

async function load() {
  loading.value = true
  try {
    kb.value = await kbsApi.get(id)
    console.log(kb.value)
    form.name = kb.value.name
    form.description = kb.value.description || ""
    await store.loadStatus(id)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      ElMessage.error("知识库不存在")
      router.push('/')
    } else {
      ElMessage.error(e instanceof ApiError ? e.message : "加载知识库详情失败")
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

function startEdit() {
  if (!kb.value) return
  form.name = kb.value.name
  form.description = kb.value.description || ""
  editing.value = true
}

async function saveEdit() {
  try {
    const update = await kbsApi.update(id, {
      name: form.name,
      description: form.description || undefined
    })
    kb.value = update
    editing.value = false
    ElMessage.success("保存成功")
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : "保存知识库失败")
  }
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm(`确认删除${kb.value?.name}这个知识库吗？`, "确认删除", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    })
    await kbsApi.remove(id)
    ElMessage.success("删除成功")
    router.push('/')
  } catch (e) {
    //cancel delete
    ElMessage.error(e instanceof ApiError ? e.message : "删除操作已取消")
  }
}
</script>

<template>
  <div class="page">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a @click="router.push('/')" data-zh="知识库" data-en="Knowledge Bases">知识库</a>
      <span class="sep">/</span>
      <span data-zh="{{ form.name }}" data-en="Knowledge Base Details">{{ form.name }}</span>
    </nav>
    <div v-if="loading">
      <span>加载中...</span>
    </div>
    <div v-else-if="kb" class="content">
      <header class="kb-header">
        <div class="left">
          <h1 data-zh="{{ kb.name }}" data-en="Knowledge Base Details">{{ kb.name }}</h1>
          <p class="desc" data-zh="{{ kb.description }}" data-en="Design docs, technical specs and O&M logs for the Mopanshan smart reservoir project.">{{ kb.description }}</p>
          <div class="meta">
            <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg> {{ kb.ownerId }}</span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <span data-zh="创建于" data-en="Created">创建于</span> {{ fmtDate(kb.created_at) }}</span>
            <span class="mono">id · {{ kb.id.slice(0, 4) }}…{{ kb.id.slice(-4) }}</span>
            <span class="badge info"><span class="badge-dot"></span> {{ kb.chat_model }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" id="edit-btn" data-zh="编辑" data-en="Edit" @click="startEdit">编辑</button>
          <button class="btn btn-danger" id="delete-btn" @click="handleDelete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            <span data-zh="删除" data-en="Delete">删除</span>
          </button>
          <el-button type="primary" size="large" @click="$router.push({ path: '/chat', query: { kb: id } })">
            开始问答
          </el-button>
        </div>
      </header>

      <section class="stat-grid" aria-label="Stats" v-if="store.status">
        <div class="stat-card">
          <div class="label" data-zh="文档" data-en="Documents">文档</div>
          <div class="value">{{ store.status.documentCount || 0 }}</div>
          <div class="delta" data-zh="+2 本周" data-en="+2 this week">+{{ store.status.documentCount || 0 }}本周</div>
        </div>
        <div class="stat-card">
          <div class="label" data-zh="切片" data-en="Chunks">切片</div>
          <div class="value">{{ store.status.chunkCount || 0 }}</div>
          <div class="delta" data-zh="512 char · 64 overlap" data-en="512 char · 64 overlap">512 char · 64 overlap</div>
        </div>
        <div class="stat-card">
          <div class="label" data-zh="总大小" data-en="Size">总大小</div>
          <div class="value">{{ ((store.status.totalSize || 0) / 1024 / 1024).toFixed(1) }} MB</div>
          <div class="delta" data-zh="≤ 20 MB / doc" data-en="≤ 20 MB / doc">≤ 20 MB / doc</div>
        </div>
        <div class="stat-card">
          <div class="label" data-zh="嵌入模型" data-en="Embedding">嵌入模型</div>
          <div class="value" style="font-size:14px;">{{ store.status.embeddingModel || '...' }}</div>
          <div class="delta" data-zh="HNSW · m=16 · ef=40" data-en="HNSW · m=16 · ef=40">HNSW · m=16 · ef=40</div>
        </div>
      </section>

      <div class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          :data-tab="tab.key"
          :data-zh="tab.zh"
          :data-en="tab.en"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <KDdocuments :activeTab="activeTab" />
      <KDretrieval :activeTab="activeTab" />
      <KDsetting :activeTab="activeTab" />


      <el-dialog v-model="editing" title="编辑知识库" width="500">
        <form class="modal-body" id="create-form">
          <div class="field">
            <label class="field-label" data-zh="名称" data-en="Name">名称</label>
            <input class="input" name="name" required maxlength="100"
              data-zh-placeholder="例如:磨盘山智慧水库文档库" data-en-placeholder="e.g. Mopanshan Reservoir Docs"
              placeholder="例如:磨盘山智慧水库文档库" v-model="form.name" />
            <span class="help" data-zh="1-100 字符" data-en="1–100 characters">1-100 字符</span>
          </div>
          <div class="field">
            <label class="field-label" data-zh="描述 (可选)" data-en="Description (optional)">描述 (可选)</label>
            <textarea class="textarea" name="description" rows="3" maxlength="500"
              data-zh-placeholder="这个知识库用来放什么内容?" data-en-placeholder="What will this knowledge base hold?"
              placeholder="这个知识库用来放什么内容?" v-model="form.description"></textarea>
          </div>
          <details class="advanced">
            <summary data-zh="高级选项" data-en="Advanced">高级选项</summary>
            <div class="spacer-y" style="margin-top:12px;">
              <div class="grid-2">
                <div class="field">
                  <label class="field-label" data-zh="嵌入模型" data-en="Embedding model">嵌入模型</label>
                  <input class="input" name="embedding_model" v-model="form.embedding_model" />
                </div>
                <div class="field">
                  <label class="field-label" data-zh="对话模型" data-en="Chat model">对话模型</label>
                  <input class="input" name="chat_model" v-model="form.chat_model" />
                </div>
              </div>
              <div class="grid-2">
                <div class="field">
                  <label class="field-label" data-zh="切片大小" data-en="Chunk size">切片大小</label>
                  <input class="input" name="chunk_size" type="number" v-model="form.chunk_size" min="128" max="2048" />
                </div>
                <div class="field">
                  <label class="field-label" data-zh="切片重叠" data-en="Chunk overlap">切片重叠</label>
                  <input class="input" name="chunk_overlap" type="number" v-model="form.chunk_overlap" min="0" max="512" />
                </div>
              </div>
            </div>
          </details>
        </form>
        <footer class="modal-foot">
          <button class="btn btn-ghost" data-close data-zh="取消" data-en="Cancel" @click="editing = false">取消</button>
          <button class="btn btn-primary" id="create-submit" data-zh="保存" data-en="Save" @click="saveEdit">保存</button>
        </footer>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  .breadcrumb {
    font-size: 12.5px; color: var(--muted);
    display: inline-flex; align-items: center; gap: 8px;
    margin-bottom: 16px; cursor: pointer;
  }
  .breadcrumb a:hover { color: var(--fg); }
  .breadcrumb .sep { color: var(--subtle); }

  .kb-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 24px; padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }
  .kb-header .left { flex: 1; }
  .kb-header h1 { font-size: 26px; letter-spacing: -0.015em; }
  .kb-header .desc { color: var(--muted); margin-top: 6px; max-width: 65ch; }
  .kb-header .meta {
    display: flex; gap: 24px; margin-top: 14px;
    font-size: 12.5px; color: var(--muted);
  }
  .kb-header .meta span { display: inline-flex; align-items: center; gap: 6px; }
  .kb-header .actions { display: flex; gap: 8px; }

  .stat-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 24px;
  }
  .stat-card {
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }
  .stat-card .label {
    font-size: 11.5px; color: var(--muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-family: var(--font-mono);
  }
  .stat-card .value {
    font-family: var(--font-mono);
    font-size: 24px; font-weight: 500;
    margin-top: 8px;
    letter-spacing: -0.01em;
  }
  .stat-card .delta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }

  .tabs {
    display: inline-flex;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    gap: 4px;
  }
  .tab {
    appearance: none;
    background: transparent; border: 0;
    padding: 10px 14px;
    font-size: 13.5px;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    transition: color .15s var(--ease), border-color .15s var(--ease);
  }
  .tab:hover { color: var(--fg); }
  .tab.active { color: var(--fg); border-bottom-color: var(--fg); font-weight: 500; }

  .modal-foot {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    background: var(--surface-2);
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .advanced summary {
    cursor: pointer;
    font-size: 12.5px; color: var(--muted);
    user-select: none;
  }
  .advanced summary:hover { color: var(--fg); }
}
</style>

