# Plan: topic-library

> 执行计划，按顺序完成。

---

## 第 1 步：数据库变更

修改 `backend/src/db/schema.sql`：
- 给 `topics` 表新增 `category TEXT`

由于 better-sqlite3 不支持在线 ALTER 添加列到已有表？实际上 SQLite 支持 `ALTER TABLE ADD COLUMN`。但 schema.sql 只会在 initDb 时执行。如果用户已有数据库，`initDb` 执行的 `CREATE TABLE IF NOT EXISTS` 不会更新表结构。需要处理迁移：
- 在 schema.sql 中创建新表时包含 category
- 在 `initDb` 中检测列是否存在，不存在则 `ALTER TABLE topics ADD COLUMN category TEXT`

## 第 2 步：后端 AI 分类模块

新增 `backend/src/topic/classify.ts`：
- 定义 `TOPIC_CATEGORIES`
- 实现 `classifyTopic(title, rationale?)`：调用 `ask()`，prompt 要求从预设分类选一个，只返回分类名
- 增加 `isValidCategory()` 校验

## 第 3 步：后端 Repo 更新

修改 `backend/src/topic/repo.ts`：
- 新增 `getTopicById(id)`
- 新增 `updateTopicCategory(id, category)`
- 修改 `updateTopicStatus(id, status)`：当 status 变为 adopted 时，若 topic.category 为空，自动调用 `classifyTopic` 并更新
- 注意：`updateTopicStatus` 当前是同步的。AI 分类是异步的，因此需要改为 async。

## 第 4 步：后端路由更新

修改 `backend/src/routes/topic.ts`：
- `PATCH /:id` 改为 async（内部调用 `updateTopicStatus` 现在是 async）
- 新增 `PATCH /:id/category`：支持 `category` 或 `auto: true`

## 第 5 步：History 查询增加 category

修改 `backend/src/persistence/history.ts` 和 `routes/history.ts`：
- topic 对象包含 `category`

## 第 6 步：测试

新增 `backend/tests/topic-library.test.ts`：
- mock `classifyTopic`
- 测试 adopted 时自动分类
- 测试手动改分类
- 测试非法分类 400
- 测试 history 返回 category
- 使用 helper 函数避免 `!` 断言

## 第 7 步：前端升级

修改 `frontend/app/history/page.tsx`：
- 标题改为「选题库」
- 顶部增加分类筛选下拉框（全部 / 未分类 / 各预设类型）
- 列表按分类分组
- 每个 topic 卡片增加分类下拉选择
- 未分类 topic 显示「自动分类」按钮
- 更新 TypeScript 类型定义

## 第 8 步：验证

- `npm test`（后端）
- `npm run lint`（前后端）
- 前端页面手动验证：采纳选题 → 自动分类 → 筛选/改分类
