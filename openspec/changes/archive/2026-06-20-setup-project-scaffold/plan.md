# Plan: setup-project-scaffold

> 实现计划，由 design.md + tasks.md 驱动。执行阶段严格按本文件。
> 完成后由 `/opsx:archive` 归档，再 merge 回父分支 `version/v0.1`。

---

## 0. 前置检查

- 当前分支：`feature/setup-project-scaffold`（已建，父分支 `version/v0.1` 已记录）
- Node 版本：v24.15.0（已确认）
- 工作区干净：`git status` 仅显示本变更的 spec 产出物

## 1. 执行顺序与文件清单

按依赖顺序分 8 步，每步对应 tasks.md 一条。每步结束做局部自检，全部完成后做端到端验证。

### Step 1 — 根工程配置

**创建文件：**
- `package.json` — 根，仅编排，不含业务依赖
  ```json
  {
    "name": "tiantian-cut",
    "private": true,
    "scripts": {
      "dev": "concurrently -n frontend,backend -c blue,green \"npm -C frontend run dev\" \"npm -C backend run dev\"",
      "lint": "biome check .",
      "format": "biome format --write ."
    },
    "devDependencies": {
      "concurrently": "^9.1.0",
      "@biomejs/biome": "^1.9.4"
    }
  }
  ```
