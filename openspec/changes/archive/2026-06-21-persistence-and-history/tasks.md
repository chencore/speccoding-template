# Tasks: persistence-and-history

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. `persistence/history.ts`：查询已采用 topics + 各自 adopted copy versions
- [ ] 2. `routes/history.ts`：`GET /api/v1/history`
- [ ] 3. 挂载 history 路由到 `src/index.ts`
- [ ] 4. 前端 `/history/page.tsx`：历史记录列表 + 空态 + 跳转详情
- [ ] 5. 首页与选题页增加「历史记录」导航入口
- [ ] 6. `tests/history.test.ts`：mock 数据测已采用/未采用/无 adopted version 场景
- [ ] 7. 端到端验证：test + lint + 前端页
