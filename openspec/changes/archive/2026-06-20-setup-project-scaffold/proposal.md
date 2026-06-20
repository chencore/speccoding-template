# Proposal: setup-project-scaffold

> v0.1 第一个 task，初始化项目骨架。

---

## 是什么（What）

搭建前后端可运行的最小骨架：

- **前端**：Next.js 15 (App Router) + React 19 + TypeScript，跑在 `:3000`
- **后端**：Node.js + Hono + TypeScript，跑在 `:3001`
- **数据库**：SQLite (better-sqlite3)，初始化三张空表 `topics` / `copies` / `copy_versions`
- **根工程**：`package.json` 用 `concurrently` 一键起前后端
- **配置**：`.env.example` + 配置加载，API key 由环境变量注入
- **健康检查**：`GET /api/v1/health` 返回 `{ status, db, uptime }`
- **前端首页**：空白占位页能打开即可
- **代码质量**：Biome（lint + format 一体）

## 为什么（Why）

v0.1 后续所有 task（pi-agent 集成、选题、文案、持久化）都依赖一个能跑的骨架。先把骨架立起来，让"改一行代码能在浏览器看到变化"成为起点，而不是每个 task 都要重复搭环境。

**本变更是后续所有功能 task 的前置依赖。**

## 范围（Scope）

### 包含
- 前后端骨架与 TypeScript 配置（各自 `tsconfig.json`，根目录共享路径别名配置）
- 根 `package.json` + `concurrently` 一键起前后端
- Hono server 入口 + 路由前缀 `/api/v1` + 健康检查接口
- SQLite 初始化脚本：建三张空表（topics / copies / copy_versions）
- `.env.example` + 后端配置加载模块
- Next.js App Router 空首页
- Biome 配置（lint + format）
- `.gitignore` 已存在，仅核对覆盖 `data/` 目录（SQLite 文件位置）

### 不包含（明确排除）
- pi-agent-core / pi-ai 集成（留 `integrate-pi-agent`）
- 任何业务逻辑（选题 / 文案生成 / 持久化读写）
- 前端 UI 组件库选型与接入
- 测试框架（留到需要时再加）
- CI/CD（v0.1 本地运行）

## 成功标准

- [ ] 根目录 `npm install && npm run dev` 能同时起前后端
- [ ] 浏览器访问 `http://localhost:3000` 看到首页
- [ ] `curl http://localhost:3001/api/v1/health` 返回 200 + `{ status: "ok", db: "connected", uptime }`
- [ ] SQLite 数据库文件在 `data/app.db` 自动创建，三张表存在
- [ ] `.env.example` 提交，`.env` 被 gitignore
- [ ] `npm run lint` 通过
- [ ] 父分支 `version/v0.1` 上无破坏
