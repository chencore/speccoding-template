# Design

> **维护规则**：本文件是**项目整体设计与架构决策**，仅在人工明确要求时修改。AI 不得擅自更新。

---

## 1. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端 | Next.js (App Router) + TypeScript | 单人工作台、迭代快；TS 全栈统一语言 `[v0.1 新增]` |
| 后端 | Node.js + Hono + TypeScript | 轻量、TS 原生；可直接 `import` pi-agent-core 库 `[v0.1 新增]` |
| 数据库 | SQLite (better-sqlite3) | 本地文件、零运维、单人无并发压力；后期可换 Postgres `[v0.1 新增]` |
| AI 框架 | `@earendil-works/pi-agent-core` + `pi-ai` | 库集成（非子进程），统一 LLM 接口，自定义工具注册 `[v0.1 新增]` |
| LLM | 默认 DeepSeek v4 pro，多家混用可切换 | 经 pi-ai 抽象，不锁死供应商 `[v0.1 新增]` |
| 部署 | 本地 `npm run dev` | v0.1 不上云 `[v0.1 新增]` |

## 2. 系统架构

```
[ Next.js 前端 (浏览器) ]
        │  HTTP
        ▼
[ Hono 后端 API ]
        │
        ├──→ [ pi-agent-core 运行时 ]  ← 注册自定义工具
        │         │
        │         ▼
        │    [ pi-ai → DeepSeek v4 pro / 其他 ]
        │
        └──→ [ SQLite (topics / copies / copy_versions) ]
```

## 3. 模块划分

- **topic** — 选题灵感生成、历史数据导入
- **copy** — 文案生成（标题/描述/标签）、多版本对比、采用标记
- **agent** — pi-agent-core 封装、自定义工具注册、LLM 供应商切换
- **persistence** — SQLite 三表读写、历史记录查询

## 4. 数据模型（核心实体）

### topics
- `id`, `seed`(种子词/导入来源), `title`(选题标题), `rationale`(AI 推荐理由), `status`(待用/采用/弃用), `created_at`

### copies
- `id`, `topic_id`(关联选题), `type`(title/description/tags), `adopted_version_id`(当前采用版本), `created_at`

### copy_versions
- `id`, `copy_id`, `version_no`, `content`, `is_adopted`, `created_at`

## 5. 关键接口约定

- **鉴权**：v0.1 无鉴权（单人本地）；预留中间位以便后续加
- **错误码**：HTTP 标准状态码 + `{ error: string }` body
- **版本化**：API 前缀 `/api/v1`

## 6. 关键决策与权衡

### 决策 1：pi 库集成 vs 子进程 `[v0.1 新增]`
- **选择**：库集成（`import pi-agent-core`）
- **放弃的方案**：spawn `pi-coding-agent` CLI 走 stdio
- **理由**：后端 Node/TS 原生兼容；交互更直接；自定义工具注册更顺；隔离性损失可接受（单人本地）

### 决策 2：深切片 v0.1 只做选题+文案 `[v0.1 新增]`
- **选择**：1-2 环节做深
- **放弃的方案**：六环节各做 MVP 串联
- **理由**：单人项目工期有限；选题+文案 AI 加持价值最高且无重资产依赖；音视频处理放后续降低技术风险

### 决策 3：DeepSeek v4 pro 默认 + 多家可切换 `[v0.1 新增]`
- **选择**：经 pi-ai 抽象，默认 DeepSeek v4 pro
- **放弃的方案**：锁单一供应商
- **理由**：不同环节可能用不同模型更优；pi-ai 抽象使切换成本趋零

## 7. 待定项（Open Questions）

- **pi-ai 是否原生支持 DeepSeek**：若不原生，走 OpenAI 兼容 API 接入。留到 design 阶段（首个 openspec 变更）验证，不阻塞 kickoff。
- **历史数据导入的 CSV schema**：字段需对齐 YouTube 频道后台导出格式，首个涉及导入的变更再定。
