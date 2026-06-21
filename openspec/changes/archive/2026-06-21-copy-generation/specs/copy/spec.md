# Spec: copy

> 场景式规格。文案生成、改写、采用的具体行为。

---

## 场景 1：生成文案（配 key）

**Given** `DEEPSEEK_API_KEY` 已配置，存在 id=1 的 topic
**When** `POST /api/v1/topics/1/copies/generate`
**Then** 返回 200，`copies` 含 3 条（type=title/description/tags），title 的 versions 有 5 条，description 有 2 条，tags 有 1 条；所有 version 的 `is_adopted` 为 0；DB 中 copies 表新增 3 条、copy_versions 表新增 8 条

## 场景 2：生成文案（无 key）

**Given** `DEEPSEEK_API_KEY` 未配置
**When** `POST /api/v1/topics/1/copies/generate`
**Then** 返回 503，body 含 `{"error":"LLM 调用失败，请检查 API key 配置"}`

## 场景 3：生成文案（topic 不存在）

**Given** 任意环境
**When** `POST /api/v1/topics/999/copies/generate`
**Then** 返回 404

## 场景 4：AI 输出非合法 JSON

**Given** mock ask 返回非 JSON 文本
**When** 调用生成逻辑
**Then** 抛 CopyGenerateError，路由返 502 + 原文

## 场景 5：AI 输出字段缺失（如 titles 只有 3 个）

**Given** mock ask 返回 `{"titles":["t1","t2","t3"],"descriptions":["d1"],"tags":"a,b"}`
**When** 调用生成逻辑
**Then** 不整体失败，按实际返回数量创建 versions（title 3 条、description 1 条、tags 1 条）

## 场景 6：改写版本

**Given** copy_id=1 存在，其下有 version_no=1 的版本，content="原标题"
**When** `POST /api/v1/copies/1/rewrite` body `{"sourceVersionId":1,"instruction":"更口语化"}`
**Then** 返回 200，新版本 version_no=2，is_adopted=0；DB 新增一条 copy_versions

## 场景 7：改写（copy 不存在）

**Given** 任意环境
**When** `POST /api/v1/copies/999/rewrite` body `{"sourceVersionId":1,"instruction":"x"}`
**Then** 返回 404

## 场景 8：改写（source version 不属于该 copy）

**Given** copy_id=1，sourceVersionId 指向 copy_id=2 的版本
**When** 改写
**Then** 返回 400

## 场景 9：列出 topic 的文案

**Given** topic 1 下有 3 条 copies，每条若干 versions
**When** `GET /api/v1/topics/1/copies`
**Then** 返回 200，结构含 copies 数组，每条含 versions 数组

## 场景 10：采用版本

**Given** copy_id=1 有 version 1 和 2，都 is_adopted=0
**When** `PATCH /api/v1/copies/1/adopt` body `{"versionId":1}`
**Then** 返回 200，version 1 的 is_adopted=1，copies.adopted_version_id=1

## 场景 11：采用切换（从 v1 切到 v2）

**Given** copy_id=1 已 adopted version 1
**When** `PATCH /api/v1/copies/1/adopt` body `{"versionId":2}`
**Then** version 1 is_adopted=0，version 2 is_adopted=1，copies.adopted_version_id=2

## 场景 12：采用（version 不属于该 copy）

**Given** copy_id=1，versionId 指向 copy_id=2 的版本
**When** `PATCH /api/v1/copies/1/adopt` body `{"versionId":<other_copy_version>}`
**Then** 返回 400

## 场景 13：前端详情页全流程

**Given** 后端运行，已配 key，存在一个 topic
**When** 用户在 `/topics/1` 页：点"生成文案"→ 看到三类版本列表 → 点某标题"采用" → 点某标题"改写"输入指令 → 看到新版本
**Then** 列表实时更新，adopted 版本高亮

## 场景 14：测试与 lint

**Given** 任意环境
**When** 运行 `npm test` 和 `npm run lint`
**Then** 均通过（mock ask 测生成/改写/采用，不依赖真实 key）
