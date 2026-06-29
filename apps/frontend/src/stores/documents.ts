import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentStatusChangedEvent } from 'shared-types'
import type { Document as KbDocument } from 'shared-types/api'
import { documentsApi } from '@/api/documents'

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<KbDocument[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // SSE 订阅句柄(单 kb 订阅,切换时 unsubscribe)
  let unsubscribe: (() => void) | null = null

  async function loadList(kbId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await documentsApi.list(kbId)
      documents.value = res.documents as KbDocument[]
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
        const eventData = data as DocumentStatusChangedEvent
        const doc = documents.value.find((d) => d.id === eventData.id)
        if (doc) {
          doc.status = eventData.status
          doc.chunk_count = eventData.chunk_count
          doc.error_msg = eventData.error_msg ?? null
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
