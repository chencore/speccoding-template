import { ask } from "../agent/index.js";
import { getChannelDescription } from "../topic/repo.js";
import { buildGeneratePrompt } from "./prompt.js";
import { createCopiesWithVersions, getTopicTitleAndRationale } from "./repo.js";
import type { CopyType, CopyWithVersions } from "./repo.js";

export class CopyGenerateError extends Error {}

interface ParsedCopies {
  titles: unknown;
  descriptions: unknown;
  tags: unknown;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export async function generateCopiesForTopic(
  topicId: number,
): Promise<CopyWithVersions[]> {
  const topic = getTopicTitleAndRationale(topicId);

  const channelDescription = getChannelDescription();
  const prompt = buildGeneratePrompt({
    topicTitle: topic.title,
    topicRationale: topic.rationale,
    channelDescription,
  });

  const { text } = await ask(prompt, { tools: [] });

  const stripped = stripCodeFence(text);
  let parsed: ParsedCopies;
  try {
    parsed = JSON.parse(stripped) as ParsedCopies;
  } catch {
    throw new CopyGenerateError(
      `AI 输出非合法 JSON，原始文本：${text.slice(0, 500)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CopyGenerateError("AI 输出不是 JSON 对象");
  }

  const titles = toStringArray(parsed.titles);
  const descriptions = toStringArray(parsed.descriptions);
  const tagsStr =
    typeof parsed.tags === "string" && parsed.tags.length > 0
      ? [parsed.tags]
      : [];

  const items: { type: CopyType; contents: string[] }[] = [];
  if (titles.length > 0) items.push({ type: "title", contents: titles });
  if (descriptions.length > 0)
    items.push({ type: "description", contents: descriptions });
  if (tagsStr.length > 0) items.push({ type: "tags", contents: tagsStr });

  if (items.length === 0) {
    throw new CopyGenerateError("AI 输出三类文案全为空");
  }

  return createCopiesWithVersions(topicId, items);
}
