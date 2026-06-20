import { ask } from "../agent/index.js";
import { buildGeneratePrompt } from "./prompt.js";
import {
  createTopic,
  getChannelDescription,
  listImportedVideosForPrompt,
} from "./repo.js";
import type { Topic } from "./repo.js";

const HISTORY_LIMIT = 30;

export class TopicGenerateError extends Error {}

export interface GeneratedItem {
  title: string;
  rationale: string;
}

export async function generateTopics(params: {
  seeds: string[];
  count: number;
}): Promise<Topic[]> {
  const { seeds, count } = params;

  const channelDescription = getChannelDescription();
  const historyVideos = listImportedVideosForPrompt(HISTORY_LIMIT);

  const prompt = buildGeneratePrompt({
    seeds,
    count,
    channelDescription,
    historyVideos,
  });

  const { text } = await ask(prompt, { tools: [] });

  const stripped = stripCodeFence(text);
  let items: GeneratedItem[];
  try {
    items = JSON.parse(stripped) as GeneratedItem[];
  } catch {
    throw new TopicGenerateError(
      `AI 输出非合法 JSON，原始文本：${text.slice(0, 500)}`,
    );
  }

  if (!Array.isArray(items)) {
    throw new TopicGenerateError("AI 输出不是 JSON 数组");
  }

  const seedStr = seeds.join(";");
  const created: Topic[] = [];
  for (const item of items) {
    if (!item?.title || typeof item.title !== "string") continue;
    const rationale = typeof item.rationale === "string" ? item.rationale : "";
    created.push(createTopic({ seed: seedStr, title: item.title, rationale }));
  }

  return created;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}
