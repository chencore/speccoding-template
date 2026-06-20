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
