"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001/api/v1";

const UNCATEGORIZED = "未分类";

interface Counts {
  pendingTopics: number;
  adoptedTopics: number;
  inProgressCopies: number;
  completedCopies: number;
  importedVideos: number;
}

interface Weekly {
  adoptedTopics: number;
  completedCopies: number;
}

interface PendingTopic {
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
}

interface InProgressItem {
  topicId: number;
  topicTitle: string;
  missing: ("title" | "description" | "tags")[];
}

interface RecentCopy {
  topicTitle: string;
  type: "title" | "description" | "tags";
  content: string;
  adoptedAt: string;
}

interface RecentActivity {
  type: "topic" | "copy";
  title: string;
  timestamp: string;
}

interface DashboardStats {
  counts: Counts;
  weekly: Weekly;
  categoryBreakdown: Record<string, number>;
  recentActivity: RecentActivity[];
  pendingTopicsList: PendingTopic[];
  inProgressList: InProgressItem[];
  recentCopies: RecentCopy[];
}

const TYPE_LABEL: Record<RecentCopy["type"], string> = {
  title: "标题",
  description: "描述",
  tags: "标签",
};

const TYPE_SHORT: Record<
  RecentCopy["type"] | "title" | "description" | "tags",
  string
> = {
  title: "标题",
  description: "描述",
  tags: "标签",
};

function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as DashboardStats;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function formatDate(): string {
  const now = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

function scoreBarColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 75) return "#86efac";
  if (score >= 70) return "#fbbf24";
  return "#fca5a5";
}

function thumbnailColor(seed: string): string {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f97316",
    "#10b981",
    "#06b6d4",
    "#6366f1",
  ];
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(h) % colors.length];
}

function sourceColor(source: string): string {
  const map: Record<string, string> = {
    热搜榜: "#ef4444",
    竞品分析: "#f59e0b",
    历史爆款: "#8b5cf6",
    AI推荐: "#3b82f6",
    评论区: "#10b981",
  };
  return map[source] ?? "#6b7280";
}

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats();

  if (loading) {
    return <div style={{ padding: 40, color: "#6b7280" }}>加载中...</div>;
  }

  if (error || !stats) {
    return (
      <div style={{ padding: 40, color: "#ef4444" }}>
        数据加载失败：{error ?? "未知错误"}
      </div>
    );
  }

  return (
    <main
      style={{
        padding: "28px 32px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1f2937",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700 }}>
          {greeting()}，今天继续创作
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          专注选题和文案，持续产出高质量 YouTube 内容 · {formatDate()}
        </p>
      </header>

      <TodayPlan counts={stats.counts} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <OpportunitiesTable topics={stats.pendingTopicsList} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <InProgressWidget items={stats.inProgressList} />
          <WeeklyOutput counts={stats.counts} weekly={stats.weekly} />
          <RecentCopies copies={stats.recentCopies} />
        </div>
      </div>
    </main>
  );
}

