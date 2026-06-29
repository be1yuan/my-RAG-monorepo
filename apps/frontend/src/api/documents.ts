import { apiFetch } from './client'
import type { Document } from 'shared-types'

export const documentsApi = {
  list: async (kbId: string) =>
    await apiFetch<{documents: Document[]}>(`/api/kbs/${kbId}/documents`),

  upload: async (kbId: string, file: File): Promise<Document> => {
    const form = new FormData()
    form.append(
      'file',
      new Blob([await file.arrayBuffer()], { type: file.type }),
      file.name,
    )

    const res = await fetch(`/api/kbs/${kbId}/documents`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Upload failed (${res.status}): ${errText}`)
    }
    return (await res.json()) as Document
  },

  remove: (kbId: string, docId: string) =>
    apiFetch<void>(`/api/kbs/${kbId}/documents/${docId}`, {
      method: 'DELETE',
  }),

  // SSE 订阅
  subscribeEvents: (
    kbId: string,
    onEvent: (event: string, data: unknown) => void,
  ): (() => void) => {
    const url = `/api/kbs/${kbId}/documents/events`
    const es = new EventSource(url)

    es.addEventListener('connect', (e) => {
      onEvent('connect', JSON.parse((e as MessageEvent).data))
    })

    es.addEventListener('document.statusChanged', (e) => {
      onEvent('document.statusChanged', JSON.parse((e as MessageEvent).data))
    })

    es.onerror = (e) => {
      onEvent('error', e)
    }
    return () => es.close()
  }
}


