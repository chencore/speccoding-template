# Tasks

> **维护规则**：
> - **任务内容**由人工维护，仅在人工明确要求时修改
> - **任务完成状态**由 AI 在对应 openspec 变更归档后自动勾选
>
> 每个任务对应 `openspec/changes/<task-name>/` 下的一个变更提案。

---

## 命名约定

- 任务名使用 **kebab-case**：`add-user-auth`、`implement-payment-flow`
- 粒度：**一个提案能做完的事情**（通常 1~3 天工作量）
- 尽量独立：减少任务间依赖，便于并行推进

---

## 版本 v0.1

- [x] **setup-project-scaffold** — 前后端骨架（Next.js + Hono）、SQLite 初始化、环境变量
- [x] **integrate-pi-agent** — pi-agent-core + pi-ai 集成，DeepSeek v4 pro 默认配置，自定义工具注册框架
- [x] **topic-inspiration** — 选题灵感生成（AI）+ 历史数据导入（CSV/粘贴）
- [x] **copy-generation** — 文案生成（标题/描述/标签，多版本 A/B）
- [x] **persistence-and-history** — SQLite 三表 + 历史记录/版本对比/采用标记 UI

---

## 进度概览

- 当前版本：v0.1
- 总任务数：5
- 已完成：3
- 进行中：0
