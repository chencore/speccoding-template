# Proposal: copy-generation

> v0.1 第四个 task，实现文案环节：基于选题生成 YouTube 标题/描述/标签，支持多版本 A/B 与改写迭代。

---

## 是什么（What）

实现文案工作台的生成、改写、采用能力：

- **一次生成三类文案**：选定 topic 后一键生成 标题 5 版本 + 描述 2 版本 + 标签 1 版本
- **改写迭代**：基于某个已有版本 + 改写指令（如"更口语化""再短一点"）生成新版本，追加到该 copy 的版本列表
- **采用机制**：同一 copy 同时只能有一个 adopted 版本；点"采用"切换
- **前端 topic 详情页** `/topics/:id`：展示选题 + 文案区（三类各自版本列表 + 生成/改写/采用操作）

## 为什么（Why）

文案是 YouTube CTR 的关键（标题决定点击、描述影响搜索/推荐、标签利于检索）。v0.1 选题已能生成，文案把"选题→可发布文案"打通，完成 v0.1 深切片"选题+文案"闭环。

**本变更依赖** `topic-inspiration`（topic 数据 + AgentService + channel_config）；是 v0.1 最后一个业务 task。

## 范围（Scope）

### 包含
- 复用既有 `copies` + `copy_versions` 表（无 schema 变更）
- 后端 API：
  - `POST /api/v1/topics/:id/copies/generate` — 一次生成三类（标题5/描述2/标签1），写入 copies + copy_versions
  - `POST /api/v1/copies/:copyId/rewrite` — body `{ sourceVersionId, instruction }`，基于某版本改写，生成新版本追加
  - `GET /api/v1/topics/:id/copies` — 列出该 topic 下所有 copies 及各自 versions（含 adopted 标记）
  - `PATCH /api/v1/copies/:copyId/adopt` — body `{ versionId }`，切换 adopted 版本
- prompt 设计：
  - 生成 prompt：topic.title + topic.rationale + channel_description + 三类各自要求（标题 5 版吸睛 / 描述 2 版 200-500 字 / 标签 1 版逗号分隔）+ 严格 JSON 输出
  - 改写 prompt：原文 + 改写指令 + 要求保持文案类型 + 输出纯文本（单版本）
- 前端 `/topics/:id` 页：
  - 顶部：topic 信息（title/rationale/status）
  - 文案区：三块（标题/描述/标签），每块显示版本列表，每个版本卡片有"采用/改写"按钮 + adopted 高亮
  - 顶部"生成文案"按钮（首次或补充生成）
  - 改写交互：点版本"改写"→ 弹出指令输入框 → 提交生成新版本

### 不包含（明确排除）
- 选题生成（已 `topic-inspiration` 完成）
- 封面文字、口播全文（留 v0.2 脚本环节）
- 文案版本删除（v0.1 只增不删，避免误删；留下个版本）
- 文案版本编辑（只能生成新版本，不能手改 content）
- 多轮对话式改写（每次改写是独立单轮）
- 流式响应
- 真实 LLM 端到端自动化测试

## 成功标准

- [ ] `POST /topics/:id/copies/generate` 在配 key 时返回三类文案（标题5+描述2+标签1 共 8 版本），持久化到 copies + copy_versions
- [ ] 未配 key 返回 503，AI 输出非 JSON 返回 502
- [ ] `POST /copies/:copyId/rewrite` 基于某版本 + 指令生成新版本，version_no 自增
- [ ] `GET /topics/:id/copies` 返回三类 copies，每类含所有 versions，adopted 版本有标记
- [ ] `PATCH /copies/:copyId/adopt` 切换 adopted：新版本 is_adopted=1，同 copy 其他版本 is_adopted=0，copies.adopted_version_id 更新
- [ ] 前端 `/topics/:id` 能完成"生成→查看版本→采用某版→改写→看到新版本"全流程
- [ ] `npm test` 通过（mock ask 测生成解析 + 改写 + 采用切换）
- [ ] `npm run lint` 通过
