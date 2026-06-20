# Plan: integrate-pi-agent

> 实现计划，由 design.md + tasks.md 驱动。执行阶段严格按本文件。
> 完成后由 `/opsx:archive` 归档，再 merge 回父分支 `version/v0.1`。

---

## 0. 前置检查

- 当前分支：`feature/integrate-pi-agent`（已建，父分支 `version/v0.1` 已记录）
- 依赖已装（调研时安装）：`@earendil-works/pi-ai` + `@earendil-works/pi-agent-core` 在 `backend/node_modules`
- 工作区干净：仅本变更的 spec 产出物待 commit

## 1. 执行顺序与文件清单

按依赖顺序分 9 步。**Step 2-3 有关键校准点**（AgentTool 字段名、Agent 事件结构），执行时若类型对不上需停下校准。

### Step 1 — 引入 vitest

**修改 `backend/package.json`**：devDependencies 加 `vitest`，scripts 加 `"test": "vitest run"`、`"test:watch": "vitest"`。

**修改 `biome.json`**：tests 目录放宽 `noUnusedVariables` 等可能误报测试代码的规则（执行时按实际报错决定加哪些，不预判）。

**自检：** `cd backend && npm install && npm test`（此时无测试文件，vitest 报 "no test files" 但应正常退出或可接受报错；不阻塞）。

### Step 2 — `agent/models.ts`

**创建 `backend/src/agent/models.ts`**：
```ts
import { getModel } from "@earendil-works/pi-ai";

export const DEFAULT_MODEL = getModel("deepseek", "deepseek-v4-pro");

export function getModelByProvider(provider: string, modelId: string) {
  return getModel(provider as any, modelId as any);
}
```

**自检：** `npx tsc --noEmit` 无类型错误。

### Step 3 — `agent/tools/echo.ts`（关键校准点）

**创建 `backend/src/agent/tools/echo.ts`**。先按 design 草稿写，然后 `npx tsc --noEmit` 校准：
- `AgentTool` 继承 `Tool`，确认 `name` / `description` / `parameters` 是否为 `Tool` 必需字段
- 确认 `Type` 从哪里导出：`@earendil-works/pi-ai/base` 还是 `@earendil-works/pi-ai`
- 确认 `execute` 返回的 `content` 里 text 块的结构（`{ type: "text", text: string }` 还是别的）

**若类型对不上**：停下读 `types.d.ts` 实际定义，调整 echo 实现，记录偏差到 design.md（归档前补）。

**自检：** `npx tsc --noEmit` 通过。

### Step 4 — `agent/tools/index.ts`

**创建 `backend/src/agent/tools/index.ts`**：
```ts
import { echoTool } from "./echo.js";
export const allTools = [echoTool];
export { echoTool };
```

### Step 5 — `agent/index.ts`（关键校准点）

**创建 `backend/src/agent/index.ts`**。按 design 草稿写 `ask()`，然后 `npx tsc --noEmit` 校准：
- 确认 `Agent` 构造参数 `initialState` 的形态（`model` / `systemPrompt` / `tools` 字段名）
- 确认 `agent_end` 事件 `messages` 的类型，以及 assistant 消息 `content` 里 text 块的判别字段
- 确认 `prompt()` 签名（接受 string 还是 AgentMessage）

**若类型对不上**：停下读 `agent.d.ts` / `types.d.ts`，调整实现。

**自检：** `npx tsc --noEmit` 通过。

### Step 6 — `routes/agent.ts`

**创建 `backend/src/routes/agent.ts`**：按 design 第 3 节草稿。错误分类逻辑：
- 请求体非法 → 400
- 错误信息匹配 `/api key|unauthorized|401/i` → 503
- 其他 → 500

### Step 7 — 挂载到 `src/index.ts`

**修改 `backend/src/index.ts`**：import `agentRoute`，在 `new Hono().basePath("/api/v1")` 后 `.route("/", agentRoute)`。

**自检：** `cd backend && npm run dev`，后端启动无错。`curl http://localhost:3001/api/v1/health` 仍 200。

### Step 8 — `tests/agent.test.ts`（关键校准点）

**创建 `backend/tests/agent.test.ts`**。难点在 mock `streamFn`——需先搞清 `StreamFn` 签名和 `Agent` 如何接受 mock streamFn。

**调研子步**（执行时做）：
1. 读 `agent.d.ts` 确认 `AgentOptions.streamFn` 类型
2. 读 `types.d.ts` 确认 `StreamFn` 签名（输入输出）
3. 读 `pi-ai` 的 stream 事件类型，构造一个返回固定 `AssistantMessageEventStream` 的 mock

**测试用例**：
- 用例 A：mock streamFn 返回纯文本 assistant 消息 → `ask("你好")` 返回 `text` 非空
- 用例 B：mock streamFn 模拟 LLM 调 echo 工具（emit toolCall 事件 + 工具执行后继续 emit assistant 文本）→ 验证 echo execute 被调用 + 最终 text 含 echo 返回值
- 用例 C：mock streamFn 抛 "API key invalid" → `ask` reject 含该消息

**若 mock 构造过于复杂**（事件流协议难手搓）：降级为用例 A + C，用例 B 改为"调用 ask 时显式传 echoTool，mock streamFn 直接返回调用 echo 后的文本"——即不验证 agent loop 的工具调度，只验证 ask 能把工具传进去。降级时在 design.md 记录。

**自检：** `npm test` 全绿。

### Step 9 — 端到端验证

1. `npm test` 通过
2. `npm run lint` 通过（必要时 `npx biome check --fix`）
3. 启后端，验证 spec 场景 3（无需 key）：
   ```
   curl -s -w "\n%{http_code}\n" -X POST http://localhost:3001/api/v1/agent/ask \
     -H "Content-Type: application/json" -d '{}'
   # 期望: 400 + {"error":"message (string) is required"}
   ```
4. 若用户已配 `DEEPSEEK_API_KEY`：验证场景 1（真实调用），否则跳过并记录"待用户填 key 后手动验证"
5. `git status` 确认 `backend/data/*.db` 仍被忽略（启动会生成，不应被追踪）

## 2. 不在本计划内

- 业务工具（topic.ts / copy.ts）
- 流式 SSE
- 多轮对话 / session 持久化
- 真实 LLM 端到端自动化测试
- 前端 agent 页面

## 3. 回滚

- Step 1-7 失败：删 `backend/src/agent/` 或 `backend/src/routes/agent.ts` 重写
- Step 8 失败：删 `backend/tests/`，降级测试覆盖（见 Step 8 降级方案）
- 整体回滚：`git checkout version/v0.1 -- .`，feature 分支废弃重拉

## 4. 完成后

- `git add -A && git commit -m "feat: integrate pi-agent-core with DeepSeek v4 pro + echo tool"`
- 进入 `/opsx:archive` 归档变更
- 读 `git config --get branch.feature/integrate-pi-agent.parent` → merge 回 `version/v0.1`
- 勾选 `spec/tasks.md` 对应 task
- 追加 `spec/devlog.md`（注明父分支名 + 关键校准记录）
