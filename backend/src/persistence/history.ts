import type { Copy, CopyVersion } from "../copy/repo.js";
import { db } from "../db/index.js";
import type { Topic } from "../topic/repo.js";

export interface HistoryItem {
  topic: Topic;
  copies: (Copy & { versions: CopyVersion[] })[];
}

export function listAdoptedTopicsWithCopies(): HistoryItem[] {
  const topics = db
    .prepare("SELECT * FROM topics WHERE status = 'adopted' ORDER BY id DESC")
    .all() as Topic[];

  const copiesStmt = db.prepare(
    "SELECT * FROM copies WHERE topic_id = ? ORDER BY type ASC",
  );
  const versionsStmt = db.prepare(
    `SELECT cv.* FROM copy_versions cv
     JOIN copies c ON c.id = cv.copy_id
     WHERE c.topic_id = ? AND c.type = ? AND cv.is_adopted = 1
     ORDER BY cv.version_no ASC`,
  );

  return topics.map((topic) => {
    const copies = copiesStmt.all(topic.id) as Copy[];
    return {
      topic,
      copies: copies.map((copy) => ({
        ...copy,
        versions: versionsStmt.all(topic.id, copy.type) as CopyVersion[],
      })),
    };
  });
}
