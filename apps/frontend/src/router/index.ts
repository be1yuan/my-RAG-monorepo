import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'kb-list',
      component: () => import('@/views/KBListView.vue'),
    },
    {
      path: '/kbs/:id',
      name: 'kb-detail',
      component: () => import('@/views/KBDetailView.vue'),
    },
  ],
})

export default router
