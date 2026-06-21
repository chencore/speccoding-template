import { ask } from "../agent/index.js";
import { getChannelDescription } from "../topic/repo.js";
import { buildRewritePrompt } from "./prompt.js";
import {
  type CopyType,
  type CopyVersion,
  VersionNotBelongToCopyError,
  appendVersion,
  getCopyWithTopic,
  getTopicTitleAndRationale,
  getVersion,
} from "./repo.js";

export class CopyRewriteError extends Error {}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

const COMMON_PREFIXES = [
  "以下是改写结果：",
  "以下是改写后的文案：",
  "改写结果：",
  "改写后：",
];

function cleanRewriteText(raw: string): string {
  let s = stripCodeFence(raw).trim();
  for (const prefix of COMMON_PREFIXES) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break;
    }
  }
  return s;
}

export async function rewriteVersion(params: {
  copyId: number;
  sourceVersionId: number;
  instruction: string;
}): Promise<CopyVersion> {
  const { copyId, sourceVersionId, instruction } = params;

  const { copy } = getCopyWithTopic(copyId);
  const topicId = copy.topic_id;
  const type = copy.type as CopyType;

  const v = getVersion(sourceVersionId);
  if (v.copy_id !== copyId) {
    throw new VersionNotBelongToCopyError(
      `version ${sourceVersionId} 不属于 copy ${copyId}`,
    );
  }
  const sourceContent = v.content;

  const topic = getTopicTitleAndRationale(topicId);
  const channelDescription = getChannelDescription();

  const prompt = buildRewritePrompt({
    type,
    sourceContent,
    topicTitle: topic.title,
    topicRationale: topic.rationale,
    channelDescription,
    instruction,
  });

  const { text } = await ask(prompt, { tools: [] });
  const cleaned = cleanRewriteText(text);

  if (!cleaned) {
    throw new CopyRewriteError(`AI 改写输出为空，原文：${text.slice(0, 500)}`);
  }

  return appendVersion(copyId, cleaned);
}
