import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono().get("/", (c) => c.text("RAG Backend OK"));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`🚀 http://localhost:${info.port}`);
});