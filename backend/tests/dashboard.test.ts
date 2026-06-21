import { describe, expect, it } from "vitest";
import { computeTopicMetrics } from "../src/dashboard/metrics.js";
import { getDashboardStats } from "../src/dashboard/repo.js";
import { db } from "../src/db/index.js";

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

describe("getDashboardStats", () => {
  it("返回正确的计数", () => {
    const pendingId = insertTopic("pending");
    const adoptedId = insertTopic("adopted");
    try {
      const stats = getDashboardStats();
      expect(stats.counts.pendingTopics).toBeGreaterThanOrEqual(1);
      expect(stats.counts.adoptedTopics).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup(pendingId);
      cleanup(adoptedId);
    }
  });

  it("completed copies 计数正确", () => {
    const topicId = insertTopic("adopted");
    const copyId = insertCopy(topicId, "title");
    const versionId = insertVersion(copyId, 1, "v1", 1);
    db.prepare("UPDATE copies SET adopted_version_id = ? WHERE id = ?").run(
      versionId,
      copyId,
    );
    try {
      const stats = getDashboardStats();
      expect(stats.counts.completedCopies).toBeGreaterThanOrEqual(1);
      expect(stats.counts.inProgressCopies).toBeGreaterThanOrEqual(0);
    } finally {
      cleanup(topicId);
    }
  });

  it("pending 选题附带 mock 指标", () => {
    const topicId = insertTopic("pending", "测试标题");
    try {
      const stats = getDashboardStats();
      const item = stats.pendingTopicsList.find((t) => t.id === topicId);
      expect(item).toBeDefined();
      expect(item?.trendScore).toBeGreaterThanOrEqual(60);
      expect(item?.trendScore).toBeLessThanOrEqual(99);
      expect(item?.audienceMatch).toBeGreaterThanOrEqual(50);
      expect(item?.freshness).toBeGreaterThanOrEqual(70);
      expect(item?.signalSource).toBeTruthy();
    } finally {
      cleanup(topicId);
    }
  });

  it("mock 指标是确定性的", () => {
    const topic = { id: 42, title: "确定性测试" };
    const m1 = computeTopicMetrics(topic);
    const m2 = computeTopicMetrics(topic);
    expect(m1).toEqual(m2);
  });

  it("categoryBreakdown 包含未分类", () => {
    const topicId = insertTopic("adopted");
    try {
      const stats = getDashboardStats();
      expect(Object.keys(stats.categoryBreakdown).length).toBeGreaterThan(0);
    } finally {
      cleanup(topicId);
    }
  });

  it("recentCopies 返回已采用版本", () => {
    const topicId = insertTopic("adopted");
    const copyId = insertCopy(topicId, "title");
    const versionId = insertVersion(copyId, 1, "adopted title", 1);
    db.prepare("UPDATE copies SET adopted_version_id = ? WHERE id = ?").run(
      versionId,
      copyId,
    );
    try {
      const stats = getDashboardStats();
      expect(stats.recentCopies.length).toBeGreaterThan(0);
      expect(stats.recentCopies[0]?.content).toBe("adopted title");
    } finally {
      cleanup(topicId);
    }
  });
});
