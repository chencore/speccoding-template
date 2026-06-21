import { db } from "../db/index.js";
import { computeTopicMetrics, freshnessLabel } from "./metrics.js";

export interface DashboardStats {
  counts: {
    pendingTopics: number;
    adoptedTopics: number;
    inProgressCopies: number;
    completedCopies: number;
    importedVideos: number;
  };
  weekly: {
    adoptedTopics: number;
    completedCopies: number;
  };
  categoryBreakdown: Record<string, number>;
  recentActivity: Array<{
    type: "topic" | "copy";
    title: string;
    timestamp: string;
  }>;
  pendingTopicsList: Array<{
    id: number;
    title: string;
    seed: string;
    rationale: string | null;
    created_at: string;
    trendScore: number;
    audienceMatch: number;
    freshness: number;
    freshnessLabel: string;
    signalSource: string;
  }>;
  inProgressList: Array<{
    topicId: number;
    topicTitle: string;
    missing: ("title" | "description" | "tags")[];
  }>;
  recentCopies: Array<{
    topicTitle: string;
    type: "title" | "description" | "tags";
    content: string;
    adoptedAt: string;
  }>;
}

function countTopics(status: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as total FROM topics WHERE status = ?")
    .get(status) as { total: number };
  return row.total;
}

function countImportedVideos(): number {
  const row = db
    .prepare("SELECT COUNT(*) as total FROM imported_videos")
    .get() as { total: number };
  return row.total;
}

function countCopies(adopted: boolean): number {
  const adoptedClause = adopted
    ? "adopted_version_id IS NOT NULL"
    : "adopted_version_id IS NULL";
  const row = db
    .prepare(
      `SELECT COUNT(*) as total FROM copies WHERE ${adoptedClause} AND EXISTS (SELECT 1 FROM copy_versions WHERE copy_id = copies.id)`,
    )
    .get() as { total: number };
  return row.total;
}

function weeklyAdoptedTopics(): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) as total FROM topics WHERE status = 'adopted' AND created_at >= datetime('now', '-7 days')",
    )
    .get() as { total: number };
  return row.total;
}

function weeklyCompletedCopies(): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as total FROM copies c
       JOIN copy_versions cv ON cv.id = c.adopted_version_id
       WHERE c.adopted_version_id IS NOT NULL AND cv.created_at >= datetime('now', '-7 days')`,
    )
    .get() as { total: number };
  return row.total;
}

function categoryBreakdown(): Record<string, number> {
  const rows = db
    .prepare(
      "SELECT COALESCE(category, '未分类') as category, COUNT(*) as total FROM topics WHERE status = 'adopted' GROUP BY category",
    )
    .all() as { category: string; total: number }[];
  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.category] = r.total;
  }
  return result;
}

function recentActivity(): DashboardStats["recentActivity"] {
  const topics = db
    .prepare(
      "SELECT title, created_at FROM topics ORDER BY created_at DESC LIMIT 10",
    )
    .all() as { title: string; created_at: string }[];
  const copies = db
    .prepare(
      `SELECT t.title, cv.created_at
       FROM copy_versions cv
       JOIN copies c ON c.id = cv.copy_id
       JOIN topics t ON t.id = c.topic_id
       ORDER BY cv.created_at DESC
       LIMIT 10`,
    )
    .all() as { title: string; created_at: string }[];
  const merged = [
    ...topics.map((t) => ({
      type: "topic" as const,
      title: t.title,
      timestamp: t.created_at,
    })),
    ...copies.map((c) => ({
      type: "copy" as const,
      title: c.title,
      timestamp: c.created_at,
    })),
  ];
  merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return merged.slice(0, 10);
}

function pendingTopicsList(): DashboardStats["pendingTopicsList"] {
  const topics = db
    .prepare(
      "SELECT id, seed, title, rationale, created_at FROM topics WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10",
    )
    .all() as {
    id: number;
    seed: string;
    title: string;
    rationale: string | null;
    created_at: string;
  }[];
  return topics.map((t) => {
    const metrics = computeTopicMetrics(t);
    return {
      ...t,
      ...metrics,
      freshnessLabel: freshnessLabel(metrics.freshness),
    };
  });
}

function inProgressList(): DashboardStats["inProgressList"] {
  const topics = db
    .prepare(
      "SELECT id, title FROM topics WHERE status = 'adopted' ORDER BY id DESC",
    )
    .all() as { id: number; title: string }[];

  const result: DashboardStats["inProgressList"] = [];
  for (const topic of topics) {
    const copies = db
      .prepare("SELECT type, adopted_version_id FROM copies WHERE topic_id = ?")
      .all(topic.id) as {
      type: "title" | "description" | "tags";
      adopted_version_id: number | null;
    }[];
    const allTypes = ["title", "description", "tags"] as const;
    const existing = new Set(copies.map((c) => c.type));
    const missing = allTypes.filter((t) => !existing.has(t));
    const hasIncomplete = copies.some((c) => c.adopted_version_id === null);
    if (missing.length > 0 || hasIncomplete) {
      result.push({ topicId: topic.id, topicTitle: topic.title, missing });
    }
  }
  return result.slice(0, 5);
}

function recentCopies(): DashboardStats["recentCopies"] {
  return db
    .prepare(
      `SELECT t.title as topicTitle, c.type, cv.content, cv.created_at as adoptedAt
       FROM copy_versions cv
       JOIN copies c ON c.id = cv.copy_id
       JOIN topics t ON t.id = c.topic_id
       WHERE cv.is_adopted = 1
       ORDER BY cv.created_at DESC
       LIMIT 5`,
    )
    .all() as DashboardStats["recentCopies"];
}

export function getDashboardStats(): DashboardStats {
  return {
    counts: {
      pendingTopics: countTopics("pending"),
      adoptedTopics: countTopics("adopted"),
      inProgressCopies: countCopies(false),
      completedCopies: countCopies(true),
      importedVideos: countImportedVideos(),
    },
    weekly: {
      adoptedTopics: weeklyAdoptedTopics(),
      completedCopies: weeklyCompletedCopies(),
    },
    categoryBreakdown: categoryBreakdown(),
    recentActivity: recentActivity(),
    pendingTopicsList: pendingTopicsList(),
    inProgressList: inProgressList(),
    recentCopies: recentCopies(),
  };
}
