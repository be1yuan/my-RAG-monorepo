import { kbsApi } from "@/api/kbs"
import type { KnowledgeBase, KnowledgeBaseCreate, KnowledgeBaseUpdate } from "shared-types"
import { ApiError } from "@/api/client"
import { defineStore } from "pinia"
import { ref, computed } from "vue"

export const useKbStore = defineStore('kbs', () => {
  const kbs = ref<KnowledgeBase[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadList() {
    loading.value = true
    error.value = null

    try {
      const res = await kbsApi.list()
      kbs.value = res.kbs
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Failed to load knowledge bases'
    } finally {
      loading.value = false
    }
  }

  async function create(data: KnowledgeBaseCreate) {
    const kb = await kbsApi.create(data)
    kbs.value.unshift(kb) // 新增到列表开头
    return kb
  }

  async function update(id: string, data: KnowledgeBaseUpdate) {
    const kb = await kbsApi.update(id, data)
    const idx = kbs.value.findIndex((k) => k.id === id)
    if (idx >= 0) {
      kbs.value[idx] = kb
    }
    return kb
  }

  async function remove(id: string) {
    await kbsApi.remove(id)
    kbs.value = kbs.value.filter((k) => k.id !== id)
  }

  const getById = (id: string) => computed(() => kbs.value.find((k) => k.id === id))

  return {
    kbs,
    loading,
    error,
    loadList,
    create,
    update,
    remove,
    getById,
  }
})
