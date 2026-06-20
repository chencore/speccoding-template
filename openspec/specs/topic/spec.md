# Spec: topic

> 场景式规格。选题生成与历史导入的具体行为。

---

## 场景 1：生成选题（配了 key + 有历史数据）

**Given** `DEEPSEEK_API_KEY` 已配置，已导入 5 条历史视频，频道描述已设
**When** `POST /api/v1/topics/generate` body `{"seeds":["AI编程"],"count":5}`
**Then** 返回 200，`topics` 数组含 5 条，每条 `title` 和 `rationale` 非空，`status` 为 `pending`；`topics` 表新增 5 条记录

## 场景 2：生成选题（无 key）

**Given** `DEEPSEEK_API_KEY` 未配置
**When** `POST /api/v1/topics/generate` body `{"seeds":["AI编程"]}`
**Then** 返回 503，body 含 `{"error":"LLM 调用失败，请检查 API key 配置"}`

## 场景 3：生成选题（seeds 为空）

**Given** 任意环境
**When** `POST /api/v1/topics/generate` body `{"seeds":[]}`
**Then** 返回 400，body 含 `{"error":"seeds 不能为空"}`

## 场景 4：AI 输出非合法 JSON

**Given** mock AgentService 返回含 markdown 代码块的 JSON
**When** 调用生成逻辑
**Then** strip 代码块标记后能正常解析（mock 测试覆盖）；若仍解析失败返回 502 + 原始文本

## 场景 5：导入粘贴文本（纯标题）

**Given** 任意环境
**When** `POST /api/v1/topics/import` body `{"text":"如何用 AI 写代码\n独立开发者的日常"}`
**Then** 返回 200，`{"imported":2,"skipped":0}`；`imported_videos` 表新增 2 条，`views` 为 null

## 场景 6：导入粘贴文本（title,views 格式）

**Given** 任意环境
**When** `POST /api/v1/topics/import` body `{"text":"AI 编程入门,1200\n独立开发工具盘点,800"}`
**Then** 返回 200，`{"imported":2,"skipped":0}`；`imported_videos` 表新增 2 条，`views` 分别为 1200 和 800

## 场景 7：导入 CSV 文件（带表头）

**Given** 任意环境
**When** `POST /api/v1/topics/import` 上传 CSV 文件，首行 `title,views`，后续 3 行数据
**Then** 返回 200，`{"imported":3,"skipped":0}`；表头被跳过

## 场景 8：导入含异常行

**Given** 任意环境
**When** 导入文本含一行 views 非数字（如 `标题,abc`）
**Then** 该行跳过（views 置 null 或整行跳过——设计选前者，保留 title），返回 `{"imported":N,"skipped":1}`，不整体失败

## 场景 9：选题列表与筛选

**Given** topics 表有 pending 3 条、adopted 2 条、discarded 1 条
**When** `GET /api/v1/topics?status=adopted`
**Then** 返回 2 条 status=adopted 的记录

## 场景 10：更新选题状态

**Given** 存在 id=1 的 pending 选题
**When** `PATCH /api/v1/topics/1` body `{"status":"adopted"}`
**Then** 返回 200，`{"id":1,"status":"adopted"}`；DB 中该记录 status 更新

## 场景 11：更新选题状态（非法值）

**Given** 任意环境
**When** `PATCH /api/v1/topics/1` body `{"status":"xxx"}`
**Then** 返回 400

## 场景 12：频道描述配置

**Given** channel_config 为空
**When** `PUT /api/v1/channel-config` body `{"channel_description":"关于 AI 编程与独立开发"}`
**Then** 返回 200；后续 `GET /api/v1/channel-config` 返回该值；下次生成选题自动带上

## 场景 13：清空导入数据

**Given** imported_videos 有 15 条
**When** `DELETE /api/v1/imported-videos`
**Then** 返回 200 `{"deleted":15}`；表清空

## 场景 14：前端工作台全流程

**Given** 后端运行，已配 key
**When** 用户在 `/topics` 页：输入种子词 → 点生成 → 看到选题列表 → 点"采用"标记一条
**Then** 列表实时更新，该选题 status 变为 adopted

## 场景 15：测试与 lint

**Given** 任意环境
**When** 运行 `npm test` 和 `npm run lint`
**Then** 均通过（测试用 mock AgentService + CSV 解析单测，不依赖真实 key）
