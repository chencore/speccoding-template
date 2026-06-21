import { ask } from "../agent/index.js";

export const TOPIC_CATEGORIES = [
  "教程/干货",
  "评测/体验",
  "观点/评论",
  "Vlog/日常",
  "热点/资讯",
  "故事/案例",
  "其他",
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export function isValidCategory(category: string): category is TopicCategory {
  return (TOPIC_CATEGORIES as readonly string[]).includes(category);
}

export class TopicClassifyError extends Error {}

function buildClassifyPrompt(title: string, rationale: string | null): string {
  const categories = TOPIC_CATEGORIES.join("\n");
  return `请根据以下 YouTube 视频选题，从预设分类中选择最匹配的一项，只返回分类名，不要解释。

预设分类：
${categories}

选题标题：${title}
${rationale ? `选题理由：${rationale}` : ""}

请只返回一个分类名：`;
}

function normalizeCategory(text: string): TopicCategory {
  const trimmed = text.trim();
  if (isValidCategory(trimmed)) {
    return trimmed;
  }
  return "其他";
}

export async function classifyTopic(
  title: string,
  rationale: string | null,
): Promise<TopicCategory> {
  const prompt = buildClassifyPrompt(title, rationale);
  const { text } = await ask(prompt, { tools: [] });
  const category = normalizeCategory(text);
  return category;
}
