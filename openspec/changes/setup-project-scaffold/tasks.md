# Tasks: setup-project-scaffold

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. 根 `package.json` + `concurrently` + `biome` + `tsconfig.base.json`
- [ ] 2. 前端 Next.js 15 骨架（`frontend/`：package.json、tsconfig、next.config、app/layout、app/page）
- [ ] 3. 后端 Hono 骨架（`backend/`：package.json、tsconfig、src/index.ts、src/config.ts）
- [ ] 4. SQLite 集成（`src/db/index.ts` + `src/db/schema.sql`，启动时自动建表）
- [ ] 5. 健康检查路由 `GET /api/v1/health`
- [ ] 6. `.env.example` + `.gitignore` 补 `backend/data/*.db`
- [ ] 7. Biome 配置 `biome.json` + 验证 `npm run lint` 通过
- [ ] 8. 端到端验证：`npm install && npm run dev`，过场景 1–7
