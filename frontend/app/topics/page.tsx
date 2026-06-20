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

interface ListResult {
  items: Topic[];
  total: number;
  page: number;
  pageSize: number;
}

type StatusFilter = "all" | "pending" | "adopted" | "discarded";

export default function TopicsPage() {
  const [seeds, setSeeds] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loadingList, setLoadingList] = useState(false);

  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [channelDesc, setChannelDesc] = useState("");
  const [channelMsg, setChannelMsg] = useState<string | null>(null);

  const [importedCount, setImportedCount] = useState(0);

  const fetchTopics = useCallback(async () => {
    setLoadingList(true);
    const q = statusFilter === "all" ? "" : `?status=${statusFilter}`;
    const res = await fetch(`${API_BASE}/topics${q}`);
    const data = (await res.json()) as ListResult;
    setTopics(data.items);
    setLoadingList(false);
  }, [statusFilter]);

  const fetchImportedCount = useCallback(async () => {
    const res = await fetch(`${API_BASE}/topics/imported-videos`);
    const data = (await res.json()) as { items: unknown[] };
    setImportedCount(data.items.length);
  }, []);

  const fetchChannelDesc = useCallback(async () => {
    const res = await fetch(`${API_BASE}/topics/channel-config`);
    const data = (await res.json()) as { channel_description: string | null };
    setChannelDesc(data.channel_description ?? "");
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    fetchImportedCount();
    fetchChannelDesc();
  }, [fetchImportedCount, fetchChannelDesc]);

  async function handleGenerate() {
    const seedArr = seeds
      .split(/[,\n，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (seedArr.length === 0) {
      setError("请输入至少一个种子词");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/topics/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeds: seedArr, count }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { topics: Topic[] };
      setSeeds("");
      await fetchTopics();
      void data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(id: number, status: Topic["status"]) {
    await fetch(`${API_BASE}/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchTopics();
  }

  async function handleImportText() {
    if (!importText.trim()) return;
    setImportMsg(null);
    const res = await fetch(`${API_BASE}/topics/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: importText }),
    });
    const data = (await res.json()) as { imported: number; skipped: number };
    setImportText("");
    setImportMsg(`导入 ${data.imported} 条，跳过 ${data.skipped} 条`);
    await fetchImportedCount();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/topics/import`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { imported: number; skipped: number };
    setImportMsg(`导入 ${data.imported} 条，跳过 ${data.skipped} 条`);
    e.target.value = "";
    await fetchImportedCount();
  }

  async function handleClearImported() {
    if (!confirm("确定清空所有导入的历史数据？")) return;
    await fetch(`${API_BASE}/topics/imported-videos`, { method: "DELETE" });
    setImportMsg("已清空");
    await fetchImportedCount();
  }

  async function handleSaveChannel() {
    setChannelMsg(null);
    await fetch(`${API_BASE}/topics/channel-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_description: channelDesc }),
    });
    setChannelMsg("已保存");
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>选题工作台</h1>

      <Section title="生成选题">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            placeholder="种子词，逗号或换行分隔（如：AI编程, 独立开发）"
            value={seeds}
            onChange={(e) => setSeeds(e.target.value)}
            rows={3}
            style={textareaStyle}
          />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label>
              数量：
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              style={buttonStyle}
            >
              {generating ? "生成中..." : "生成"}
            </button>
          </div>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </div>
      </Section>

      <Section title="频道描述（选填，影响生成质量）">
        <textarea
          placeholder="描述你的频道定位、目标受众、风格调性"
          value={channelDesc}
          onChange={(e) => setChannelDesc(e.target.value)}
          rows={3}
          style={textareaStyle}
        />
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button type="button" onClick={handleSaveChannel} style={buttonStyle}>
            保存
          </button>
          {channelMsg && <span style={{ color: "green" }}>{channelMsg}</span>}
        </div>
      </Section>

      <Section title={`导入历史数据（已导入 ${importedCount} 条）`}>
        <textarea
          placeholder="每行一条：标题,播放量 或纯标题（首行可为 title,views 表头）"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          style={textareaStyle}
        />
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={handleImportText} style={buttonStyle}>
            导入文本
          </button>
          <label style={buttonStyle}>
            上传 CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
          </label>
          <button
            type="button"
            onClick={handleClearImported}
            style={{ ...buttonStyle, color: "red" }}
          >
            清空
          </button>
          {importMsg && <span>{importMsg}</span>}
        </div>
      </Section>

      <Section title="选题列表">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["all", "pending", "adopted", "discarded"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={statusFilter === s ? activeTabStyle : tabStyle}
              >
                {s === "all" ? "全部" : s}
              </button>
            ),
          )}
        </div>
        {loadingList ? (
          <div>加载中...</div>
        ) : topics.length === 0 ? (
          <div style={{ color: "#999" }}>暂无选题</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topics.map((t) => (
              <div key={t.id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.rationale && (
                      <div
                        style={{ color: "#666", marginTop: 4, fontSize: 14 }}
                      >
                        {t.rationale}
                      </div>
                    )}
                    <div style={{ color: "#999", marginTop: 6, fontSize: 12 }}>
                      种子：{t.seed} · {t.status}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {t.status !== "adopted" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "adopted")}
                        style={smallBtnStyle}
                      >
                        采用
                      </button>
                    )}
                    {t.status !== "discarded" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "discarded")}
                        style={smallBtnStyle}
                      >
                        弃用
                      </button>
                    )}
                    {t.status !== "pending" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "pending")}
                        style={smallBtnStyle}
                      >
                        恢复
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginBottom: 24,
        padding: 16,
        border: "1px solid #eee",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
      {children}
    </section>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
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

const tabStyle: React.CSSProperties = {
  padding: "4px 12px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#333",
  color: "#fff",
  borderColor: "#333",
};

const cardStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 6,
  background: "#fafafa",
};
