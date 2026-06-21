import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { initDb } from "./db/index.js";
import { agentRoute } from "./routes/agent.js";
import { copyRouter } from "./routes/copy.js";
import { health } from "./routes/health.js";
import { historyRouter } from "./routes/history.js";
import { topicRouter } from "./routes/topic.js";

initDb();

const app = new Hono()
  .use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  )
  .basePath("/api/v1")
  .route("/", health)
  .route("/agent", agentRoute)
  .route("/topics", topicRouter)
  .route("/", copyRouter)
  .route("/", historyRouter);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`backend on http://localhost:${info.port}`);
});
