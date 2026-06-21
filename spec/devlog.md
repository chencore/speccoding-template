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

### 2026-06-21 · topic-library

**摘要**：实现选题库——已采纳选题自动进入选题库，由 AI 按预设类型分类，历史记录页升级为按类型分组浏览、筛选、手动修正、一键补分类。

**关键决策**：
- 分类存在 `topics.category` 单字段，不新建 category 表——单人工具、分类固定且少，单字段更简单
- 分类在采纳时触发，不在生成时触发——避免对弃用选题浪费 token，分类价值在采纳后更高
- 预设 7 个分类 + 手动修正，不做自定义分类 CRUD——v0.1 保持简单
- 旧 adopted 选题保留 category = NULL，页面显示「未分类」并提供「自动分类」按钮补打标签
- `/history` 直接升级为选题库，不新增独立页面——历史记录与选题库在用户心智上重合

**踩坑 / 经验**：
- 已有数据库需要加列：schema.sql 更新后，`initDb` 里用 `PRAGMA table_info(topics)` 检测并 `ALTER TABLE ADD COLUMN` 做兼容迁移
- `updateTopicStatus` 原为同步，因采纳时要异步调用 AI，改为 async；所有调用点（仅路由）同步 await
- Biome `organizeImports` 需 `biome check --fix --unsafe` 才能自动排序

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-06-21-topic-library/`
- 父分支：`version/v0.1`
- 新增模块：`backend/src/topic/classify.ts`、前端 `/history` 页升级
- 测试：`backend/tests/topic-library.test.ts` 8 例全过；端到端 46 例全过

---

### 2026-06-21 · copy-generation

**摘要**：实现文案环节——基于选题一键生成 YouTube 标题（5 版）/ 描述（2 版）/ 标签（1 版），支持版本改写迭代与采用切换，前端 `/topics/:id` 详情页承载生成、查看、采用、改写全流程。

**关键决策**：
- 一次生成三类而非分类生成：标题、描述、标签相互关联，单 prompt 输出 JSON 更连贯
- 版本数差异化：标题 5 版（CTR 核心）、描述 2 版、标签 1 版，避免无意义膨胀
- 初始版本不自动 adopted：强制用户做 A/B 决策，符合"多版本对比"意图
- 改写输出纯文本非 JSON：单版本场景下 JSON 反而增加解析失败率
- 采用事务化：同 copy 全版本清 adopted + 目标版本标 adopted + 更新 copies.adopted_version_id
- 复用既有 `copies` + `copy_versions` 表，无 schema 变更

**踩坑 / 经验**：
- `npm -C backend run dev` 会切换后端 cwd，导致 `dotenv/config` 加载不到根目录 `.env`——改 `config.ts` 显式从 `__dirname/../../.env` 加载
- 前端调后端触发 CORS 预检（OPTIONS），Hono 默认不处理——加 `hono/cors` 中间件
- Biome `noNonNullAssertion` 规则禁用 `!`：测试里用 `findCopy`/`findVersion` 辅助函数替代
- Next.js 弹窗遮罩触发 `useKeyWithClickEvents` / `useSemanticElements`：用 `biome-ignore` 注释处理简单 modal 场景

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-06-21-copy-generation/`
- 主规格同步：`openspec/specs/copy/spec.md`（新建）
- 父分支：`version/v0.1`
- 新增模块：`backend/src/copy/*`、`backend/src/routes/copy.ts`、`frontend/app/topics/[id]/page.tsx`
- 测试：`backend/tests/copy.test.ts` 20 例全过

---

### 2026-06-20 · topic-inspiration

**摘要**：实现选题环节——AI 选题生成（种子词 + 频道描述 + 历史数据）、历史导入（粘贴/CSV）、选题工作台前端页，v0.1 首个业务功能闭环。

**关键决策**：
- 纯 prompt 不用工具：历史数据直接塞进 prompt，不注册 `list_imported_videos` 工具——选题是单轮生成，工具调用增不确定性
- AI 严格输出 JSON 数组，后端 `JSON.parse` + strip markdown 代码块；解析失败返 502 + 原文
- 新建 `imported_videos` 表而非复用 `topics`——导入数据是参考素材非选题产物，语义不同（已提升到 spec/design.md）
- `channel_config` 用 key-value 单表——单一字段建整表过重，可扩展
- CSV 手写解析（split + strip 引号），不引库；schema 固定 `title,views` 两列
- 前端原生 HTML + 内联样式，不引 UI 库

**踩坑 / 经验**：
- better-sqlite3 的 `.get(undefined)` 会抛 "Too many parameter values"——无参数查询时不能传 undefined，需分支调用
- Hono multipart 用 `c.req.parseBody()`，返回的 `body.file` 是 `File` 实例（非 Buffer），需 `await file.arrayBuffer()` 再转
- Next.js 会在 frontend 下生成 `tsconfig.tsbuildinfo`，需补 gitignore
- `vi.mock` 路径要用相对路径 + `.js` 扩展（与 ESM import 一致）

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-06-20-topic-inspiration/`
- 主规格同步：`openspec/specs/topic/spec.md`（新建）
- `spec/design.md` 第 4 节追加 `imported_videos` + `channel_config` 两表
- 父分支：`version/v0.1`
- 待验证：用户填 `DEEPSEEK_API_KEY` 后真实生成选题

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
