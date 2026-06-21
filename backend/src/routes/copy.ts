import { Hono } from "hono";
import { CopyGenerateError, generateCopiesForTopic } from "../copy/generate.js";
import {
  CopyNotFoundError,
  VersionNotBelongToCopyError,
  VersionNotFoundError,
  adoptVersion,
  listCopiesByTopic,
  topicExists,
} from "../copy/repo.js";
import { CopyRewriteError, rewriteVersion } from "../copy/rewrite.js";

export const copyRouter = new Hono();

copyRouter.post("/topics/:id/copies/generate", async (c) => {
  const topicId = Number.parseInt(c.req.param("id"), 10);
  if (Number.isNaN(topicId)) {
    return c.json({ error: "id 非法" }, 400);
  }
  if (!topicExists(topicId)) {
    return c.json({ error: `topic ${topicId} 不存在` }, 404);
  }

  try {
    const copies = await generateCopiesForTopic(topicId);
    return c.json({ copies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/api key|unauthorized|401/i.test(msg)) {
      return c.json(
        { error: "LLM 调用失败，请检查 API key 配置", detail: msg },
        503,
      );
    }
    if (err instanceof CopyGenerateError) {
      return c.json({ error: "AI 输出解析失败", detail: msg }, 502);
    }
    return c.json({ error: "生成失败", detail: msg }, 500);
  }
});

copyRouter.post("/copies/:copyId/rewrite", async (c) => {
  const copyId = Number.parseInt(c.req.param("copyId"), 10);
  if (Number.isNaN(copyId)) {
    return c.json({ error: "copyId 非法" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const sourceVersionId = Number.parseInt(body?.sourceVersionId, 10);
  if (Number.isNaN(sourceVersionId)) {
    return c.json({ error: "sourceVersionId (number) is required" }, 400);
  }
  if (!body?.instruction || typeof body.instruction !== "string") {
    return c.json({ error: "instruction (string) is required" }, 400);
  }

  try {
    const version = await rewriteVersion({
      copyId,
      sourceVersionId,
      instruction: body.instruction,
    });
    return c.json({ version });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof CopyNotFoundError) {
      return c.json({ error: msg }, 404);
    }
    if (err instanceof VersionNotFoundError) {
      return c.json({ error: msg }, 404);
    }
    if (err instanceof VersionNotBelongToCopyError) {
      return c.json({ error: msg }, 400);
    }
    if (/api key|unauthorized|401/i.test(msg)) {
      return c.json(
        { error: "LLM 调用失败，请检查 API key 配置", detail: msg },
        503,
      );
    }
    if (err instanceof CopyRewriteError) {
      return c.json({ error: "AI 输出解析失败", detail: msg }, 502);
    }
    return c.json({ error: "改写失败", detail: msg }, 500);
  }
});

copyRouter.get("/topics/:id/copies", async (c) => {
  const topicId = Number.parseInt(c.req.param("id"), 10);
  if (Number.isNaN(topicId)) {
    return c.json({ error: "id 非法" }, 400);
  }
  if (!topicExists(topicId)) {
    return c.json({ error: `topic ${topicId} 不存在` }, 404);
  }
  const copies = listCopiesByTopic(topicId);
  return c.json({ copies });
});

copyRouter.patch("/copies/:copyId/adopt", async (c) => {
  const copyId = Number.parseInt(c.req.param("copyId"), 10);
  if (Number.isNaN(copyId)) {
    return c.json({ error: "copyId 非法" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const versionId = Number.parseInt(body?.versionId, 10);
  if (Number.isNaN(versionId)) {
    return c.json({ error: "versionId (number) is required" }, 400);
  }

  try {
    const copy = adoptVersion(copyId, versionId);
    return c.json({ copy });
  } catch (err) {
    if (err instanceof CopyNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof VersionNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof VersionNotBelongToCopyError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});
