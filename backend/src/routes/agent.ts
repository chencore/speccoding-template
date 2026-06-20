import { Hono } from "hono";
import { ask } from "../agent/index.js";

export const agentRoute = new Hono();

agentRoute.post("/ask", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body?.message || typeof body.message !== "string") {
    return c.json({ error: "message (string) is required" }, 400);
  }
  try {
    const { text } = await ask(body.message);
    return c.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/api key|unauthorized|401/i.test(msg)) {
      return c.json(
        { error: "LLM 调用失败，请检查 API key 配置", detail: msg },
        503,
      );
    }
    return c.json({ error: "LLM 调用失败", detail: msg }, 500);
  }
});
