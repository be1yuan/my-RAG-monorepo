<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDocumentsStore } from '@/stores/documents'

// vue3 自动暴露 defineProps,不需要 import
const props = defineProps<{ kbId: string }>()

const store = useDocumentsStore()
const uploading = ref(false)
const dragOver = ref(false)

const ACCEPT =
  '.pdf,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain'

async function handleFile(file: File) {
  uploading.value = true
  try {
    await store.upload(props.kbId, file)
    ElMessage.success(`已上传 ${file.name}`)
  } catch (e: any) {
    ElMessage.error(e?.message ?? '上传失败')
  } finally {
    uploading.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  for (const f of files) handleFile(f)
}
</script>

<template>
  <div
    class="upload-zone"
    :class="{ 'drag-over': dragOver }"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop="onDrop"
  >
    <div class="icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
      </svg>
    </div>
    <h3>拖拽文档到这里,或点击选择</h3>
    <p class="hint">每个文档上限 20 MB · PDF / DOCX / Markdown / TXT</p>
    <el-upload
      :accept="ACCEPT"
      :show-file-list="false"
      :http-request="(opts: any) => handleFile(opts.file as File)"
    >
      <el-button :loading="uploading" type="default" size="small">选择文件</el-button>
    </el-upload>
    <div class="formats">
      <span>PDF</span> · <span>DOCX</span> · <span>MD</span> · <span>TXT</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-zone {
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 40px 24px;
  text-align: center;
  background: var(--surface);
  transition: border-color .15s var(--ease), background .15s var(--ease);
}
.upload-zone.drag-over {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.upload-zone .icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  margin: 0 auto 12px;
  background: var(--surface-2);
  display: grid; place-items: center;
  color: var(--muted);
}
.upload-zone h3 { font-size: 15px; margin-bottom: 4px; }
.upload-zone .hint { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
.upload-zone .formats {
  display: inline-flex; gap: 6px;
  margin-top: 12px;
  font-size: 11.5px; color: var(--muted);
}
</style>
