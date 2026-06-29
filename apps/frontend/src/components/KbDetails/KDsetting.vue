<script setup lang="ts">
const props = defineProps({
  activeTab: {
    type: String,
    default: 'settings'
  }
})
</script>

<template>
  <section class="panel" data-panel="settings" v-if="activeTab === 'settings'">
    <div class="card" style="max-width:560px;">
      <h3 style="margin-bottom:14px;" data-zh="知识库配置" data-en="KB configuration">知识库配置</h3>
      <div class="spacer-y">
        <div class="field">
          <label class="field-label" data-zh="名称" data-en="Name">名称</label>
          <input class="input" value="磨盘山智慧水库文档库" />
        </div>
        <div class="field">
          <label class="field-label" data-zh="描述" data-en="Description">描述</label>
          <textarea class="textarea" rows="3">磨盘山智慧水库项目的设计文档、技术方案与运维记录,含三维建模图与告警日志。</textarea>
        </div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label" data-zh="嵌入模型" data-en="Embedding">嵌入模型</label>
            <select class="select"><option>nomic-embed-text-v1.5</option><option>bge-large-zh-v1.5</option></select>
          </div>
          <div class="field">
            <label class="field-label" data-zh="对话模型" data-en="Chat">对话模型</label>
            <select class="select"><option>qwen3-4b-thinking-2507</option><option>gemma-3-e2b</option></select>
          </div>
          <div class="field">
            <label class="field-label" data-zh="切片大小" data-en="Chunk size">切片大小</label>
            <input class="input" type="number" value="512" />
          </div>
          <div class="field">
            <label class="field-label" data-zh="切片重叠" data-en="Overlap">切片重叠</label>
            <input class="input" type="number" value="64" />
          </div>
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn btn-primary" data-zh="保存" data-en="Save">保存</button>
          <button class="btn btn-ghost" data-zh="放弃" data-en="Discard">放弃</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">

</style>
