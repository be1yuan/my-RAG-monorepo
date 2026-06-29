import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"   // ⭐ CORS 中间件
import { config } from "./config"
import { checkDbConnection, closeDb } from './db/client'
import { errorHandler} from "./errors"
import { kbsRouter } from "./routes/kbs"
import { rateLimit } from "./middleware/rate-limit"
import { documentsRouter } from "./routes/documents"
import { startIngestionWorker } from "./services/ingestion"
import { chatRouter } from "./routes/chat"


// ⭐ 声明 Hono context 变量类型
type AppEnv = {
  Variables: {
    requestId: string;
  }
}

// ============ 创建 app ============
const app = new Hono<AppEnv>()

// 启动 ingestion worker
startIngestionWorker()

// ============ 全局中间件 ============
// ⭐ CORS(必须放最前面,让 OPTIONS 预检也走 CORS)
app.use("*", cors({
  origin: [
    "http://localhost:5173",      // Vite dev
    "http://localhost:4173",      // Vite preview
    "http://47.93.13.223:2333",   // 公网部署
  ],
  credentials: true,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-User-Id", "X-Request-Id"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
}))

app.use("*", async (c, next) => {
  // 给每个请求一个 ID(用于日志关联)
  const requestId = c.req.header('X-Request-Id') || crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

// ⭐ 限流中间件(挂载顺序:在路由之前,errorHandler 之后)
app.use('/api/*', rateLimit())
// 全局错误兜底(综合 P0-4)
app.onError(errorHandler)

// ============ 路由 ============

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

app.route('/', kbsRouter)
app.route('/', documentsRouter)
app.route('/', chatRouter)

//列出知识库
// app.get("/api/kbs", async (c) => {
//   try {
//     const kbs = await db.select().from(knowledgeBases).limit(10)
//     return c.json({ kbs })
//   } catch (error) {
//     // ✅ 类型守卫：检查 error 是否为 Error 实例
//     if (error instanceof Error) {
//       return c.json({ error: error.message })
//     }
//     // ✅ 处理未知类型
//     return c.json({ error: 'An unknown error occurred' })
//   }
// })

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
