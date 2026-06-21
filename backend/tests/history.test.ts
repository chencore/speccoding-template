import { describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { listAdoptedTopicsWithCopies } from "../src/persistence/history.js";

function insertTopic(status: string): number {
  const info = db
    .prepare(
      "INSERT INTO topics (seed, title, rationale, status) VALUES (?, ?, ?, ?)",
    )
    .run(
      "test",
      `T-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      "R",
      status,
    );
  return Number(info.lastInsertRowid);
}

function insertCopy(topicId: number, type: string): number {
  const info = db
    .prepare(
      "INSERT INTO copies (topic_id, type, adopted_version_id) VALUES (?, ?, NULL)",
    )
    .run(topicId, type);
  return Number(info.lastInsertRowid);
}

function insertVersion(
  copyId: number,
  versionNo: number,
  content: string,
  isAdopted: number,
): number {
  const info = db
    .prepare(
      "INSERT INTO copy_versions (copy_id, version_no, content, is_adopted) VALUES (?, ?, ?, ?)",
    )
    .run(copyId, versionNo, content, isAdopted);
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

describe("listAdoptedTopicsWithCopies", () => {
  it("只返回 adopted 状态的 topic", () => {
    const adoptedId = insertTopic("adopted");
    const pendingId = insertTopic("pending");
    try {
      const items = listAdoptedTopicsWithCopies();
      const ids = items.map((i) => i.topic.id);
      expect(ids).toContain(adoptedId);
      expect(ids).not.toContain(pendingId);
    } finally {
      cleanup(adoptedId);
      cleanup(pendingId);
    }
  });

  it("返回 topic 及其 adopted versions", () => {
    const topicId = insertTopic("adopted");
    const titleCopyId = insertCopy(topicId, "title");
    const descCopyId = insertCopy(topicId, "description");
    insertVersion(titleCopyId, 1, "t1", 0);
    insertVersion(titleCopyId, 2, "t2", 1);
    insertVersion(descCopyId, 1, "d1", 0);
    try {
      const items = listAdoptedTopicsWithCopies();
      const item = items.find((i) => i.topic.id === topicId);
      expect(item).toBeDefined();
      const titleCopy = item?.copies.find((c) => c.type === "title");
      expect(titleCopy?.versions).toHaveLength(1);
      expect(titleCopy?.versions[0].content).toBe("t2");
      const descCopy = item?.copies.find((c) => c.type === "description");
      expect(descCopy?.versions).toHaveLength(0);
    } finally {
      cleanup(topicId);
    }
  });

  it("按 topic.id 倒序排列", () => {
    const id1 = insertTopic("adopted");
    const id2 = insertTopic("adopted");
    try {
      const items = listAdoptedTopicsWithCopies();
      const ids = items.map((i) => i.topic.id);
      const idx1 = ids.indexOf(id1);
      const idx2 = ids.indexOf(id2);
      expect(idx2).toBeLessThan(idx1);
    } finally {
      cleanup(id1);
      cleanup(id2);
    }
  });
});