function TodayPlan({ counts }: { counts: Counts }) {
  const steps = useMemo(
    () => [
      {
        label: "筛选 3 个候选选题",
        desc: "从机会列表中挑选高潜力主题",
        done: counts.pendingTopics >= 3,
      },
      {
        label: "确认 1 个选题",
        desc: "深入分析，生成文案 Brief",
        done: counts.adoptedTopics >= 1,
      },
      {
        label: "完成 1 篇文案",
        desc: "撰写并优化，准备发布",
        done: counts.completedCopies >= 1,
      },
    ],
    [counts],
  );

  const completed = steps.filter((s) => s.done).length;

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700 }}>今日创作计划</div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {completed}/{steps.length} 完成
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {steps.map((step, idx) => (
          <div
            key={step.label}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 10,
              background: step.done ? "#eff6ff" : "#f9fafb",
              border: `1px solid ${step.done ? "#bfdbfe" : "#e5e7eb"}`,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: step.done ? "#2563eb" : "#e5e7eb",
                  color: step.done ? "#fff" : "#9ca3af",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {step.done ? "✓" : idx + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{step.label}</div>
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#6b7280",
                paddingLeft: 38,
              }}
            >
              {step.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OpportunitiesTable({ topics }: { topics: PendingTopic[] }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700 }}>今日机会</div>
        <a
          href="/topics"
          style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}
        >
          查看全部机会 →
        </a>
      </div>

      {topics.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 14, padding: "20px 0" }}>
          暂无候选选题，去选题雷达生成一些吧
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{ color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  主题（关键词）
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  趋势分
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  受众匹配
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  新鲜度
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  信号来源
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "10px 8px",
                    fontWeight: 500,
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic, idx) => (
                <tr
                  key={topic.id}
                  style={{ borderBottom: "1px solid #f9fafb" }}
                >
                  <td style={{ padding: "12px 8px", color: "#9ca3af" }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 32,
                          borderRadius: 6,
                          background: thumbnailColor(topic.title),
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{topic.title}</div>
                        <div
                          style={{
                            color: "#9ca3af",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {topic.seed}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: scoreColor(topic.trendScore),
                        }}
                      >
                        {topic.trendScore}
                      </span>
                      <div
                        style={{
                          width: 50,
                          height: 4,
                          borderRadius: 2,
                          background: "#e5e7eb",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${topic.trendScore}%`,
                            height: "100%",
                            background: scoreBarColor(topic.trendScore),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={`dot-${i}`}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              i < Math.round(topic.audienceMatch / 20)
                                ? "#22c55e"
                                : "#e5e7eb",
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        background: scoreBarColor(topic.freshness),
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      {topic.freshnessLabel}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        background: `${sourceColor(topic.signalSource)}15`,
                        color: sourceColor(topic.signalSource),
                        fontWeight: 600,
                      }}
                    >
                      {topic.signalSource}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <a
                        href={`/topics/${topic.id}`}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          background: "#eff6ff",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        查看分析
                      </a>
                      <button
                        type="button"
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#6b7280",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        收藏
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InProgressWidget({ items }: { items: InProgressItem[] }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>进行中的内容</div>
        <a
          href="/history"
          style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}
        >
          查看全部 →
        </a>
      </div>

      {items.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
          暂无进行中的内容
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.topicId}
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                borderRadius: 8,
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 30,
                  borderRadius: 4,
                  background: thumbnailColor(item.topicTitle),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.topicTitle}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {item.missing.map((type) => (
                    <span
                      key={type}
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#dbeafe",
                        color: "#2563eb",
                      }}
                    >
                      待{TYPE_SHORT[type]}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={`/topics/${item.topicId}`}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "#2563eb",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  alignSelf: "center",
                  flexShrink: 0,
                }}
              >
                继续创作
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WeeklyOutput({
  counts,
  weekly,
}: {
  counts: Counts;
  weekly: Weekly;
}) {
  const stats = [
    {
      label: "已确认选题",
      value: weekly.adoptedTopics,
      icon: "◎",
      color: "#2563eb",
    },
    {
      label: "文案完成",
      value: weekly.completedCopies,
      icon: "✎",
      color: "#10b981",
    },
    {
      label: "待处理",
      value: counts.pendingTopics,
      icon: "◷",
      color: "#f59e0b",
    },
  ];

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>本周产出</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>近 7 天</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              background: "#f9fafb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `${s.color}15`,
                color: s.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
                fontSize: 14,
              }}
            >
              {s.icon}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentCopies({ copies }: { copies: RecentCopy[] }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>最近文案</div>
        <a
          href="/history"
          style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}
        >
          查看全部 →
        </a>
      </div>

      {copies.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
          暂无最近文案
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {copies.map((copy, idx) => (
            <div
              key={`${copy.type}-${idx}`}
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copy.topicTitle}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#4b5563",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copy.content}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#dbeafe",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  {TYPE_LABEL[copy.type]}
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                <span>{copy.content.length} 字</span>
                <span>{copy.adoptedAt.slice(0, 16).replace("T", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
