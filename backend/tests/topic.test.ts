import { describe, expect, it, vi } from "vitest";

vi.mock("../src/agent/index.js", () => ({
  ask: vi.fn(),
}));

import { ask } from "../src/agent/index.js";
import { TopicGenerateError, generateTopics } from "../src/topic/generate.js";
import { parseImportText } from "../src/topic/import.js";
import { buildGeneratePrompt } from "../src/topic/prompt.js";

describe("parseImportText", () => {
  it("纯标题（每行一条）", () => {
    const { rows, skipped } = parseImportText("标题A\n标题B\n标题C");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ title: "标题A", views: null });
    expect(skipped).toBe(0);
  });

  it("title,views 格式", () => {
    const { rows, skipped } = parseImportText("AI入门,1200\n工具盘点,800");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ title: "AI入门", views: 1200 });
    expect(rows[1]).toEqual({ title: "工具盘点", views: 800 });
    expect(skipped).toBe(0);
  });

  it("跳过表头行 title,views", () => {
    const { rows } = parseImportText("title,views\n标题A,100");
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("标题A");
  });

  it("views 非数字时置 null 保留 title", () => {
    const { rows, skipped } = parseImportText("标题,abc");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ title: "标题", views: null });
    expect(skipped).toBe(0);
  });

  it("超过 2 列的行跳过", () => {
    const { rows, skipped } = parseImportText("标题,a,b,c");
    expect(rows).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it("空行跳过", () => {
    const { rows, skipped } = parseImportText("标题A\n\n  \n标题B");
    expect(rows).toHaveLength(2);
    expect(skipped).toBe(0);
  });
});

describe("buildGeneratePrompt", () => {
  it("含频道描述和历史数据", () => {
    const prompt = buildGeneratePrompt({
      seeds: ["AI编程"],
      count: 5,
      channelDescription: "关于 AI 的频道",
      historyVideos: [
        { id: 1, title: "旧视频", views: 100, imported_at: "2026-01-01" },
      ],
    });
    expect(prompt).toContain("5 条");
    expect(prompt).toContain("关于 AI 的频道");
    expect(prompt).toContain("旧视频 (100 次播放)");
    expect(prompt).toContain("AI编程");
    expect(prompt).toContain("JSON 数组");
  });

  it("无频道描述时显示未提供", () => {
    const prompt = buildGeneratePrompt({
      seeds: ["x"],
      count: 10,
      channelDescription: null,
      historyVideos: [],
    });
    expect(prompt).toContain("未提供");
    expect(prompt).toContain("暂无历史数据");
  });
});

describe("generateTopics", () => {
  it("合法 JSON 返回时写入并返回选题", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: JSON.stringify([
        { title: "选题1", rationale: "理由1" },
        { title: "选题2", rationale: "理由2" },
      ]),
      messages: [],
    });
    const topics = await generateTopics({ seeds: ["AI"], count: 2 });
    expect(topics).toHaveLength(2);
    expect(topics[0].title).toBe("选题1");
    expect(topics[0].status).toBe("pending");
    expect(topics[0].seed).toBe("AI");
  });

  it("markdown 代码块包裹的 JSON 能 strip 后解析", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: '```json\n[{"title":"选题","rationale":"理由"}]\n```',
      messages: [],
    });
    const topics = await generateTopics({ seeds: ["x"], count: 1 });
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe("选题");
  });

  it("非 JSON 抛 TopicGenerateError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: "这不是 JSON",
      messages: [],
    });
    await expect(generateTopics({ seeds: ["x"], count: 1 })).rejects.toThrow(
      TopicGenerateError,
    );
  });

  it("非数组抛 TopicGenerateError", async () => {
    vi.mocked(ask).mockResolvedValueOnce({
      text: '{"title":"x"}',
      messages: [],
    });
    await expect(generateTopics({ seeds: ["x"], count: 1 })).rejects.toThrow(
      TopicGenerateError,
    );
  });
});
