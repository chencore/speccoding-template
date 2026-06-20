# Development Log

> **维护规则**：每次 PR 合并后，由 AI 自动追加一条记录。
>
> 每条记录应包含：日期、变更名、摘要、关键决策/坑点。

---

## Entry Template

```markdown
### YYYY-MM-DD · <change-name>

**摘要**：一句话说清楚这次变更做了什么。

**关键决策**：
- 决策点 1 — 选了什么、放弃了什么、为什么
- 决策点 2 — ...

**踩坑 / 经验**：
- 坑点描述 + 如何解决（可选）

**相关产出**：
- 归档位置：`openspec/changes/archive/<change-name>/`
- PR：#xxx（如适用）
```

---

## Log Entries

<!-- 最新条目在最上面 -->

### 2026-06-20 · integrate-pi-agent

**摘要**：集成 pi-agent-core + pi-ai，封装 `AgentService`（默认 DeepSeek v4 pro），实现 echo demo 工具 + `/api/v1/agent/ask`，为后续选题/文案业务模块提供 AI 底座。

**关键决策**：
- pi-ai 原生支持 DeepSeek——`getModel("deepseek","deepseek-v4-pro")` 直接取，env 变量 `DEEPSEEK_API_KEY` 自动读取（消除 kickoff 待定项）
- 每请求新建 Agent（无状态），非流式响应——v0.1 单轮场景足够
- AgentTool 需显式传 `<TParameters, TDetails>` 泛型 + execute params 标注 `Static<TParameters>` 类型，否则推断 unknown
- 无 key 时 agent 不抛异常而是返回 `stopReason:"error"` + `errorMessage` 的消息——`ask()` 主动检测并抛错，路由层转 503
- 测试降级：原计划 mock streamFn，但 `AssistantMessageEventStream` 子路径未在 pi-ai exports 暴露；降级为直接测 echo.execute + 测无 key 时 ask 抛错

**踩坑 / 经验**：
- pi-ai 的 `./utils/event-stream` 子路径有 types 但运行时 exports 不暴露——不能直接 `import` 构造 mock EventStream
- Biome 的 `noDelete` 规则禁用 `delete` 操作符，测试改用 `vi.stubEnv`
- `npx biome check --fix` 只修安全 fix，`organizeImports` 部分需 `--unsafe`

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-06-20-integrate-pi-agent/`
- 主规格同步：`openspec/specs/agent/spec.md`（新建）
- 父分支：`version/v0.1`
- `spec/design.md` 待定项"pi-ai 是否原生支持 DeepSeek"已消除
- 待验证：用户填 `DEEPSEEK_API_KEY` 后手动 curl `/api/v1/agent/ask` 验证真实调用

### 2026-06-20 · setup-project-scaffold

**摘要**：搭建前后端可运行骨架（Next.js 15 + Hono + SQLite），v0.1 第一个 task 落地，为后续 pi-agent 集成与业务功能提供地基。

**关键决策**：
- 前后端各自 package.json + 根 concurrently 编排，不引 pnpm workspace
- better-sqlite3 + 手写 SQL，不上 ORM
- Biome 一体化（与 pi 生态对齐），放弃 ESLint+Prettier
- SQLite 文件落 `backend/data/app.db`，`.gitignore` 补 db 规则
- ESM 后端（`type: module` + `.js` 扩展名 import）

**踩坑 / 经验**：
- macOS 无 `timeout` 命令，验证 dev server 改用后台启动 + `pkill`
- Biome 的 `organizeImports` 属 linter，`biome format --write` 不修，需 `biome check --fix`
- Next.js 15 首次启动会自动给 tsconfig 加 `isolatedModules: true`（正常行为）

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-06-20-setup-project-scaffold/`
- 主规格同步：`openspec/specs/scaffold/spec.md`（新建）
- 父分支：`version/v0.1`
- 健康检查：`GET http://localhost:3001/api/v1/health` → `{"status":"ok","db":"connected",...}`

### 2026-06-20 · v0.1 kickoff

**摘要**：版本 v0.1 首次 kickoff，确立深切片范围（选题+文案）、pi 库集成方式、DeepSeek v4 pro 默认 LLM。

**关键决策**：
- 深切片策略 — v0.1 只做"选题+文案"两个环节做深，其余环节留后续版本
- pi 库集成 — `import pi-agent-core`，非子进程；后端选 Node/Hono 以兼容 TS 生态
- DeepSeek v4 pro 默认 + pi-ai 多家可切换 — 不锁供应商
- 数据持久化 — SQLite 三表（topics/copies/copy_versions），为将来数据分析环节留数据

**相关产出**：
- `spec/requirements.md`：新增 8 条需求（R-v0.1-ck-1 ~ R-v0.1-ck-8）
- `spec/tasks.md`：新增 `## 版本 v0.1` 块，拆 5 个 task
- `spec/design.md`：技术栈表、架构图、三表数据模型、3 条关键决策
- 分支：`version/v0.1`（从 main 创建）

### 2026-04-16 · bootstrap-speccoding-template

**摘要**：从 SpecCoding Template 初始化项目骨架。

**关键决策**：
- 采用「两级 Spec 体系」：`spec/` 管全局、`openspec/` 管单次变更
- 开发工作流固化为七阶段：git branch → scaffold → brainstorm → plan → execute → archive → merge

**相关产出**：
- 项目级 spec 文档骨架（requirements / design / tasks / devlog / structure）
- OpenSpec 配置 + 示例归档变更 `example-add-user-auth`
