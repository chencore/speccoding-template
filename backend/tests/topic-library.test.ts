import { describe, expect, it, vi } from "vitest";

vi.mock("../src/agent/index.js", () => ({
  ask: vi.fn(),
}));

import { ask } from "../src/agent/index.js";
import { db } from "../src/db/index.js";
import { listAdoptedTopicsWithCopies } from "../src/persistence/history.js";
import { classifyTopic } from "../src/topic/classify.js";
import {
  TopicNotFoundError,
  getTopicById,
  updateTopicCategory,
  updateTopicStatus,
} from "../src/topic/repo.js";

function insertTopic(status: string, title?: string): number {
  const info = db
    .prepare(
      "INSERT INTO topics (seed, title, rationale, status) VALUES (?, ?, ?, ?)",
    )
    .run(
      "test",
      title ?? `T-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      "R",
      status,
    );
  return Number(info.lastInsertRowid);
}

function cleanup(topicId: number) {
  const copyIds = (
    db.prepare("SELECT id FROM copies WHERE topic_id = ?").all(topicId) as {
      id: number;
    }[]
  ).map((r) => r.id);
  if (copyIds.length > 0) {
    const placeholders = copyIds.map(() => "?").join(",");
    db.prepare(
      `DELETE FROM copy_versions WHERE copy_id IN (${placeholders})`,
    ).run(...copyIds);
  }
  db.prepare("DELETE FROM copies WHERE topic_id = ?").run(topicId);
  db.prepare("DELETE FROM topics WHERE id = ?").run(topicId);
}

describe("classifyTopic", () => {
  it("从 AI 输出中解析出合法分类", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: "评测/体验",
      messages: [],
    });
    const result = await classifyTopic("Cursor 上手评测", "评测编辑器");
    expect(result).toBe("评测/体验");
  });

  it("非法分类回退到 其他", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: "不存在的分类",
      messages: [],
    });
    const result = await classifyTopic("标题", null);
    expect(result).toBe("其他");
  });
});

describe("updateTopicStatus", () => {
  it("adopted 时自动分类", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: "教程/干货",
      messages: [],
    });
    const topicId = insertTopic("pending", "如何学习 TypeScript");
    try {
      const topic = await updateTopicStatus(topicId, "adopted");
      expect(topic.status).toBe("adopted");
      expect(topic.category).toBe("教程/干货");
      const row = getTopicById(topicId);
      expect(row?.category).toBe("教程/干货");
    } finally {
      cleanup(topicId);
    }
  });

  it("非 adopted 状态不分类", async () => {
    const topicId = insertTopic("pending");
    try {
      const topic = await updateTopicStatus(topicId, "discarded");
      expect(topic.status).toBe("discarded");
      expect(topic.category).toBeNull();
    } finally {
      cleanup(topicId);
    }
  });

  it("topic 不存在时抛错", async () => {
    await expect(updateTopicStatus(999999, "adopted")).rejects.toThrow(
      TopicNotFoundError,
    );
  });
});

describe("updateTopicCategory", () => {
  it("手动更新分类", () => {
    const topicId = insertTopic("adopted");
    try {
      const topic = updateTopicCategory(topicId, "观点/评论");
      expect(topic.category).toBe("观点/评论");
    } finally {
      cleanup(topicId);
    }
  });

  it("topic 不存在时抛错", () => {
    expect(() => updateTopicCategory(999999, "其他")).toThrow(
      TopicNotFoundError,
    );
  });
});

describe("history includes category", () => {
  it("返回的 topic 包含 category", () => {
    const topicId = insertTopic("adopted");
    db.prepare("UPDATE topics SET category = ? WHERE id = ?").run(
      "Vlog/日常",
      topicId,
    );
    try {
      const items = listAdoptedTopicsWithCopies();
      const item = items.find((i) => i.topic.id === topicId);
      expect(item?.topic.category).toBe("Vlog/日常");
    } finally {
      cleanup(topicId);
    }
  });
});
