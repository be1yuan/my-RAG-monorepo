import { apiFetch } from './client'
import type {
  KnowledgeBase,
  KnowledgeBaseCreate,
  KnowledgeBaseUpdate,
} from "shared-types"

export const kbsApi = {
  list: () =>
    apiFetch<{kbs: KnowledgeBase[]}>('/api/kbs'),

  get: (id: string) =>
    apiFetch<KnowledgeBase>(`/api/kbs/${id}`),

  create: (data: KnowledgeBaseCreate) =>
    apiFetch<KnowledgeBase>('/api/kbs', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: KnowledgeBaseUpdate) =>
    apiFetch<KnowledgeBase>(`/api/kbs/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/api/kbs/${id}`, {
      method: 'DELETE',
    }),
}
