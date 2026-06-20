# Design: integrate-pi-agent

> **跨模块影响**：引入 agent 模块，被后续 topic/copy 模块依赖——但 `spec/design.md` 已在 kickoff 时写入 pi 集成决策，本变更无需再提升。
> **新增外部依赖**：`@earendil-works/pi-ai` + `@earendil-works/pi-agent-core`——kickoff 时已确认，无需提升。
> **数据模型变更**：无。

---

## 1. 关键事实（调研确认）

- pi-ai **原生支持 DeepSeek**：`KnownProvider` 含 `"deepseek"`，`MODELS.deepseek["deepseek-v4-pro"]` 预置完整（baseUrl `https://api.deepseek.com`，api `openai-completions`，`thinkingFormat: "deepseek"`）
- 取模型：`getModel("deepseek", "deepseek-v4-pro")`（从 `@earendil-works/pi-ai`）
- API key：pi-ai 自动读 `DEEPSEEK_API_KEY` 环境变量（`env-api-keys.js` 映射），无需代码层注入
- Agent API：
  - `new Agent({ initialState: { model, systemPrompt, tools } })`
  - `agent.prompt(message)` → `agent.waitForIdle()`
  - `agent.subscribe(listener)` 接收 `AgentEvent`，`agent_end` 事件含最终 `messages`
- 自定义工具：实现 `AgentTool` 接口（`label` + TypeBox `parameters` schema + `execute`），塞进 `initialState.tools`
- TypeBox：pi-ai 依赖 `typebox`，schema 用 `Type.Object({...})`

**CLAUDE.md 待定项"pi-ai 是否原生支持 DeepSeek"——已解决：原生支持，模型 ID `deepseek-v4-pro`。**

## 2. 目录结构

```
backend/src/agent/
├── index.ts          # AgentService 封装
├── models.ts         # 模型获取封装
└── tools/
    ├── index.ts      # 工具注册汇总（导出 allTools 数组）
    └── echo.ts       # demo 工具

backend/src/routes/
└── agent.ts          # POST /api/v1/agent/ask

backend/tests/
└── agent.test.ts     # mock 单元测试
```

## 3. 模块设计

### `models.ts`
```ts
import { getModel } from "@earendil-works/pi-ai";

export const DEFAULT_MODEL = getModel("deepseek", "deepseek-v4-pro");

export function getModelByProvider(provider: string, modelId: string) {
  return getModel(provider as any, modelId as any);
}
```

### `tools/echo.ts`
```ts
import { Type } from "@earendil-works/pi-ai/base";
import type { AgentTool } from "@earendil-works/pi-agent-core";

export const echoTool: AgentTool = {
  label: "Echo",
  name: "echo",
  description: "原样返回输入的 message，用于验证工具调用链路",
  parameters: Type.Object({
    message: Type.String({ description: "要原样返回的内容" }),
  }),
  async execute(_toolCallId, params) {
    return {
      content: [{ type: "text", text: params.message }],
      details: { echoed: params.message },
    };
  },
};
```
**注意**：`AgentTool` 继承 `Tool<TParameters>`，后者要求 `name`/`description`/`parameters` 字段；`label` 是 AgentTool 额外要求。具体字段名以实际类型校准为准（执行阶段验证）。

### `tools/index.ts`
```ts
import { echoTool } from "./echo.js";
export const allTools = [echoTool];
export { echoTool };
```

### `index.ts`（AgentService）
```ts
import { Agent } from "@earendil-works/pi-agent-core";
import type { AgentMessage, AgentTool } from "@earendil-works/pi-agent-core";
import { DEFAULT_MODEL } from "./models.js";
import { allTools } from "./tools/index.js";

const SYSTEM_PROMPT = "你是自媒体创作工作台的 AI 助手，辅助选题与文案生成。";

export interface AskResult {
  text: string;
  messages: AgentMessage[];
}

export async function ask(
  message: string,
  opts?: { tools?: AgentTool<any>[]; systemPrompt?: string }
): Promise<AskResult> {
  const agent = new Agent({
    initialState: {
      model: DEFAULT_MODEL,
      systemPrompt: opts?.systemPrompt ?? SYSTEM_PROMPT,
      tools: opts?.tools ?? allTools,
    },
  });

  let finalMessages: AgentMessage[] = [];
  agent.subscribe((event) => {
    if (event.type === "agent_end") finalMessages = event.messages;
  });

  await agent.prompt(message);
  await agent.waitForIdle();

  const lastAssistant = [...finalMessages]
    .reverse()
    .find((m) => m.role === "assistant" && m.content.some((c) => c.type === "text"));

  const text =
    lastAssistant?.content.find((c) => c.type === "text")?.text ?? "";

  return { text, messages: finalMessages };
}
```

