import { Hono } from "hono";
import { classifyTopic, isValidCategory } from "../topic/classify.js";
import { TopicGenerateError, generateTopics } from "../topic/generate.js";
import { parseImportFile, parseImportText } from "../topic/import.js";
import {
  StatusValidationError,
  TopicNotFoundError,
  clearImportedVideos,
  getChannelDescription,
  getTopicById,
  listImportedVideos,
  listTopics,
  setChannelDescription,
  updateTopicCategory,
  updateTopicStatus,
} from "../topic/repo.js";
import { insertImportedVideos } from "../topic/repo.js";

export const topicRouter = new Hono();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

topicRouter.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const seeds = Array.isArray(body?.seeds) ? body.seeds : undefined;
  if (!seeds || seeds.length === 0) {
    return c.json({ error: "seeds 不能为空" }, 400);
  }
  const count =
    typeof body?.count === "number" && [5, 10, 20].includes(body.count)
      ? body.count
      : 10;

  try {
    const topics = await generateTopics({ seeds, count });
    return c.json({ topics });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/api key|unauthorized|401/i.test(msg)) {
      return c.json(
        { error: "LLM 调用失败，请检查 API key 配置", detail: msg },
        503,
      );
    }
    if (err instanceof TopicGenerateError) {
      return c.json({ error: "AI 输出解析失败", detail: msg }, 502);
    }
    return c.json({ error: "生成失败", detail: msg }, 500);
  }
});

topicRouter.get("/", (c) => {
  const status = c.req.query("status");
  const page = Number.parseInt(c.req.query("page") ?? "", 10) || DEFAULT_PAGE;
  const pageSize =
    Number.parseInt(c.req.query("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE;
  const result = listTopics({
    status: status as never,
    page,
    pageSize,
  });
  return c.json(result);
});

topicRouter.patch("/:id", async (c) => {
  const id = Number.parseInt(c.req.param("id"), 10);
  if (Number.isNaN(id)) {
    return c.json({ error: "id 非法" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  if (!body?.status || typeof body.status !== "string") {
    return c.json({ error: "status (string) is required" }, 400);
  }
  try {
    const topic = await updateTopicStatus(id, body.status);
    return c.json(topic);
  } catch (err) {
    if (err instanceof StatusValidationError) {
      return c.json({ error: err.message }, 400);
    }
    if (err instanceof TopicNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

topicRouter.patch("/:id/category", async (c) => {
  const id = Number.parseInt(c.req.param("id"), 10);
  if (Number.isNaN(id)) {
    return c.json({ error: "id 非法" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));

  if (body?.auto === true) {
    const topic = getTopicById(id);
    if (!topic) {
      return c.json({ error: "topic 不存在" }, 404);
    }
    try {
      const category = await classifyTopic(topic.title, topic.rationale);
      return c.json(updateTopicCategory(id, category));
    } catch {
      return c.json({ error: "AI 分类失败" }, 502);
    }
  }

  if (!body?.category || typeof body.category !== "string") {
    return c.json(
      { error: "category (string) or auto (true) is required" },
      400,
    );
  }
  if (!isValidCategory(body.category)) {
    return c.json({ error: `非法分类：${body.category}` }, 400);
  }
  try {
    return c.json(updateTopicCategory(id, body.category));
  } catch (err) {
    if (err instanceof TopicNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

topicRouter.post("/import", async (c) => {
  const contentType = c.req.header("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      return c.json({ error: "未提供 file 字段" }, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, skipped } = parseImportFile(buffer);
    const imported = insertImportedVideos(rows);
    return c.json({ imported, skipped });
  }

  if (contentType.includes("application/json")) {
    const body = await c.req.json().catch(() => ({}));
    if (!body?.text || typeof body.text !== "string") {
      return c.json({ error: "text (string) is required" }, 400);
    }
    const { rows, skipped } = parseImportText(body.text);
    const imported = insertImportedVideos(rows);
    return c.json({ imported, skipped });
  }

  return c.json(
    { error: "Content-Type 必须是 multipart/form-data 或 application/json" },
    400,
  );
});

topicRouter.get("/imported-videos", (c) => {
  return c.json({ items: listImportedVideos() });
});

topicRouter.delete("/imported-videos", (c) => {
  const deleted = clearImportedVideos();
  return c.json({ deleted });
});

topicRouter.get("/channel-config", (c) => {
  return c.json({ channel_description: getChannelDescription() });
});

topicRouter.put("/channel-config", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (
    !body?.channel_description ||
    typeof body.channel_description !== "string"
  ) {
    return c.json({ error: "channel_description (string) is required" }, 400);
  }
  const value = setChannelDescription(body.channel_description);
  return c.json({ channel_description: value });
});
