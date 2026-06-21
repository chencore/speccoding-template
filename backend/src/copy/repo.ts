import { db } from "../db/index.js";

export type CopyType = "title" | "description" | "tags";

const VALID_TYPES: CopyType[] = ["title", "description", "tags"];

function assertType(t: string): asserts t is CopyType {
  if (!VALID_TYPES.includes(t as CopyType)) {
    throw new Error(`非法 copy type: ${t}`);
  }
}

export interface Copy {
  id: number;
  topic_id: number;
  type: CopyType;
  adopted_version_id: number | null;
  created_at: string;
}

export interface CopyVersion {
  id: number;
  copy_id: number;
  version_no: number;
  content: string;
  is_adopted: number;
  created_at: string;
}

export interface CopyWithVersions extends Copy {
  versions: CopyVersion[];
}

export class TopicNotFoundError extends Error {}
export class CopyNotFoundError extends Error {}
export class VersionNotFoundError extends Error {}
export class VersionNotBelongToCopyError extends Error {}

export function topicExists(id: number): boolean {
  const row = db.prepare("SELECT 1 FROM topics WHERE id = ?").get(id) as
    | { 1: number }
    | undefined;
  return row !== undefined;
}

export function getTopicTitleAndRationale(id: number): {
  title: string;
  rationale: string | null;
} {
  const row = db
    .prepare("SELECT title, rationale FROM topics WHERE id = ?")
    .get(id) as { title: string; rationale: string | null } | undefined;
  if (!row) {
    throw new TopicNotFoundError(`topic ${id} 不存在`);
  }
  return row;
}

export function createCopiesWithVersions(
  topicId: number,
  items: { type: CopyType; contents: string[] }[],
): CopyWithVersions[] {
  const insertCopy = db.prepare(
    "INSERT INTO copies (topic_id, type, adopted_version_id) VALUES (?, ?, NULL)",
  );
  const insertVersion = db.prepare(
    "INSERT INTO copy_versions (copy_id, version_no, content, is_adopted) VALUES (?, ?, ?, 0)",
  );
  const getCopy = db.prepare("SELECT * FROM copies WHERE id = ?");
  const getVersions = db.prepare(
    "SELECT * FROM copy_versions WHERE copy_id = ? ORDER BY version_no ASC",
  );

  const tx = db.transaction(() => {
    const result: CopyWithVersions[] = [];
    for (const item of items) {
      assertType(item.type);
      const info = insertCopy.run(topicId, item.type);
      const copyId = Number(info.lastInsertRowid);
      item.contents.forEach((content, i) => {
        insertVersion.run(copyId, i + 1, content);
      });
      const copy = getCopy.get(copyId) as Copy;
      const versions = getVersions.all(copyId) as CopyVersion[];
      result.push({ ...copy, versions });
    }
    return result;
  });

  return tx();
}

export function listCopiesByTopic(topicId: number): CopyWithVersions[] {
  const copies = db
    .prepare("SELECT * FROM copies WHERE topic_id = ? ORDER BY id ASC")
    .all(topicId) as Copy[];
  return copies.map((c) => ({
    ...c,
    versions: db
      .prepare(
        "SELECT * FROM copy_versions WHERE copy_id = ? ORDER BY version_no ASC",
      )
      .all(c.id) as CopyVersion[],
  }));
}

export function getCopyWithVersions(copyId: number): CopyWithVersions {
  const copy = db.prepare("SELECT * FROM copies WHERE id = ?").get(copyId) as
    | Copy
    | undefined;
  if (!copy) {
    throw new CopyNotFoundError(`copy ${copyId} 不存在`);
  }
  const versions = db
    .prepare(
      "SELECT * FROM copy_versions WHERE copy_id = ? ORDER BY version_no ASC",
    )
    .all(copyId) as CopyVersion[];
  return { ...copy, versions };
}

export function getCopyWithTopic(copyId: number): {
  copy: Copy;
  topicId: number;
  type: CopyType;
} {
  const copy = db.prepare("SELECT * FROM copies WHERE id = ?").get(copyId) as
    | Copy
    | undefined;
  if (!copy) {
    throw new CopyNotFoundError(`copy ${copyId} 不存在`);
  }
  return { copy, topicId: copy.topic_id, type: copy.type };
}

export function getVersion(
  versionId: number,
): CopyVersion & { copy_id: number } {
  const v = db
    .prepare("SELECT * FROM copy_versions WHERE id = ?")
    .get(versionId) as CopyVersion | undefined;
  if (!v) {
    throw new VersionNotFoundError(`version ${versionId} 不存在`);
  }
  return v;
}

export function nextVersionNo(copyId: number): number {
  const row = db
    .prepare(
      "SELECT COALESCE(MAX(version_no), 0) AS max_no FROM copy_versions WHERE copy_id = ?",
    )
    .get(copyId) as { max_no: number };
  return row.max_no + 1;
}

export function appendVersion(copyId: number, content: string): CopyVersion {
  const insertVersion = db.prepare(
    "INSERT INTO copy_versions (copy_id, version_no, content, is_adopted) VALUES (?, ?, ?, 0)",
  );
  const getVersion = db.prepare("SELECT * FROM copy_versions WHERE id = ?");
  const tx = db.transaction(() => {
    const versionNo = nextVersionNo(copyId);
    const info = insertVersion.run(copyId, versionNo, content);
    return getVersion.get(info.lastInsertRowid) as CopyVersion;
  });
  return tx();
}

export function adoptVersion(
  copyId: number,
  versionId: number,
): CopyWithVersions {
  const copy = db.prepare("SELECT * FROM copies WHERE id = ?").get(copyId) as
    | Copy
    | undefined;
  if (!copy) {
    throw new CopyNotFoundError(`copy ${copyId} 不存在`);
  }
  const version = db
    .prepare("SELECT * FROM copy_versions WHERE id = ?")
    .get(versionId) as CopyVersion | undefined;
  if (!version) {
    throw new VersionNotFoundError(`version ${versionId} 不存在`);
  }
  if (version.copy_id !== copyId) {
    throw new VersionNotBelongToCopyError(
      `version ${versionId} 不属于 copy ${copyId}`,
    );
  }

  const clearStmt = db.prepare(
    "UPDATE copy_versions SET is_adopted = 0 WHERE copy_id = ?",
  );
  const setStmt = db.prepare(
    "UPDATE copy_versions SET is_adopted = 1 WHERE id = ?",
  );
  const updateCopyStmt = db.prepare(
    "UPDATE copies SET adopted_version_id = ? WHERE id = ?",
  );
  const getCopy = db.prepare("SELECT * FROM copies WHERE id = ?");
  const getVersions = db.prepare(
    "SELECT * FROM copy_versions WHERE copy_id = ? ORDER BY version_no ASC",
  );

  const tx = db.transaction(() => {
    clearStmt.run(copyId);
    setStmt.run(versionId);
    updateCopyStmt.run(versionId, copyId);
    const updated = getCopy.get(copyId) as Copy;
    const versions = getVersions.all(copyId) as CopyVersion[];
    return { ...updated, versions };
  });

  return tx();
}