- `tsconfig.base.json` — 共享 TS 配置
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "resolveJsonModule": true,
      "forceConsistentCasingInFileNames": true
    }
  }
  ```
- `biome.json`
  ```json
  {
    "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
    "files": { "ignore": ["**/node_modules", "**/.next", "**/dist", "**/data"] },
    "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
    "linter": { "enabled": true, "rules": { "recommended": true } }
  }
  ```

**自检：** `npm install` 在根目录成功。

### Step 2 — 前端 Next.js 15 骨架

**创建文件：**
- `frontend/package.json`
  ```json
  {
    "name": "frontend",
    "private": true,
    "scripts": {
      "dev": "next dev -p 3000",
      "build": "next build",
      "start": "next start"
    },
    "dependencies": {
      "next": "^15.1.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "devDependencies": {
      "@types/node": "^22.10.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "typescript": "^5.7.0"
    }
  }
  ```
- `frontend/tsconfig.json` — `extends ../tsconfig.base.json`，加 `jsx: preserve`、`plugins: [{name:"next"}]`、`paths` 预留 `@/*`
- `frontend/next.config.ts`
  ```ts
  import type { NextConfig } from 'next';
  const config: NextConfig = {};
  export default config;
  ```
- `frontend/app/layout.tsx` — 根 layout，`<html lang="zh"><body>{children}</body></html>`
- `frontend/app/page.tsx` — 占位首页，标题"自媒体创作工作台"，副标题"v0.1 · 选题 + 文案"

**自检：** `cd frontend && npm install && npm run dev`，浏览器访问 `:3000` 见首页。

### Step 3 — 后端 Hono 骨架

**创建文件：**
- `backend/package.json`
  ```json
  {
    "name": "backend",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js"
    },
    "dependencies": {
      "hono": "^4.6.0",
      "@hono/node-server": "^1.13.0",
      "better-sqlite3": "^11.6.0",
      "dotenv": "^16.4.5"
    },
    "devDependencies": {
      "@types/node": "^22.10.0",
      "@types/better-sqlite3": "^7.6.12",
      "tsx": "^4.19.0",
      "typescript": "^5.7.0"
    }
  }
  ```
- `backend/tsconfig.json` — `extends ../tsconfig.base.json`，加 `module: ESNext`、`moduleResolution: Bundler`、`outDir: dist`、`rootDir: src`
- `backend/src/config.ts` — 见 design.md 第 4 节
- `backend/src/index.ts` — Hono 入口
  ```ts
  import { serve } from '@hono/node-server';
  import { Hono } from 'hono';
  import { health } from './routes/health.js';
  import { initDb } from './db/index.js';
  import { config } from './config.js';

  initDb();

  const app = new Hono().basePath('/api/v1').route('/', health);

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`backend on http://localhost:${info.port}`);
  });
  ```

**自检：** `cd backend && npm install`；此时 `npm run dev` 会因缺 db/health 模块报错，正常，Step 4-5 补齐。

### Step 4 — SQLite 集成

**创建文件：**
- `backend/src/db/schema.sql` — design.md 第 3 节三张表
- `backend/src/db/index.ts`
  ```ts
  import Database from 'better-sqlite3';
  import { readFileSync } from 'node:fs';
  import { dirname, join } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { config } from '../config.js';
  import { mkdirSync } from 'node:fs';

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dbPath = config.databasePath;
  const dbDir = dirname(dbPath);
  mkdirSync(dbDir, { recursive: true });

  export const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  export function initDb() {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
  }
  ```
  **注意**：`schema.sql` 需在运行时可读。tsx watch 模式下 `__dirname` 指向 src 目录，文件可读。生产 build 后 schema.sql 不会自动拷到 dist，需在 Step 8 验证中确认 dev 模式通过即可（v0.1 不跑 build）。

- `backend/data/.gitkeep` — 空文件，确保目录存在

**自检：** `cd backend && npm run dev`，启动后 `backend/data/app.db` 生成；`sqlite3 backend/data/app.db ".tables"` 见 topics/copies/copy_versions。

### Step 5 — 健康检查路由

**创建文件：**
- `backend/src/routes/health.ts` — 见 design.md 第 5 节

**自检：** `curl http://localhost:3001/api/v1/health` 返回 `{"status":"ok","db":"connected","uptime":...}`。

### Step 6 — 环境变量与 gitignore

**创建文件：**
- `.env.example` — design.md 第 4 节

**修改文件：**
- `.gitignore` — 在"环境变量"段后补 `backend/data/*.db`、`backend/data/*.db-wal`、`backend/data/*.db-shm`；确认 `data/` 段已覆盖

**自检：** `git status` 中 `.env.example` 被追踪、`.env`（若建）不被追踪。

### Step 7 — Biome 验证

**操作：**
- 根目录 `npm install`（拉取 concurrently + biome）
- 前后端 `npm install`
- 运行 `npm run lint`

**自检：** Biome 无报错。若有报错按提示修复（通常是 import 顺序 / 未使用变量）。

### Step 8 — 端到端验证（对应 spec 7 个场景）

1. `git clean -xfd` 模拟全新克隆（**仅在确认无未提交重要文件时**；本步前应已 commit spec 产出物，故安全）
2. 根目录 `npm install && cd frontend && npm install && cd ../backend && npm install && cd ..`
3. `npm run dev`
4. 验证 spec 场景 1：两条启动日志
5. 验证 spec 场景 2：`curl http://localhost:3001/api/v1/health`
6. 验证 spec 场景 3：`ls backend/data/app.db` 存在 + `.tables` 三表
7. 验证 spec 场景 4：浏览器 `:3000` 见首页
8. 验证 spec 场景 5：删除 `.env`（若有），后端仍启动
9. 验证 spec 场景 6：`npm run lint` 通过
10. 验证 spec 场景 7：`git status` 确认 ignore 正确

## 2. 不在本计划内

- pi-agent-core / pi-ai 任何依赖（留 `integrate-pi-agent`）
- 选题 / 文案任何业务路由
- 前端 UI 组件库
- 测试框架
- Docker / CI

## 3. 回滚

若某步失败且无法快速修复：
- Step 1-3 失败：删 `frontend/` 或 `backend/` 下本次新增文件重来
- Step 4-5 失败：删 `backend/src/db/` 或 `backend/src/routes/` 重写
- 整体回滚：`git checkout version/v0.1 -- .`（feature 分支可整条废弃重拉）

## 4. 完成后

- `git add -A && git commit -m "feat: setup project scaffold (Next.js + Hono + SQLite)"`
- 进入 `/opsx:archive` 归档变更
- 读 `git config --get branch.feature/setup-project-scaffold.parent` → merge 回 `version/v0.1`
- 追加 `spec/devlog.md`
