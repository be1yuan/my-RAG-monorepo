<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ApiError } from "@/api/client"
import type { KnowledgeBase } from "shared-types"
import { useKbStore } from "@/stores/kbs"
import { ElMessage } from "element-plus"
import { fmtDate } from "@/utils/index"

const store = useKbStore()
const router = useRouter()
const dialogVisible = ref(false)

const kbsList = computed(() => store.kbs)

const form = reactive({
  name: "",
  description: "",
  embedding_model: "nomic-embed-text-v1.5",
  chat_model: "qwen3-4b-thinking-2507",
  chunk_size: 512,
  chunk_overlap: 64,
})
const submitting = ref(false)

onMounted(() => {
  store.loadList()
  console.log('1',kbsList.value)
})

async function handleCreate() {
  if (!form.name.trim()) {
    ElMessage.warning("请输入知识库名称")
    return
  }

  submitting.value = true
  try {
    await store.create({
      name: form.name,
      description: form.description || undefined,
      embedding_model: form.embedding_model,
      chat_model: form.chat_model,
      chunk_size: form.chunk_size,
      chunk_overlap: form.chunk_overlap,
    })
    ElMessage.success("创建成功")
    dialogVisible.value = false
    form.name = ""
    form.description = ""
  } catch (e) {
    ElMessage.error( e instanceof ApiError ? e.message : "创建失败")
  } finally {
    submitting.value = false
  }
}

function goDetail(kb: KnowledgeBase) {
  router.push(`/kbs/${kb.id}`)
}

// async function handleDelete(kb: KnowledgeBase) {
//   try {
//     await ElMessageBox.confirm(`确认删除知识库 ${kb.name} 吗？`, '确认删除', {
//       confirmButtonText: '确定',
//       cancelButtonText: '取消',
//       type: 'warning',
//     })
//     await store.remove(kb.id)
//     ElMessage.success("删除成功")
//   } catch (e) {
//     // user cancelled the delete
//     ElMessage.error( e instanceof ApiError ? e.message : "删除操作已取消")
//   }
// }
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">
        <h1 data-zh="知识库" data-en="Knowledge Bases">知识库</h1>
        <span class="desc" data-zh="管理所有知识库,创建后即可上传文档、开始问答。" data-en="Manage every knowledge base — upload documents and start asking once created.">管理所有知识库,创建后即可上传文档、开始问答。</span>
      </div>
      <button class="btn btn-primary btn-lg" id="new-kb-btn" @click="dialogVisible = true">
        <span data-zh="+ 新建知识库" data-en="+ New Knowledge Base">+ 新建知识库</span>
      </button>
    </div>

    <div class="toolbar">
      <div class="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input class="input"
          data-zh-placeholder="按名称或描述搜索…" data-en-placeholder="Search by name or description…"
          placeholder="按名称或描述搜索…" id="search-input" />
      </div>
      <div class="filter-chips" role="tablist">
        <button class="active" data-zh="全部" data-en="All">全部</button>
        <button data-zh="我的" data-en="Mine">我的</button>
        <button data-zh="公共" data-en="Public">公共</button>
      </div>
    </div>

    <div class="loading" v-if="store.loading">
      <span>加载中...</span>
    </div>
    <div class="error" v-else-if="store.error">
      <span>{{ store.error }}</span>
    </div>

    <section class="kb-grid" id="kb-grid" aria-live="polite" v-else>
      <article class="kb-card" data-href="kb-detail.html" v-for="(item, index) in kbsList" :key="index" @click="goDetail(item)">
        <div class="row">
          <div class="kb-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <div class="kb-name" data-zh="{{ item.name }}" data-en="{{ item.name }}">{{ item.name }}</div>
        </div>
        <div class="kb-desc" data-zh="{{ item.description }}" data-en="{{ item.description }}">{{ item.description || '无' }}</div>
        <div class="kb-stats">
          <div class="kb-stat"><span class="v">23</span><span class="k" data-zh="文档" data-en="Docs">文档</span></div>
          <div class="kb-stat"><span class="v">1,847</span><span class="k" data-zh="切片" data-en="Chunks">切片</span></div>
          <div class="kb-stat"><span class="v">42 MB</span><span class="k" data-zh="大小" data-en="Size">大小</span></div>
        </div>
        <div class="kb-meta">
          <span class="owner"><span class="owner-dot">w</span> {{item?.ownerId?.slice(0, 8) || '公共' }}</span>
          <span class="mono">创建于 {{ fmtDate(item.created_at) }}</span>
        </div>
      </article>
    </section>

    <!-- 创建弹窗 -->
    <el-dialog title="创建知识库" v-model="dialogVisible" width="500">
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
          <button class="btn btn-ghost" data-close data-zh="取消" data-en="Cancel" @click="dialogVisible = false">取消</button>
          <button class="btn btn-primary" id="create-submit" data-zh="创建" data-en="Create" @click="handleCreate">创建</button>
        </footer>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 24px;
}
.search {
  flex: 1; max-width: 360px;
  position: relative;
}
.search input {
  padding-left: 34px;
}
.search svg {
  position: absolute; left: 10px; top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
}
.filter-chips { display: inline-flex; gap: 6px; }
.filter-chips button {
  padding: 6px 12px;
  font-size: 12.5px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}
.filter-chips button.active {
  background: var(--fg); color: var(--accent-fg-on);
  border-color: var(--fg);
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.kb-card {
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex; flex-direction: column; gap: 14px;
  transition: border-color .15s var(--ease), transform .15s var(--ease), box-shadow .15s var(--ease);
  cursor: pointer;
  position: relative;
}
.kb-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
}
.kb-card .kb-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: var(--surface-2);
  display: grid; place-items: center;
  color: var(--muted);
}
.kb-card .kb-name {
  font-size: 16px; font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1.35;
}
.kb-card .kb-desc {
  font-size: 13px; color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.kb-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.kb-stat { display: flex; flex-direction: column; gap: 2px; }
.kb-stat .v { font-family: var(--font-mono); font-size: 15px; font-weight: 500; }
.kb-stat .k { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; }
.kb-meta {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11.5px; color: var(--muted);
}
.kb-meta .owner {
  display: inline-flex; align-items: center; gap: 6px;
}
.owner-dot {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  display: grid; place-items: center;
  font-size: 10px; font-weight: 600;
}

/* Empty state */
.empty {
  padding: 80px 24px;
  text-align: center;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
.empty .icon {
  width: 48px; height: 48px;
  margin: 0 auto 16px;
  border-radius: 12px;
  background: var(--surface-2);
  display: grid; place-items: center;
  color: var(--muted);
}
.empty h3 { font-size: 17px; margin-bottom: 6px; }
.empty p { color: var(--muted); font-size: 13.5px; max-width: 40ch; margin: 0 auto 20px; }

/* Toast */
.toast-host {
  position: fixed; bottom: 24px; right: 24px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 100;
}
.toast {
  background: var(--fg);
  color: var(--accent-fg-on);
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  box-shadow: var(--shadow-3);
  animation: slide-in .25s var(--ease);
}
@keyframes slide-in { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }

.modal { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; }
.modal[hidden] { display: none; }
.modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(15, 23, 42, 0.40);
  backdrop-filter: blur(4px);
  animation: fade-in .15s var(--ease);
}
.modal-card {
  position: relative;
  width: min(480px, calc(100% - 32px));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
  overflow: hidden;
  animation: pop-in .2s var(--ease);
}
@keyframes fade-in { from { opacity: 0; } }
@keyframes pop-in  { from { transform: scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
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
</style>
