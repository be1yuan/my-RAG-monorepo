import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Document } from 'shared-types'
import { documentsApi } from '@/api/documents'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // SSE 订阅句柄(单 kb 订阅,切换时 unsubscribe)
  let unsubscribe: (() => void) | null = null

  async function loadList(kbId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await documentsApi.list(kbId)
      documents.value = res.documents
      error.value = null
    } catch (e: unknown) {
      error.value = (e as Error).message ?? 'Failed to load documents'
    } finally {
      loading.value = false
    }
  }

  async function upload(kbId: string, file: File) {
    const doc = await documentsApi.upload(kbId, file)
    documents.value.unshift(doc) // 新增到列表头
    return doc
  }

  async function remove(kbId: string, docId: string) {
    await documentsApi.remove(kbId, docId)
    documents.value = documents.value.filter((d) => d.id !== docId)
  }
  function subscribe(kbId: string) {
    if (unsubscribe) unsubscribe()  // 清理旧订阅
    unsubscribe = documentsApi.subscribeEvents(kbId, (event, data) => {
      if (event === 'document.statusChanged') {
        const doc = documents.value.find((d) => d.id === data.id)
        if (doc) {
          doc.status = data.status
          doc.chunk_count = data.chunk_count
          doc.error_msg = data.error_msg
        }
      }
    })
  }
  function unsubscribeEvents() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }
  return {
    documents,
    loading,
    error,
    loadList,
    upload,
    remove,
    subscribe,
    unsubscribeEvents,
  }
})
