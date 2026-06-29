<script setup lang="ts">
import { useRoute } from 'vue-router'
import { defineProps } from 'vue'
import DocumentUpload from './kbDocument/DocumentUpload.vue'
import DocumentList from './kbDocument/DocumentList.vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'docs'
  }
})

const route = useRoute()
const kbId = route.params.id as string
</script>

<template>
  <section v-if="props.activeTab === 'docs'" class="panel" data-panel="docs">
    <DocumentUpload :kb-id="kbId" />
    <DocumentList :kb-id="kbId" />
  </section>
</template>

<style scoped lang="scss">

</style>
