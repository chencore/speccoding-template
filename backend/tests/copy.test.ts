import { describe, expect, it, vi } from "vitest";

vi.mock("../src/agent/index.js", () => ({
  ask: vi.fn(),
}));

import { ask } from "../src/agent/index.js";
import {
  CopyGenerateError,
  generateCopiesForTopic,
} from "../src/copy/generate.js";
import { buildGeneratePrompt, buildRewritePrompt } from "../src/copy/prompt.js";
import {
  CopyNotFoundError,
  TopicNotFoundError,
  VersionNotBelongToCopyError,
  VersionNotFoundError,
  adoptVersion,
  listCopiesByTopic,
} from "../src/copy/repo.js";
import type { Copy, CopyType, CopyVersion } from "../src/copy/repo.js";
import { CopyRewriteError, rewriteVersion } from "../src/copy/rewrite.js";
import { db } from "../src/db/index.js";

function findCopy(copies: Copy[], type: CopyType): Copy {
  const c = copies.find((x) => x.type === type);
  if (!c) throw new Error(`expected copy of type ${type}`);
  return c;
}

function findVersion(versions: CopyVersion[], id: number): CopyVersion {
  const v = versions.find((x) => x.id === id);
  if (!v) throw new Error(`expected version ${id}`);
  return v;
}

