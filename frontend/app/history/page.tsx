"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

const UNCATEGORIZED = "未分类";

const TOPIC_CATEGORIES = [
  "教程/干货",
  "评测/体验",
  "观点/评论",
  "Vlog/日常",
  "热点/资讯",
  "故事/案例",
  "其他",
];

interface Topic {
  id: number;
  seed: string;
  title: string;
  rationale: string | null;
  category: string | null;
  status: "pending" | "adopted" | "discarded";
  created_at: string;
}

interface CopyVersion {
  id: number;
  copy_id: number;
  version_no: number;
  content: string;
  is_adopted: number;
  created_at: string;
}

interface Copy {
  id: number;
  topic_id: number;
  type: "title" | "description" | "tags";
  adopted_version_id: number | null;
  versions: CopyVersion[];
}

interface HistoryItem {
  topic: Topic;
  copies: Copy[];
}

const TYPE_LABEL: Record<Copy["type"], string> = {
  title: "标题",
  description: "描述",
  tags: "标签",
};

type FilterCategory = "all" | typeof UNCATEGORIZED | string;

export default function LibraryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { items: HistoryItem[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleCategoryChange(topicId: number, category: string) {
    setUpdatingId(topicId);
    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      await fetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAutoClassify(topicId: number) {
    setUpdatingId(topicId);
    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      await fetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<FilterCategory, HistoryItem[]>();
    for (const item of items) {
      const category = item.topic.category ?? UNCATEGORIZED;
      if (filter !== "all" && category !== filter) continue;
      const list = map.get(category) ?? [];
      list.push(item);
      map.set(category, list);
    }
    const order = [UNCATEGORIZED, ...TOPIC_CATEGORIES];
    return Array.from(map.entries()).sort((a, b) => {
      const idxA = order.indexOf(a[0]);
      const idxB = order.indexOf(b[0]);
      return idxA - idxB;
    });
  }, [items, filter]);

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>选题库</h1>
        <a href="/" style={{ color: "#666", fontSize: 14 }}>
          ← 返回首页
        </a>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14 }}>
          分类筛选：{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "4px 8px", fontSize: 14 }}
          >
            <option value="all">全部</option>
            <option value={UNCATEGORIZED}>{UNCATEGORIZED}</option>
            {TOPIC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div>加载中...</div>}
      {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

      {!loading && items.length === 0 && (
        <div style={{ color: "#999" }}>还没有已采用的选题</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {grouped.map(([category, groupItems]) => (
          <section key={category} style={{ margin: 0 }}>
            <h2
              style={{
                fontSize: 16,
                margin: "0 0 12px",
                paddingBottom: 8,
                borderBottom: "1px solid #eee",
                color: category === UNCATEGORIZED ? "#999" : "#333",
              }}
            >
              {category}
              <span
                style={{ color: "#999", fontWeight: "normal", marginLeft: 8 }}
              >
                ({groupItems.length})
              </span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groupItems.map((item) => (
                <section
                  key={item.topic.id}
                  style={{
                    padding: 16,
                    border: "1px solid #eee",
                    borderRadius: 8,
                    background: "#fafafa",
                    opacity: updatingId === item.topic.id ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>
                        {item.topic.title}
                      </div>
                      {item.topic.rationale && (
                        <div style={{ color: "#666", marginTop: 6 }}>
                          {item.topic.rationale}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <label style={{ fontSize: 13 }}>
                          分类：{" "}
                          <select
                            value={item.topic.category ?? ""}
                            onChange={(e) =>
                              handleCategoryChange(
                                item.topic.id,
                                e.target.value,
                              )
                            }
                            disabled={updatingId === item.topic.id}
                            style={{ padding: "2px 6px", fontSize: 13 }}
                          >
                            <option value="">{UNCATEGORIZED}</option>
                            {TOPIC_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!item.topic.category && (
                          <button
                            type="button"
                            onClick={() => handleAutoClassify(item.topic.id)}
                            disabled={updatingId === item.topic.id}
                            style={smallBtnStyle}
                          >
                            自动分类
                          </button>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/topics/${item.topic.id}`}
                      style={{
                        ...smallBtnStyle,
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      查看详情
                    </a>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {item.copies.map((copy) => (
                      <div
                        key={copy.id}
                        style={{
                          padding: 12,
                          border: "1px solid #eee",
                          borderRadius: 6,
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "#999",
                            marginBottom: 6,
                            textTransform: "uppercase",
                          }}
                        >
                          {TYPE_LABEL[copy.type]}
                        </div>
                        {copy.versions.length > 0 ? (
                          copy.versions.map((v) => (
                            <div
                              key={v.id}
                              style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {v.content}
                            </div>
                          ))
                        ) : (
                          <div style={{ color: "#999" }}>
                            未选择{TYPE_LABEL[copy.type]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: 12,
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
};
