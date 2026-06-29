import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: () => import('@/views/index.vue'),
    },
    {
      path: '/kbs',
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
