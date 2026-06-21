# Tasks: topic-library

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. 数据库 schema：给 `topics` 表新增 `category` 字段
- [ ] 2. `topic/classify.ts`：AI 自动分类逻辑 + 预设分类常量
- [ ] 3. `topic/repo.ts`：`updateTopicCategory`、`getTopicById`，并更新 `updateTopicStatus` 在 adopted 时自动分类
- [ ] 4. `routes/topic.ts`：新增 `PATCH /:id/category`
- [ ] 5. `persistence/history.ts` 与 `routes/history.ts`：返回 topic 增加 `category`
- [ ] 6. `tests/topic-library.test.ts`：覆盖自动分类、手动改分类、非法分类、history 返回 category
- [ ] 7. 前端 `/history/page.tsx`：升级为选题库，支持筛选/分组/改分类/一键补分类
- [ ] 8. 端到端验证：test + lint + 前端页
