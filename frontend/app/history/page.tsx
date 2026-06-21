"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

interface Topic {
  id: number;
  seed: string;
  title: string;
  rationale: string | null;
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

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main
      style={{
        maxWidth: 900,
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
        <h1 style={{ margin: 0 }}>历史记录</h1>
        <a href="/" style={{ color: "#666", fontSize: 14 }}>
          ← 返回首页
        </a>
      </div>

      {loading && <div>加载中...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {!loading && items.length === 0 && (
        <div style={{ color: "#999" }}>还没有已采用的选题</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {items.map((item) => (
          <section
            key={item.topic.id}
            style={{
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fafafa",
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
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>
                  {item.topic.title}
                </div>
                {item.topic.rationale && (
                  <div style={{ color: "#666", marginTop: 6 }}>
                    {item.topic.rationale}
                  </div>
                )}
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
