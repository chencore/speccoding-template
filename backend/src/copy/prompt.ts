import type { CopyType } from "./repo.js";

export interface BuildGeneratePromptInput {
  topicTitle: string;
  topicRationale: string | null;
  channelDescription: string | null;
}

export function buildGeneratePrompt(input: BuildGeneratePromptInput): string {
  const { topicTitle, topicRationale, channelDescription } = input;
  const descLine = channelDescription ?? "未提供";
  const rationaleLine = topicRationale ?? "（未提供选题理由）";

  return `你是 YouTube 文案助手。基于以下选题生成文案。

选题标题：${topicTitle}
选题理由：${rationaleLine}
频道描述：${descLine}

请生成：
- titles：5 个不同风格的视频标题（吸睛、含关键词、不超过 60 字）
- descriptions：2 个视频描述（hook 开头 + 正文 + 互动引导，200-500 字，可用 emoji 和换行）
- tags：1 组标签（逗号分隔的字符串，10-15 个，覆盖核心关键词）

严格输出 JSON：
{"titles":["...","...","...","...","..."],"descriptions":["...","..."],"tags":"...,...,..."}

不要输出任何其他内容（不要 markdown 代码块标记、不要解释文字）。`;
}

export interface BuildRewritePromptInput {
  type: CopyType;
  sourceContent: string;
  topicTitle: string;
  topicRationale: string | null;
  channelDescription: string | null;
  instruction: string;
}

const TYPE_REQUIREMENTS: Record<CopyType, string> = {
  title: "标题，不超过 60 字",
  description: "描述，200-500 字",
  tags: "标签，逗号分隔的字符串",
};

const TYPE_LABEL: Record<CopyType, string> = {
  title: "标题",
  description: "描述",
  tags: "标签",
};

export function buildRewritePrompt(input: BuildRewritePromptInput): string {
  const {
    type,
    sourceContent,
    topicTitle,
    topicRationale,
    channelDescription,
    instruction,
  } = input;
  const label = TYPE_LABEL[type];
  const descLine = channelDescription ?? "未提供";
  const rationaleLine = topicRationale ?? "（未提供）";

  return `你是 YouTube 文案改写助手。请改写以下${label}文案。

原${label}：
${sourceContent}

选题背景：${topicTitle} — ${rationaleLine}
频道调性：${descLine}

改写指令：${instruction}

要求：
- 保持是${label}文案（不要改成其他类型）
- 输出纯文本，不要 JSON、不要 markdown 代码块、不要解释
- ${label}对应要求：${TYPE_REQUIREMENTS[type]}`;
}
