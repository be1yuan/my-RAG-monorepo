import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { config } from "./config"
import { ErrorCode, KnowledgeBaseCreateSchema } from "shared-types"

console.log("✅ ErrorCode.LLM_UNREACHABLE =", ErrorCode.LLM_UNREACHABLE)
console.log("📦 Name _def:", KnowledgeBaseCreateSchema.shape.name._def)
console.log("📦 Name constructor:", KnowledgeBaseCreateSchema.shape.name.constructor.name)

const app = new Hono().get("/", (c) => c.json({ 
  message: "RAG Backend OK" ,
  config: { port: config.PORT, db: config.DATABASE_URL.split("@")[1] }
}))

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`🚀 http://localhost:${info.port}`)
})