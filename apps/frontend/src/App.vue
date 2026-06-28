<script setup lang="ts">
import Nav from '@/components/nav.vue'
</script>

<template>
  <div class="app-root">
    <Nav />
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.app-root {
  min-height: 100vh;
  background: var(--bg);
}
</style>
