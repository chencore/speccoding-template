"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

type CopyType = "title" | "description" | "tags";

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
  type: CopyType;
  adopted_version_id: number | null;
  versions: CopyVersion[];
}

export default function TopicDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const [topicId, setTopicId] = useState<number | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rewriteTarget, setRewriteTarget] = useState<{
    copyId: number;
    versionId: number;
  } | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState("");

  useEffect(() => {
    params.then((p) => setTopicId(Number.parseInt(p.id, 10)));
  }, [params]);

  const fetchTopic = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const listRes = await fetch(`${API_BASE}/topics`);
      const data = (await listRes.json()) as { items: Topic[] };
      setTopic(data.items.find((t) => t.id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCopies = useCallback(async (id: number) => {
    const res = await fetch(`${API_BASE}/topics/${id}/copies`);
    if (res.status === 404) {
      setCopies([]);
      return;
    }
    const data = (await res.json()) as { copies: Copy[] };
    setCopies(data.copies);
  }, []);

  useEffect(() => {
    if (topicId === null || Number.isNaN(topicId)) return;
    fetchTopic(topicId);
    fetchCopies(topicId);
  }, [topicId, fetchTopic, fetchCopies]);

  async function handleGenerate() {
    if (topicId === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/topics/${topicId}/copies/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { copies: Copy[] };
      setCopies(data.copies);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdopt(copyId: number, versionId: number) {
    if (topicId === null) return;
    setError(null);
    const res = await fetch(`${API_BASE}/copies/${copyId}/adopt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? `HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as { copy: Copy };
    setCopies((prev) =>
      prev.map((c) => (c.id === copyId ? { ...data.copy } : c)),
    );
  }

  async function handleRewriteSubmit() {
    if (!rewriteTarget || !rewriteInstruction.trim() || topicId === null)
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/copies/${rewriteTarget.copyId}/rewrite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVersionId: rewriteTarget.versionId,
            instruction: rewriteInstruction,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { version: CopyVersion };
      setCopies((prev) =>
        prev.map((c) =>
          c.id === rewriteTarget.copyId
            ? { ...c, versions: [...c.versions, data.version] }
            : c,
        ),
      );
      setRewriteTarget(null);
      setRewriteInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const titleCopies = copies.filter((c) => c.type === "title");
  const descCopies = copies.filter((c) => c.type === "description");
  const tagsCopies = copies.filter((c) => c.type === "tags");

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <a href="/topics" style={{ color: "#666", fontSize: 14 }}>
        ← 返回选题列表
      </a>

      <h1>选题详情</h1>

      {loading && <div>加载中...</div>}

      {topic && (
        <section
          style={{
            marginBottom: 24,
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 18 }}>{topic.title}</div>
          {topic.rationale && (
            <div style={{ color: "#666", marginTop: 8 }}>{topic.rationale}</div>
          )}
          <div style={{ color: "#999", marginTop: 8, fontSize: 12 }}>
            种子：{topic.seed} · 状态：{topic.status}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            style={buttonStyle}
          >
            {busy ? "生成中..." : "生成文案"}
          </button>
          {error && <span style={{ color: "red" }}>{error}</span>}
        </div>
      </section>

      <CopyBlock
        label="标题"
        copies={titleCopies}
        onAdopt={handleAdopt}
        onRewrite={(copyId, versionId) => {
          setRewriteTarget({ copyId, versionId });
          setRewriteInstruction("");
        }}
      />
      <CopyBlock
        label="描述"
        copies={descCopies}
        onAdopt={handleAdopt}
        onRewrite={(copyId, versionId) => {
          setRewriteTarget({ copyId, versionId });
          setRewriteInstruction("");
        }}
      />
      <CopyBlock
        label="标签"
        copies={tagsCopies}
        onAdopt={handleAdopt}
        onRewrite={(copyId, versionId) => {
          setRewriteTarget({ copyId, versionId });
          setRewriteInstruction("");
        }}
      />

      {rewriteTarget && (
        // biome-ignore lint/a11y/useSemanticElements: modal backdrop pattern
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close; Escape handled via window listener
        <div
          role="button"
          tabIndex={0}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setRewriteTarget(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter") {
              setRewriteTarget(null);
            }
          }}
        >
          {/* biome-ignore lint/a11y/useSemanticElements: modal container */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only */}
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              minWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>改写文案</h3>
            <textarea
              placeholder="改写指令（如：更口语化、再短一点、强调数据）"
              value={rewriteInstruction}
              onChange={(e) => setRewriteInstruction(e.target.value)}
              rows={3}
              style={{ ...textareaStyle, width: "100%" }}
            />
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setRewriteTarget(null)}
                style={buttonStyle}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRewriteSubmit}
                disabled={busy || !rewriteInstruction.trim()}
                style={buttonStyle}
              >
                {busy ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CopyBlock({
  label,
  copies,
  onAdopt,
  onRewrite,
}: {
  label: string;
  copies: Copy[];
  onAdopt: (copyId: number, versionId: number) => void;
  onRewrite: (copyId: number, versionId: number) => void;
}) {
  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        border: "1px solid #eee",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{label}</h2>
      {copies.length === 0 ? (
        <div style={{ color: "#999" }}>暂无文案，点上方"生成文案"</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {copies.flatMap((c) =>
            c.versions.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 6,
                  background: v.is_adopted ? "#e6f7e6" : "#fff",
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
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {v.content}
                    </div>
                    <div style={{ color: "#999", marginTop: 6, fontSize: 12 }}>
                      v{v.version_no}
                      {v.is_adopted ? " · 已采用" : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {v.is_adopted !== 1 && (
                      <button
                        type="button"
                        onClick={() => onAdopt(c.id, v.id)}
                        style={smallBtnStyle}
                      >
                        采用
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRewrite(c.id, v.id)}
                      style={smallBtnStyle}
                    >
                      改写
                    </button>
                  </div>
                </div>
              </div>
            )),
          )}
        </div>
      )}
    </section>
  );
}

const textareaStyle: React.CSSProperties = {
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 4,
  fontFamily: "inherit",
  fontSize: 14,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 14px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const smallBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  fontSize: 12,
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
};
