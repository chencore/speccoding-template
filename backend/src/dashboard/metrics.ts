export const SIGNAL_SOURCES = [
  "热搜榜",
  "竞品分析",
  "历史爆款",
  "AI推荐",
  "评论区",
] as const;

export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export interface TopicMetrics {
  trendScore: number;
  audienceMatch: number;
  freshness: number;
  signalSource: SignalSource;
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function computeTopicMetrics(topic: {
  id: number;
  title: string;
}): TopicMetrics {
  const h = hashString(`${topic.id}:${topic.title}`);
  return {
    trendScore: 60 + (h % 40),
    audienceMatch: 50 + ((h >> 4) % 50),
    freshness: 70 + ((h >> 8) % 30),
    signalSource: SIGNAL_SOURCES[h % SIGNAL_SOURCES.length],
  };
}

export function freshnessLabel(score: number): string {
  if (score >= 90) return "很新";
  if (score >= 80) return "较新";
  if (score >= 75) return "一般";
  return "稳定";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

export function thumbnailColor(seed: string): string {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f97316",
    "#10b981",
    "#06b6d4",
    "#6366f1",
  ];
  const h = hashString(seed);
  return colors[h % colors.length];
}
