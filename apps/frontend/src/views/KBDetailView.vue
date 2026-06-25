<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { kbsApi } from "@/api/kbs"
import { ApiError } from "@/api/client"
import type { KnowledgeBase } from "shared-types"
import { fmtDate } from "@/utils/index"
import type { FormInstance } from "element-plus"

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const kb = ref<KnowledgeBase | null>(null)
const loading = ref(false)
const editing = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: "",
  description: ""
})

async function load() {
  loading.value = true
  try {
    kb.value = await kbsApi.get(id)
    form.name = kb.value.name
    form.description = kb.value.description || ""
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      ElMessage.error("知识库不存在")
      router.push('/')
    } else {
      ElMessage.error(e instanceof ApiError ? e.message : "加载知识库详情失败")
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

function startEdit() {
  if (!kb.value) return
  form.name = kb.value.name
  form.description = kb.value.description || ""
  editing.value = true
}

async function saveEdit() {
  try {
    const update = await kbsApi.update(id, {
      name: form.name,
      description: form.description || undefined
    })
    kb.value = update
    editing.value = false
    ElMessage.success("保存成功")
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : "保存知识库失败")
  }
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm(`"确认删除${kb.value?.name}这个知识库吗？"`, "确认删除", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    })
    await kbsApi.remove(id)
    ElMessage.success("删除成功")
    router.push('/')
  } catch (e) {
    //cancel delete
    ElMessage.error(e instanceof ApiError ? e.message : "删除操作已取消")
  }
}
</script>

<template>
  <div class="page">
    <el-button style="margin-bottom: 16px" @click="router.push('/')">返回列表</el-button>
    <div v-if="loading">
      <span>加载中...</span>
    </div>
    <div v-else-if="kb" class="content">
      <el-card>
          <template #header>
            <div class="card-header">
              <h2>{{ kb.name }}</h2>
              <div>
                <el-button type="primary" size="small" @click="startEdit">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="handleDelete">
                  删除
                </el-button>
              </div>
            </div>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="ID">
              <code>{{ kb.id }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="所有者">
              {{ kb.ownerId || "公共" }}
            </el-descriptions-item>
            <el-descriptions-item label="描述">
              {{ kb.description || "无" }}
            </el-descriptions-item>
            <el-descriptions-item label="嵌入模型">
              <code>{{ kb.embedding_model }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="聊天模型">
              <code>{{ kb.chat_model }}</code>
            </el-descriptions-item>
            <el-descriptions-item label="分块大小">
              {{ kb.chunk_size }} / Overlap {{ kb.chunk_overlap }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ fmtDate(kb.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ fmtDate(kb.updated_at) }}
            </el-descriptions-item>
          </el-descriptions>
      </el-card>

      <el-dialog v-model="editing" title="Edit Knowledge Base" width="500">
        <el-form label-width="80px" ref="formRef">
          <el-form-item label="Name">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="Description">
            <el-input v-model="form.description" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editing = false">Cancel</el-button>
          <el-button type="primary" @click="saveEdit">Save</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h2 {
      margin: 0;
      font-size: 20px;
    }
    .loading {
      text-align: center;
      padding: 32px;
      color: #909399;
    }
    code {
      font-family: monospace;
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
    }
  }
}
</style>

