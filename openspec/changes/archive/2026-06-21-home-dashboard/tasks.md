# Tasks: home-dashboard

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. `backend/src/dashboard/metrics.ts`：确定性 mock 指标生成
- [ ] 2. `backend/src/dashboard/repo.ts`：聚合查询函数
- [ ] 3. `backend/src/routes/dashboard.ts`：`GET /api/v1/dashboard/stats`
- [ ] 4. `backend/src/index.ts`：挂载 dashboard 路由
- [ ] 5. `backend/tests/dashboard.test.ts`：聚合接口测试
- [ ] 6. `frontend/app/components/SidebarLayout.tsx`：全局左侧导航
- [ ] 7. `frontend/app/layout.tsx`：使用 SidebarLayout
- [ ] 8. `frontend/app/page.tsx`：重写为仪表盘
- [ ] 9. 适配 `frontend/app/topics/page.tsx` / `history/page.tsx` / `topics/[id]/page.tsx` 宽度
- [ ] 10. lint + test + build + 端到端验证
