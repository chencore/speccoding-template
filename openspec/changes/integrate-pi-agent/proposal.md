# Proposal: integrate-pi-agent

> v0.1 第二个 task，集成 pi 智能体框架，为后续业务模块（选题/文案）提供 AI 能力底座。

---

## 是什么（What）

集成 `@earendil-works/pi-agent-core` + `@earendil-works/pi-ai`，封装一个可被业务模块调用的 `AgentService`：

- **模型层**：默认 `deepseek-v4-pro`（pi-ai 原生预置），提供切换函数预留多家混用
- **Agent 封装**：`AgentService` 封装"取模型 → 创建 Agent → 注册工具 → 跑对话"全流程，每请求新建（无状态）
- **工具目录约定**：`backend/src/agent/tools/` 目录 + 注册汇总机制，本 task 实现 `echo` demo 工具验证链路，业务工具（topic/copy）留下个 task 填
- **API key**：依赖 pi-ai 自动读环境变量（`DEEPSEEK_API_KEY` 等），不在代码层显式注入
- **响应方式**：非流式（`prompt` + `waitForIdle`）
- **验证 API**：`POST /api/v1/agent/ask`，body `{ message: string }`，返回 agent 最终回复文本
- **测试**：用 mock streamFn 做单元测试（不依赖真实 API key），端到端真机验证留到用户填 key 后

## 为什么（Why）

后续 `topic-inspiration` 和 `copy-generation` 两个 task 都需要调 LLM。若每个 task 各自直连 pi-ai，会出现：模型获取散落、工具注册重复、错误处理不一致。本 task 把这些收敛到 `AgentService`，让业务 task 只关心"注册什么工具、发什么 prompt"。

**本变更是 `topic-inspiration` / `copy-generation` 的前置依赖。**

## 范围（Scope）

### 包含
- `backend/src/agent/models.ts`：模型获取封装，默认 `deepseek-v4-pro`，预留 `getModelByProvider(provider, modelId)` 切换函数
- `backend/src/agent/index.ts`：`AgentService` 封装（`ask(message, tools?)` 接口，每请求新建 Agent，非流式）
- `backend/src/agent/tools/echo.ts`：demo 工具，参数 `{ message: string }`，返回该 message
- `backend/src/agent/tools/index.ts`：工具注册汇总
- `backend/src/routes/agent.ts`：`POST /api/v1/agent/ask`
- 单元测试：`AgentService` 用 mock streamFn 验证 prompt→response 链路、echo 工具被调用
- 依赖：`@earendil-works/pi-ai` + `@earendil-works/pi-agent-core` 已装（调研时安装）

### 不包含（明确排除）
- 业务工具实现（`topic.ts` / `copy.ts` 留对应业务 task）
- 流式 SSE 响应（留后续版本）
- 多轮对话 / session 持久化（v0.1 单轮）
- 真实 LLM 端到端测试（用户填 key 后手动验证，代码层用 mock）
- API key 管理 UI / 密钥加密存储
- 前端 agent 交互页面（本 task 仅后端 API）

## 成功标准

- [ ] `npm test` 通过（mock 单元测试）
- [ ] `curl -X POST http://localhost:3001/api/v1/agent/ask -d '{"message":"你好"}'` 在配了 `DEEPSEEK_API_KEY` 时返回非空文本
- [ ] 未配 key 时返回明确错误（非 500 崩溃，而是 503 + 提示）
- [ ] `echo` 工具能被 agent 调用（mock 测试覆盖：agent 收到"请 echo hello"时调用 echo 工具并返回 "hello"）
- [ ] `npm run lint` 通过
- [ ] 父分支 `version/v0.1` 上无破坏
