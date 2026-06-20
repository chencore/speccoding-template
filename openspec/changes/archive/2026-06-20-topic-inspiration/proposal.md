# Proposal: topic-inspiration

> v0.1 第三个 task，实现选题环节：AI 选题灵感生成 + 历史数据导入，是首个业务功能。

---

## 是什么（What）

实现选题工作台的选题生成与历史导入能力：

- **AI 选题生成**：基于种子词（必填）+ 频道描述（选填，一次性配置）+ 历史导入数据（自动带），调用 DeepSeek v4 pro 生成多条选题；每条含 `title` + `rationale`（推荐理由）
- **历史数据导入**：支持粘贴文本和 CSV 文件上传两种方式；schema 为 `title, views`；导入数据存入新表 `imported_videos`
- **选题列表**：持久化到 `topics` 表，支持查看历史生成、标记采用/弃用
- **前端最小工作台页**：一个页面串联"输入种子词→生成→列表展示→标记采用"

## 为什么（Why）

选题是内容创作的起点，也是 AI 提效价值最高的环节之一。本 task 让"给种子词出选题"从零跑通，验证 AI 生成质量与历史数据参考价值，为下个 task `copy-generation`（基于选题出文案）提供输入。

**本变更依赖** `setup-project-scaffold`（骨架）+ `integrate-pi-agent`（AgentService）；**是** `copy-generation` 的前置（copy 需要 topic_id）。

## 范围（Scope）

### 包含
- 新表 `imported_videos`：`id, title, views, imported_at`
- `topics` 表沿用既有 schema（seed/title/rationale/status/created_at）
- 后端 API：
  - `POST /api/v1/topics/generate` — body `{ seeds: string[], count?: number }`，调 AgentService 生成选题并写入 topics 表
  - `POST /api/v1/topics/import` — 接受粘贴文本或 CSV 文件，解析 `title, views` 写入 imported_videos
  - `GET /api/v1/topics` — 列表（含分页/状态筛选）
  - `PATCH /api/v1/topics/:id` — 更新 status（adopted/discarded/pending）
  - `GET /api/v1/imported-videos` — 列出已导入历史数据
  - `DELETE /api/v1/imported-videos` — 清空（重新导入用）
- 频道描述：存配置文件或单独表 `channel_config`（单条记录），生成时读取注入 prompt
- 前端最小页：`/topics` 页面
  - 顶部：种子词输入（多输入框或逗号分隔）+ 生成数量选择（5/10/20，默认10）+ 生成按钮
  - 频道描述配置入口（弹窗或折叠区）
  - 历史导入入口（粘贴框 + 文件上传）
  - 选题列表：展示 title + rationale + status，支持标记采用/弃用
- prompt 设计：种子词 + 频道描述 + 历史标题（含 views 排序）→ 要求生成 N 条不重复、贴合频道调性的选题，每条带 rationale

### 不包含（明确排除）
- 文案生成（留下个 task `copy-generation`）
- 选题编辑（只生成 + 标记状态，不编辑 title/rationale）
- 选题分类/标签/搜索
- 多轮对话式选题打磨
- 流式响应（v0.1 非流式）
- YouTube API 自动抓取（留 v0.2）
- 真实 LLM 端到端自动化测试（用 mock + 手动验证）

## 成功标准

- [ ] `POST /topics/generate` 在配了 key 时返回 N 条选题（每条 title 非空 + rationale 非空），并持久化
- [ ] 未配 key 时返回 503（复用 integrate-pi-agent 的错误处理）
- [ ] `POST /topics/import` 支持粘贴文本（每行一条 `title,views` 或纯 title）和 CSV 文件，解析后写入 imported_videos
- [ ] 导入数据异常行（如 views 非数字）跳过并返回跳过数，不整体失败
- [ ] `GET /topics` 返回列表，支持 `?status=` 筛选
- [ ] `PATCH /topics/:id` 能切换 status
- [ ] 前端 `/topics` 页能完成"输入种子词→生成→看到列表→标记采用"全流程
- [ ] 频道描述配置后，后续生成自动带上
- [ ] `npm test` 通过（mock AgentService 测生成逻辑 + CSV 解析单测）
- [ ] `npm run lint` 通过
