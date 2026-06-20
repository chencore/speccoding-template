# Tasks: setup-project-scaffold

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [x] 1. 根 `package.json` + `concurrently` + `biome` + `tsconfig.base.json`
- [x] 2. 前端 Next.js 15 骨架（`frontend/`：package.json、tsconfig、next.config、app/layout、app/page）
- [x] 3. 后端 Hono 骨架（`backend/`：package.json、tsconfig、src/index.ts、src/config.ts）
- [x] 4. SQLite 集成（`src/db/index.ts` + `src/db/schema.sql`，启动时自动建表）
- [x] 5. 健康检查路由 `GET /api/v1/health`
- [x] 6. `.env.example` + `.gitignore` 补 `backend/data/*.db`
- [x] 7. Biome 配置 `biome.json` + 验证 `npm run lint` 通过
- [x] 8. 端到端验证：`npm install && npm run dev`，过场景 1–7
