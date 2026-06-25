<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ApiError } from "@/api/client"
import type { KnowledgeBase } from "shared-types"
import { useKbStore } from "@/stores/kbs"
import { ElMessage, ElMessageBox } from "element-plus"
import { fmtDate } from "@/utils/index"
import type { FormInstance } from "element-plus"

const store = useKbStore()
const router = useRouter()

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: "",
  description: "",
  embedding_model: "nomic-embed-text-v1.5",
  chat_model: "qwen3-4b-thinking-2507",
  chunk_size: 512,
  chunk_overlap: 64,
})
const submitting = ref(false)

onMounted(() => {
  store.loadList()
})

async function handleCreate() {
  if (!form.name.trim()) {
    ElMessage.warning("请输入知识库名称")
    return
  }

  submitting.value = true
  try {
    await store.create({
      name: form.name,
      description: form.description || undefined,
      embedding_model: form.embedding_model,
      chat_model: form.chat_model,
      chunk_size: form.chunk_size,
      chunk_overlap: form.chunk_overlap,
    })
    ElMessage.success("创建成功")
    dialogVisible.value = false
    form.name = ""
    form.description = ""
  } catch (e) {
    ElMessage.error( e instanceof ApiError ? e.message : "创建失败")
  } finally {
    submitting.value = false
  }
}

function goDetail(kb: KnowledgeBase) {
  router.push(`/kbs/${kb.id}`)
}

async function handleDelete(kb: KnowledgeBase) {
  try {
    await ElMessageBox.confirm(`确认删除知识库 ${kb.name} 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await store.remove(kb.id)
    ElMessage.success("删除成功")
  } catch (e) {
    // user cancelled the delete
    ElMessage.error( e instanceof ApiError ? e.message : "删除操作已取消")
  }
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>知识库列表</h1>
      <el-button type="primary" @click="dialogVisible = true">创建知识库</el-button>
    </header>

    <div class="loading" v-if="store.loading">
      <span>加载中...</span>
    </div>
    <div class="error" v-else-if="store.error">
      <span>{{ store.error }}</span>
    </div>

    <el-table
      v-else
      :data="store.kbs"
      style="width: 100%"
      stripe
      empty-text="暂无知识库"
    >
      <el-table-column prop="name" label="知识库名称" />
      <el-table-column prop="description" label="知识库描述" show-overflow-tooltip />
      <el-table-column label="创建">
        <template #default="{ row }">
          {{ fmtDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="goDetail(row)">详情</el-button>
          <el-popconfirm
            :title="`确认删除知识库 ${row.name} 吗？`"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建弹窗 -->
    <el-dialog title="创建知识库" v-model="dialogVisible" width="500">
        <el-form ref="formRef" :model="form" label-width="90px">
          <el-form-item label="知识库名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入知识库名称" />
          </el-form-item>
          <el-form-item label="知识库描述" prop="description">
            <el-input v-model="form.description" placeholder="请输入知识库描述" type="textarea" :rows="4" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="submitting">创 建</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    h1 {
      margin: 0;
      font-size: 24px;
    }
    .loading, .error {
      padding: 32px;
      text-align: center;
      color: #909399;
    }
  }
}
.error {
  color: #f56c6c;
}
</style>
