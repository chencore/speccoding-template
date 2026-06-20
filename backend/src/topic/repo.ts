import { db } from "../db/index.js";

export type TopicStatus = "pending" | "adopted" | "discarded";

const VALID_STATUSES: TopicStatus[] = ["pending", "adopted", "discarded"];

export interface Topic {
  id: number;
  seed: string;
  title: string;
  rationale: string | null;
  status: TopicStatus;
  created_at: string;
}

export interface ImportedVideo {
  id: number;
  title: string;
  views: number | null;
  imported_at: string;
}

export interface ListTopicsParams {
  status?: TopicStatus;
  page: number;
  pageSize: number;
}

export interface ListTopicsResult {
  items: Topic[];
  total: number;
  page: number;
  pageSize: number;
}

function assertStatus(status: string): asserts status is TopicStatus {
  if (!VALID_STATUSES.includes(status as TopicStatus)) {
    throw new StatusValidationError(`非法 status: ${status}`);
  }
}

export class StatusValidationError extends Error {}

export class TopicNotFoundError extends Error {}

export function listTopics(params: ListTopicsParams): ListTopicsResult {
  const { status, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  const where = status ? "WHERE status = ?" : "";
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM topics ${where}`);
  const countRow = (status ? countStmt.get(status) : countStmt.get()) as {
    total: number;
  };

  const items = status
    ? (db
        .prepare(
          "SELECT * FROM topics WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        )
        .all(status, pageSize, offset) as Topic[])
    : (db
        .prepare("SELECT * FROM topics ORDER BY id DESC LIMIT ? OFFSET ?")
        .all(pageSize, offset) as Topic[]);

  return { items, total: countRow.total, page, pageSize };
}

export function createTopic(input: {
  seed: string;
  title: string;
  rationale: string;
}): Topic {
  const stmt = db.prepare(
    "INSERT INTO topics (seed, title, rationale, status) VALUES (?, ?, ?, 'pending')",
  );
  const info = stmt.run(input.seed, input.title, input.rationale);
  return db
    .prepare("SELECT * FROM topics WHERE id = ?")
    .get(info.lastInsertRowid) as Topic;
}

export function updateTopicStatus(id: number, status: string): Topic {
  assertStatus(status);
  const info = db
    .prepare("UPDATE topics SET status = ? WHERE id = ?")
    .run(status, id);
  if (info.changes === 0) {
    throw new TopicNotFoundError(`topic ${id} 不存在`);
  }
  return db.prepare("SELECT * FROM topics WHERE id = ?").get(id) as Topic;
}

export function listImportedVideos(): ImportedVideo[] {
  return db
    .prepare(
      "SELECT * FROM imported_videos ORDER BY views DESC NULLS LAST, id DESC",
    )
    .all() as ImportedVideo[];
}

export function listImportedVideosForPrompt(limit: number): ImportedVideo[] {
  return db
    .prepare(
      "SELECT * FROM imported_videos ORDER BY views DESC NULLS LAST, id DESC LIMIT ?",
    )
    .all(limit) as ImportedVideo[];
}

export function insertImportedVideos(
  rows: { title: string; views: number | null }[],
): number {
  if (rows.length === 0) return 0;
  const stmt = db.prepare(
    "INSERT INTO imported_videos (title, views) VALUES (?, ?)",
  );
  const tx = db.transaction((items: typeof rows) => {
    for (const r of items) {
      stmt.run(r.title, r.views);
    }
  });
  tx(rows);
  return rows.length;
}

export function clearImportedVideos(): number {
  const info = db.prepare("DELETE FROM imported_videos").run();
  return info.changes;
}

const CHANNEL_DESC_KEY = "channel_description";

export function getChannelDescription(): string | null {
  const row = db
    .prepare("SELECT value FROM channel_config WHERE key = ?")
    .get(CHANNEL_DESC_KEY) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setChannelDescription(value: string): string {
  db.prepare(
    `INSERT INTO channel_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(CHANNEL_DESC_KEY, value);
  return value;
}