### `routes/agent.ts`
```ts
import { Hono } from "hono";
import { ask } from "../agent/index.js";

export const agentRoute = new Hono();

agentRoute.post("/ask", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body?.message || typeof body.message !== "string") {
    return c.json({ error: "message (string) is required" }, 400);
  }
  try {
    const { text } = await ask(body.message);
    return c.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // API key 未配置或调用失败时返回 503，避免 500 崩溃
    if (/api key|unauthorized|401/i.test(msg)) {
      return c.json({ error: "LLM 调用失败，请检查 API key 配置", detail: msg }, 503);
    }
    return c.json({ error: "LLM 调用失败", detail: msg }, 500);
  }
});
```

挂载到 `index.ts`：
```ts
const app = new Hono()
  .basePath("/api/v1")
  .route("/", health)
  .route("/", agentRoute);
```

## 4. 测试策略（mock，不依赖真实 key）

由于真实调用 DeepSeek 需 API key 且耗时，单元测试用 mock `streamFn` 注入 Agent：

```ts
// tests/agent.test.ts
import { describe, it, expect } from "vitest";
import { Agent } from "@earendil-works/pi-agent-core";
// 构造一个 mock streamFn，模拟 LLM 返回固定文本或模拟工具调用
```

测试覆盖：
1. **纯文本对话**：mock streamFn 返回 "你好回去"，`ask("你好")` 返回 `text === "你好回去"`
2. **工具调用**：mock streamFn 模拟 agent 决定调 echo 工具，验证 echo 的 execute 被调用且最终文本含 echo 返回值
3. **错误传播**：mock streamFn 抛 "API key invalid"，`ask` 抛出含该消息的错误

**测试框架选型**：v0.1 首个测试，需引入 `vitest`（Node 原生 ESM 友好，与 Biome 兼容）。

## 5. 关键决策与权衡

### 决策 1：每请求新建 Agent（无状态）
- **选择**：`ask()` 内部 `new Agent(...)`，跑完即弃
- **放弃**：单例 Agent / session 持久化
- **理由**：v0.1 选题/文案场景以单轮生成为主；无状态最简单、无并发问题；多轮需求出现时再引入 sessionRepo

### 决策 2：非流式响应
- **选择**：`prompt` + `waitForIdle`，一次性返回
- **放弃**：SSE 流式
- **理由**：5-15 秒等待可接受；流式需前后端配套，v0.1 不做

### 决策 3：依赖 pi-ai 自动读环境变量
- **选择**：不显式传 `getApiKey`
- **放弃**：从 config 注入 key
- **理由**：pi-ai 已封装 env 读取；v0.1 无密钥管理 UI 需求；将来从 DB 读 key 时再改

### 决策 4：mock 单元测试而非真机端到端
- **选择**：mock streamFn 做单元测试，真实 LLM 验证留用户手动
- **放弃**：测试里真调 DeepSeek
- **理由**：CI 无 key、测试需快、避免真实调用费用；mock 能覆盖链路正确性

## 6. 风险

- **AgentTool 字段名偏差**：`AgentTool` 继承 `Tool`，实际 `name`/`description`/`parameters` 字段名需执行时校准。Mitigation：写 echo 时以 IDE 类型检查为准，必要时调整。
- **Agent 事件类型细节**：`agent_end` 的 messages 形态、assistant 消息 content 结构需执行时确认。Mitigation：先写最小版本跑通，再补测试断言。
- **vitest 与 Biome 兼容**：Biome 可能对测试文件有额外 lint 规则。Mitigation：必要时在 biome.json 给 tests 目录放宽规则。
