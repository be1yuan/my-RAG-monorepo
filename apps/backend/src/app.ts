import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { config } from "./config"
import { db, checkDbConnection, closeDb } from './db/client'  
import { knowledgeBases }  from './db/schema'


const app = new Hono()

//健康检查
app.get("/api/health", async (c) => {
  const db0k = await checkDbConnection()
  return c.json({ 
    status: db0k ? 'ok' : 'degraded',
    checks: {
      postgres: db0k ? 'ok' : 'down',
      lm_studio: 'ok',
      redis: 'not_required',
    }
  })
})

//列出知识库
app.get("/api/kbs", async (c) => {
  try {
    const kbs = await db.select().from(knowledgeBases).limit(10)
    return c.json({ kbs })
  } catch (error) {
    // ✅ 类型守卫：检查 error 是否为 Error 实例
    if (error instanceof Error) {
      return c.json({ error: error.message })
    }
    // ✅ 处理未知类型
    return c.json({ error: 'An unknown error occurred' })
  }
})

//关闭数据库连接
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...')
  await closeDb()
  process.exit(0) // 0 表示正常退出
})

serve({
  fetch: app.fetch,
  port: config.PORT
}, (info) => {
  console.log(`🚀 Backend at http://localhost:${info.port}`);
  console.log(`📊 DB: ${config.DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
})
