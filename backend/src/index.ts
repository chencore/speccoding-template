import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "./config.js";
import { initDb } from "./db/index.js";
import { agentRoute } from "./routes/agent.js";
import { health } from "./routes/health.js";

initDb();

const app = new Hono()
  .basePath("/api/v1")
  .route("/", health)
  .route("/agent", agentRoute);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`backend on http://localhost:${info.port}`);
});
