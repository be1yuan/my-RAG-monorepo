<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const route = useRoute()
const navItems = [
  { label: '总览', en: 'Overview', path: '/' },
  { label: '知识库', en: 'Knowledge Bases', path: '/', matchName: 'kb-list' },
  { label: '问答', en: 'Chat', path: '/', matchName: 'chat' },
]
function isActive(matchName: string | undefined) {
  if (!matchName) return false
  return route.name === matchName
}
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <span class="brand-dot">A</span>
        Atlas KB
      </router-link>
      <nav class="nav-links">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="{ active: isActive(item.matchName) }"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <div class="nav-spacer"></div>
      <div class="nav-tools">
        <div class="avatar" title="wushangkun">w</div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">

</style>
