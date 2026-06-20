import { describe, expect, it, vi } from "vitest";
import { ask } from "../src/agent/index.js";
import { echoTool } from "../src/agent/tools/echo.js";

describe("echo tool", () => {
  it("execute 原样返回 message 作为 text content", async () => {
    const result = await echoTool.execute(
      "call-1",
      { message: "hello" },
      undefined,
    );
    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
    expect(result.details).toEqual({ echoed: "hello" });
  });

  it("execute 接受任意字符串", async () => {
    const result = await echoTool.execute(
      "call-2",
      { message: "你好世界 123" },
      undefined,
    );
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "你好世界 123",
    });
  });
});

describe("AgentService ask()", () => {
  it("无 DEEPSEEK_API_KEY 时 ask 抛错（含 API key 提示）", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    try {
      await expect(ask("你好")).rejects.toThrow(/API key/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
