# Tasks: copy-generation

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [x] 1. `copy/repo.ts`：copies + copy_versions 的 CRUD（含事务性的采用切换）
- [x] 2. `copy/prompt.ts`：生成 prompt + 改写 prompt 构造
- [x] 3. `copy/generate.ts`：调 ask + strip 代码块 + JSON.parse + 容错（字段缺失跳过）+ 事务批量写库
- [x] 4. `copy/rewrite.ts`：调 ask + strip + 查 max version_no + 写新版本
- [x] 5. `routes/copy.ts`：generate / rewrite / list / adopt 四路由 + 错误处理（404/400/502/503）
- [x] 6. 挂载 copy 路由到 `src/index.ts`
- [x] 7. 前端 `/topics/[id]/page.tsx`：topic 信息 + 文案三块区 + 生成/改写/采用交互
- [x] 8. `tests/copy.test.ts`：mock ask 测生成解析（含字段缺失容错）+ 改写 + 采用切换 + 容器校验
- [x] 9. 端到端验证：test + lint + 前端页全流程（无 key 验证错误路径）