function createTestTopic(): number {
  const info = db
    .prepare(
      "INSERT INTO topics (seed, title, rationale, status) VALUES (?, ?, ?, 'pending')",
    )
    .run(
      "test-seed",
      `测试选题-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      "测试理由",
    );
  return Number(info.lastInsertRowid);
}

function deleteTopicAndCopies(topicId: number) {
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

describe("buildGeneratePrompt", () => {
  it("含选题与频道描述", () => {
    const p = buildGeneratePrompt({
      topicTitle: "AI 编程入门",
      topicRationale: "热度高、易上手",
      channelDescription: "AI 教程频道",
    });
    expect(p).toContain("AI 编程入门");
    expect(p).toContain("热度高、易上手");
    expect(p).toContain("AI 教程频道");
    expect(p).toContain("titles");
    expect(p).toContain("descriptions");
    expect(p).toContain("tags");
    expect(p).toContain("JSON");
  });

  it("缺频道描述时填未提供", () => {
    const p = buildGeneratePrompt({
      topicTitle: "x",
      topicRationale: null,
      channelDescription: null,
    });
    expect(p).toContain("未提供");
  });
});

describe("buildRewritePrompt", () => {
  it("含原文、指令与类型约束", () => {
    const p = buildRewritePrompt({
      type: "title",
      sourceContent: "原标题",
      topicTitle: "T",
      topicRationale: "R",
      channelDescription: "C",
      instruction: "更口语化",
    });
    expect(p).toContain("原标题");
    expect(p).toContain("更口语化");
    expect(p).toContain("标题");
    expect(p).toContain("纯文本");
  });
});

describe("generateCopiesForTopic", () => {
  it("合法 JSON 时写入 3 条 copies + 8 条 versions", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1", "t2", "t3", "t4", "t5"],
        descriptions: ["d1", "d2"],
        tags: "a,b,c",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      expect(copies).toHaveLength(3);
      const titleCopy = copies.find((c) => c.type === "title");
      const descCopy = copies.find((c) => c.type === "description");
      const tagsCopy = copies.find((c) => c.type === "tags");
      expect(titleCopy?.versions).toHaveLength(5);
      expect(descCopy?.versions).toHaveLength(2);
      expect(tagsCopy?.versions).toHaveLength(1);
      for (const c of copies) {
        for (const v of c.versions) {
          expect(v.is_adopted).toBe(0);
        }
      }

      const dbCopies = listCopiesByTopic(topicId);
      expect(dbCopies).toHaveLength(3);
      expect(
        dbCopies.flatMap((c) => c.versions).filter((v) => v.is_adopted === 1),
      ).toHaveLength(0);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("markdown 代码块包裹的 JSON 能 strip 后解析", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: `\`\`\`json\n${JSON.stringify({
        titles: ["t1"],
        descriptions: ["d1"],
        tags: "a,b",
      })}\n\`\`\``,
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      expect(copies).toHaveLength(3);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("字段缺失时不整体失败，按实际数量创建 versions", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1", "t2", "t3"],
        descriptions: ["d1"],
        tags: "a,b",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      expect(copies).toHaveLength(3);
      expect(copies.find((c) => c.type === "title")?.versions).toHaveLength(3);
      expect(
        copies.find((c) => c.type === "description")?.versions,
      ).toHaveLength(1);
      expect(copies.find((c) => c.type === "tags")?.versions).toHaveLength(1);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("非 JSON 抛 CopyGenerateError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: "这不是 JSON",
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      await expect(generateCopiesForTopic(topicId)).rejects.toThrow(
        CopyGenerateError,
      );
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("三类全空时抛 CopyGenerateError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: [],
        descriptions: [],
        tags: "",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      await expect(generateCopiesForTopic(topicId)).rejects.toThrow(
        CopyGenerateError,
      );
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("topic 不存在时抛 TopicNotFoundError", async () => {
    await expect(generateCopiesForTopic(999999)).rejects.toThrow(
      TopicNotFoundError,
    );
  });
});

describe("rewriteVersion", () => {
  it("基于已有版本改写，version_no 自增且 is_adopted=0", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["原标题"],
        descriptions: ["原描述"],
        tags: "a,b",
      }),
      messages: [],
    });
    vi.mocked(ask).mockResolvedValueOnce({
      text: "改写后的标题",
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const sourceVersion = titleCopy.versions[0];

      const newVersion = await rewriteVersion({
        copyId: titleCopy.id,
        sourceVersionId: sourceVersion.id,
        instruction: "更口语化",
      });
      expect(newVersion.version_no).toBe(2);
      expect(newVersion.is_adopted).toBe(0);
      expect(newVersion.content).toBe("改写后的标题");
      expect(newVersion.copy_id).toBe(titleCopy.id);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("改写输出含代码块与常见前缀时被清理", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["原标题"],
        descriptions: ["原描述"],
        tags: "a,b",
      }),
      messages: [],
    });
    vi.mocked(ask).mockResolvedValueOnce({
      text: "```\n以下是改写结果：\n清理后内容\n```",
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const newVersion = await rewriteVersion({
        copyId: titleCopy.id,
        sourceVersionId: titleCopy.versions[0].id,
        instruction: "更口语化",
      });
      expect(newVersion.content).toContain("清理后内容");
      expect(newVersion.content).not.toContain("以下是改写结果");
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("改写输出为空时抛 CopyRewriteError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["原标题"],
        descriptions: ["原描述"],
        tags: "a,b",
      }),
      messages: [],
    });
    vi.mocked(ask).mockResolvedValueOnce({
      text: "   ",
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      await expect(
        rewriteVersion({
          copyId: titleCopy.id,
          sourceVersionId: titleCopy.versions[0].id,
          instruction: "x",
        }),
      ).rejects.toThrow(CopyRewriteError);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("copy 不存在时抛 CopyNotFoundError", async () => {
    await expect(
      rewriteVersion({
        copyId: 999999,
        sourceVersionId: 1,
        instruction: "x",
      }),
    ).rejects.toThrow(CopyNotFoundError);
  });

  it("source version 不属于该 copy 时抛 VersionNotBelongToCopyError", async () => {
    vi.mocked(ask).mockResolvedValue({
      text: JSON.stringify({
        titles: ["t"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const descCopy = findCopy(copies, "description");
      await expect(
        rewriteVersion({
          copyId: titleCopy.id,
          sourceVersionId: descCopy.versions[0].id,
          instruction: "x",
        }),
      ).rejects.toThrow(VersionNotBelongToCopyError);
    } finally {
      deleteTopicAndCopies(topicId);
      vi.mocked(ask).mockReset();
    }
  });

  it("source version 不存在时抛 VersionNotFoundError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      await expect(
        rewriteVersion({
          copyId: titleCopy.id,
          sourceVersionId: 999999,
          instruction: "x",
        }),
      ).rejects.toThrow(VersionNotFoundError);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });
});

describe("adoptVersion", () => {
  it("首次采用：标记 is_adopted=1 并更新 copies.adopted_version_id", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1", "t2"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const v1 = titleCopy.versions[0];

      const updated = adoptVersion(titleCopy.id, v1.id);
      expect(updated.adopted_version_id).toBe(v1.id);
      const adopted = updated.versions.filter((v) => v.is_adopted === 1);
      expect(adopted).toHaveLength(1);
      expect(adopted[0].id).toBe(v1.id);

      const dbCopy = listCopiesByTopic(topicId).find(
        (c) => c.id === titleCopy.id,
      );
      expect(dbCopy?.adopted_version_id).toBe(v1.id);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("切换采用：从 v1 切到 v2，v1 取消 v2 标记", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1", "t2"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const [v1, v2] = titleCopy.versions;

      adoptVersion(titleCopy.id, v1.id);
      const updated = adoptVersion(titleCopy.id, v2.id);
      expect(updated.adopted_version_id).toBe(v2.id);
      const v1Row = updated.versions.find((v) => v.id === v1.id);
      const v2Row = updated.versions.find((v) => v.id === v2.id);
      expect(v1Row?.is_adopted).toBe(0);
      expect(v2Row?.is_adopted).toBe(1);
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("version 不属于该 copy 时抛 VersionNotBelongToCopyError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      const descCopy = findCopy(copies, "description");
      expect(() => adoptVersion(titleCopy.id, descCopy.versions[0].id)).toThrow(
        VersionNotBelongToCopyError,
      );
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });

  it("copy 不存在时抛 CopyNotFoundError", () => {
    expect(() => adoptVersion(999999, 1)).toThrow(CopyNotFoundError);
  });

  it("version 不存在时抛 VersionNotFoundError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify({
        titles: ["t1"],
        descriptions: ["d"],
        tags: "a",
      }),
      messages: [],
    });
    const topicId = createTestTopic();
    try {
      const copies = await generateCopiesForTopic(topicId);
      const titleCopy = findCopy(copies, "title");
      expect(() => adoptVersion(titleCopy.id, 999999)).toThrow(
        VersionNotFoundError,
      );
    } finally {
      deleteTopicAndCopies(topicId);
    }
  });
});
