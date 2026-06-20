import type { ImportedVideo } from "./repo.js";

export interface BuildPromptInput {
  seeds: string[];
  count: number;
  channelDescription: string | null;
  historyVideos: ImportedVideo[];
}

export function buildGeneratePrompt(input: BuildPromptInput): string {
  const { seeds, count, channelDescription, historyVideos } = input;

  const descLine = channelDescription
    ? channelDescription
    : "未提供（请基于种子词和历史数据推断频道调性）";

  const historyLines =
    historyVideos.length > 0
      ? historyVideos
          .map((v, i) => {
            const viewsStr =
              v.views != null ? `${v.views} 次播放` : "播放量未知";
            return `${i + 1}. ${v.title} (${viewsStr})`;
          })
          .join("\n")
      : "（暂无历史数据）";

  return `你是自媒体选题助手。基于以下信息生成 ${count} 条 YouTube 选题。

频道描述：${descLine}

历史视频（按播放量排序，供参考避免重复 + 找新角度）：
${historyLines}

种子词：${seeds.join("、")}

要求：
- 每条选题含 title（选题标题）和 rationale（推荐理由，一句话说明为什么适合这个频道）
- 选题不与历史视频标题重复
- 贴合频道调性
- 严格输出 JSON 数组：[{"title":"...","rationale":"..."}]
- 不要输出任何其他内容（不要 markdown 代码块标记、不要解释文字）`;
}
