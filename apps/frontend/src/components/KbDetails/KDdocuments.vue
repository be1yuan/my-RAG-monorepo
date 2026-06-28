<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'docs'
  }
})
</script>

<template>
  <section class="panel" data-panel="docs" v-if="activeTab === 'docs'">
    <div class="upload-zone" id="upload-zone">
      <div class="icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
      </div>
      <h3 data-zh="拖拽文档到这里,或点击选择" data-en="Drop documents here, or click to browse">拖拽文档到这里,或点击选择</h3>
      <p class="hint" data-zh="每个文档上限 20 MB · 单文件支持 PDF / DOCX / Markdown / TXT" data-en="≤ 20 MB per file · PDF / DOCX / Markdown / TXT">每个文档上限 20 MB · 单文件支持 PDF / DOCX / Markdown / TXT</p>
      <button class="btn btn-secondary btn-sm" data-zh="选择文件" data-en="Browse files">选择文件</button>
      <div class="formats">
        <span>PDF</span>·<span>DOCX</span>·<span>MD</span>·<span>TXT</span>
      </div>
    </div>

    <div class="doc-table" role="table" aria-label="Documents">
      <div class="doc-row head" role="row">
        <span></span>
        <span data-zh="名称" data-en="Name">名称</span>
        <span data-zh="切片 / 大小" data-en="Chunks / Size">切片 / 大小</span>
        <span data-zh="嵌入模型" data-en="Embedding">嵌入模型</span>
        <span data-zh="状态" data-en="Status">状态</span>
        <span></span>
      </div>

      <div class="doc-row">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span>
        <span class="name">设计方案 v3.pdf</span>
        <span class="mono">312 chunks · 4.2 MB</span>
        <span class="mono">nomic-embed</span>
        <span><span class="badge success"><span class="badge-dot"></span> <span data-zh="就绪" data-en="Ready">就绪</span></span></span>
        <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
      </div>

      <div class="doc-row">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
        <span class="name">告警运维记录 2025Q4.md</span>
        <span class="mono">89 chunks · 0.4 MB</span>
        <span class="mono">nomic-embed</span>
        <span><span class="badge success"><span class="badge-dot"></span> <span data-zh="就绪" data-en="Ready">就绪</span></span></span>
        <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
      </div>

      <div class="doc-row">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
        <span class="name">三维建模图集.zip</span>
        <span class="mono" data-zh="—" data-en="—">—</span>
        <span class="mono">—</span>
        <span>
          <div class="progress" style="width:120px;"><span style="width:62%;"></span></div>
          <span class="muted" style="font-size:11px; margin-top:2px; display:inline-block;">62% · nomic-embed</span>
        </span>
        <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
      </div>

      <div class="doc-row">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
        <span class="name">故障排查手册.docx</span>
        <span class="mono" data-zh="—" data-en="—">—</span>
        <span class="mono">—</span>
        <span><span class="badge warn"><span class="badge-dot"></span> <span data-zh="解析中" data-en="Parsing">解析中</span></span></span>
        <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
      </div>

      <div class="doc-row">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
        <span class="name">会议纪要-2026Q2.txt</span>
        <span class="mono" data-zh="—" data-en="—">—</span>
        <span class="mono">—</span>
        <span><span class="badge danger"><span class="badge-dot"></span> <span data-zh="失败" data-en="Failed">失败</span></span></span>
        <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel[hidden] { display: none; }

/* Upload zone */
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

/* Document table */
.doc-table {
  margin-top: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
}
.doc-row {
  display: grid;
  grid-template-columns: 32px 2fr 1fr 1fr 100px 32px;
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
.doc-row .name svg { color: var(--muted); }
.doc-row .mono { font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); }
.doc-row .progress {
  height: 4px; background: var(--surface-2); border-radius: 999px; overflow: hidden;
}
.doc-row .progress > span { display: block; height: 100%; background: var(--accent); }
</style>
