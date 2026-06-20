# Spec: agent

> 场景式规格。描述 pi-agent 集成层的具体行为。

---

## 场景 1：纯文本对话（配了 API key）

**Given** 环境变量 `DEEPSEEK_API_KEY` 已配置且有效
**When** 发起 `POST http://localhost:3001/api/v1/agent/ask`，body `{"message":"用一句话介绍自己"}`
**Then** 返回 HTTP 200，body `{"text":"<非空字符串>"}`，text 是 DeepSeek 的真实回复

## 场景 2：未配置 API key

**Given** 环境变量 `DEEPSEEK_API_KEY` 未配置或无效
**When** 发起 `POST /api/v1/agent/ask`，body `{"message":"你好"}`
**Then** 返回 HTTP 503，body 含 `{"error":"LLM 调用失败，请检查 API key 配置","detail":"..."}`，不返回 500

## 场景 3：请求体非法

**Given** 任意环境
**When** 发起 `POST /api/v1/agent/ask`，body 为 `{}` 或非 JSON
**Then** 返回 HTTP 400，body `{"error":"message (string) is required"}`

## 场景 4：自定义工具被调用（mock 测试覆盖）

**Given** AgentService 注册了 `echo` 工具
**When** mock streamFn 模拟 LLM 决定调用 `echo({ message: "hello" })`
**Then**
- `echo` 工具的 `execute` 被调用一次，参数 `{ message: "hello" }`
- 最终返回的 `text` 含 "hello"

## 场景 5：工具列表可扩展

**Given** 后续 task 在 `backend/src/agent/tools/` 新增 `topic.ts` 并在 `tools/index.ts` 导出
**When** `ask()` 被调用时未显式传 `tools`
**Then** 新工具自动可用（通过 `allTools` 汇总），无需改 `AgentService`

## 场景 6：模型切换预留

**Given** 调用方需要用非默认模型
**When** 调用 `getModelByProvider("anthropic", "claude-sonnet-4-6")` 拿到 model 对象
**Then** 该 model 可用于构造 Agent（虽然 `ask()` 默认用 deepseek-v4-pro，但接口预留了切换路径）

## 场景 7：测试不依赖真实 key

**Given** 无 `DEEPSEEK_API_KEY` 环境变量
**When** 运行 `npm test`
**Then** 所有测试通过（用 mock streamFn，不发起真实网络请求）

## 场景 8：lint 通过

**Given** 任意源文件
**When** 运行 `npm run lint`
**Then** Biome 无报错退出
