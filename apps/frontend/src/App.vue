<script setup lang="ts">
import { ErrorCode, KnowledgeBaseCreateSchema } from "shared-types"

console.log("✅ 前端拿到 ErrorCode =", ErrorCode.KB_NOT_FOUND)
// 测试类型推导
const badInput = { name: "ab" }  // 长度 2,小于 3
const result = KnowledgeBaseCreateSchema.safeParse(badInput)
console.log(result)  // ← 期望 success: false
</script>

<template>

</template>

<style scoped></style>
