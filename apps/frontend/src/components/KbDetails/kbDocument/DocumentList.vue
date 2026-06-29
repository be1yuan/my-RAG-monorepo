<script setup lang="ts">
import { onMounted, onUnmounted, defineProps } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Document } from 'shared-types'
import { useDocumentsStore } from '@/stores/documents'

const props = defineProps<{ kbId: string }>()
const store = useDocumentsStore()
function progressPercent(doc: Document): number {
  if (doc.status === 'ready') return 100
  if (doc.status === 'failed') return 0
  // pending/processing 阶段:根据 chunk_count 估算(假设最终 ~20 chunks/页)
  // 暂用 5/50 占位
  return doc.status === 'pending' ? 5 : 50
}

onMounted(async () => {
  await store.loadList(props.kbId)
  store.subscribe(props.kbId)
})

onUnmounted(() => {
  store.unsubscribeEvents()
})

async function handleDelete(doc: Document) {
  try {
    await ElMessageBox.confirm(`确认删除文档 ${doc.filename}?`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await store.remove(props.kbId, doc.id)
    ElMessage.success('已删除')
  } catch(e) {
    // 取消
    if (e instanceof Error && e.message === 'User canceled the operation') {
      return ElMessage.error(`删除失败: ${e.message || e}`)
    } else {
      ElMessage.warning('取消删除')
    }
  }
}

function statusType(status: string) {
  return { ready: 'success', processing: 'warning', failed: 'danger', pending: 'info' }[status] ?? 'info'
}
function statusLabel(status: string) {
  return { ready: '就绪', processing: '处理中', failed: '失败', pending: '等待中' }[status] ?? status
}
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="doc-table" role="table">
    <div class="doc-row head" role="row">
      <span></span>
      <span>名称</span>
      <span>切片 / 大小</span>
      <span>状态</span>
      <span></span>
    </div>

    <div v-if="store.loading" class="doc-row">
      <span></span>
      <span colspan="4" style="text-align:center; color: var(--muted);">加载中...</span>
    </div>
    <div v-else-if="store.documents.length === 0" class="doc-row">
      <span></span>
      <span colspan="4" style="text-align:center; color: var(--muted);">
        暂无文档,上传第一个
      </span>
    </div>

    <div v-for="doc in store.documents" :key="doc.id" class="doc-row">
      <span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
      </span>
      <span class="name">{{ doc.filename }}</span>
      <span class="mono">{{ doc.chunk_count || 0 }} chunks · {{ fmtSize(doc.file_size) }}</span>
      <span>
        <span class="badge" :class="statusType(doc.status)">
          <span class="badge-dot"></span>
          {{ statusLabel(doc.status) }}
        </span>
        <div
          v-if="doc.status === 'pending' || doc.status === 'processing'"
          style="width: 120px; margin-top: 4px;"
        >
          <el-progress
            :percentage="progressPercent(doc.status)"
            :indeterminate="doc.status === 'processing'"
            :duration="3"
            :stroke-width="6"
          />
        </div>
        <div v-else-if="doc.status === 'ready'" style="width: 120px; margin-top: 4px;">
          <el-progress
            :percentage="100"
            status="success"
            :stroke-width="6"
          />
        </div>
        <div v-else-if="doc.status === 'failed'" style="width: 120px; margin-top: 4px;">
          <el-progress
            :percentage="progressPercent(doc.status)"
            status="exception"
            :stroke-width="6"
          />
        </div>
      </span>
      <button class="icon-btn" @click="handleDelete(doc)" aria-label="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.doc-table {
  margin-top: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
}
.doc-row {
  display: grid;
  grid-template-columns: 32px 2fr 1fr 1fr 32px;
  gap: 12px; align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}
.doc-row:first-child { border-top: 0; }
.doc-row.head {
  background: var(--surface-2);
  font-size: 11.5px; font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.doc-row .name { display: flex; align-items: center; gap: 10px; font-weight: 500; }
.doc-row .mono { font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); }
.doc-row .progress {
  height: 4px; background: var(--surface-2); border-radius: 999px; overflow: hidden;
}
.doc-row .progress > el-progress {
  display: block;
  height: 100%;
  background: var(--accent);
}
.icon-btn {
  appearance: none; background: transparent; border: 0;
  padding: 4px; border-radius: 4px; cursor: pointer;
  color: var(--muted);
}
.icon-btn:hover { color: var(--danger); background: var(--surface-2); }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
