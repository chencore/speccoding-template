# Design: setup-project-scaffold

> 本变更无跨模块影响 / 无新增外部依赖（better-sqlite3 为原生依赖）/ 数据模型为空表骨架。
> 按 CLAUDE.md 规则，归档时**无需**提升到 `spec/design.md`（已在 kickoff 写入三表模型）。

---

## 1. 目录结构

```
tiantian-cut/
├── package.json              # 根：concurrently 起前后端
├── biome.json                # 根：lint + format 配置
├── tsconfig.base.json        # 根：共享 TS 配置
├── .env.example
├── frontend/
│   ├── package.json
│   ├── tsconfig.json         # extends ../tsconfig.base.json
│   ├── next.config.ts
│   └── app/
│       ├── layout.tsx
│       └── page.tsx          # 空首页
├── backend/
│   ├── package.json
│   ├── tsconfig.json         # extends ../tsconfig.base.json
│   ├── src/
│   │   ├── index.ts          # Hono server 入口
│   │   ├── routes/
│   │   │   └── health.ts
│   │   ├── db/
│   │   │   ├── index.ts      # better-sqlite3 实例
│   │   │   └── schema.sql    # 建表 SQL
│   │   └── config.ts         # 环境变量加载
│   └── data/                 # gitignored，SQLite 文件落此处
│       └── .gitkeep
└── data/                     # 根级 data 也可，二选一；本设计放 backend/data
```

## 2. 关键决策

### 决策 1：前后端各自 package.json + 根 concurrently
- **选择**：根 `package.json` 仅做编排（`concurrently`），不共享依赖；前后端各自 `npm install`
- **放弃**：pnpm workspace（单人项目复杂度不值）、Next API Routes 当后端（绑架后端、pi 集成受限）
- **理由**：保持模板现状；前后端依赖隔离清晰；一键启动仍便利

### 决策 2：better-sqlite3 + 手写 SQL
- **选择**：同步 API、无 ORM
- **放弃**：Drizzle / Prisma
- **理由**：单人 + 三张简单表，手写 SQL 最透明；同步 API 无回调地狱；后续若复杂化再上 Drizzle 不迟

### 决策 3：Biome 而非 ESLint+Prettier
- **选择**：Biome 一体化
- **放弃**：ESLint + Prettier 经典组合
- **理由**：与 pi 项目生态对齐；零配置上手快；单人项目不需要 ESLint 丰富插件

### 决策 4：SQLite 文件位置 = `backend/data/app.db`
- **选择**：放后端目录下
- **放弃**：根级 `data/`
- **理由**：后端独占访问，前后端职责清晰；`.gitignore` 需补 `backend/data/*.db`

## 3. 数据库 schema（空表骨架）

```sql
-- backend/src/db/schema.sql

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | adopted | discarded
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS copies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  type TEXT NOT NULL,  -- title | description | tags
  adopted_version_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS copy_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  copy_id INTEGER NOT NULL REFERENCES copies(id),
  version_no INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_adopted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

字段对齐 `spec/design.md` 第 4 节。timestamp 用 SQLite `datetime('now')` 返回 ISO 字符串，TS 侧直接当 string 处理。

## 4. 配置加载

```ts
// backend/src/config.ts
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './data/app.db',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
  // 其他 LLM key 预留位，integrate-pi-agent task 填充
};
```

`.env.example`：
```
PORT=3001
DATABASE_PATH=./data/app.db
DEEPSEEK_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_API_BASE=http://localhost:3001/api/v1
```

## 5. 健康检查接口

```ts
// backend/src/routes/health.ts
import { Hono } from 'hono';
import { db } from '../db';

export const health = new Hono();

health.get('/health', (c) => {
  let dbStatus = 'connected';
  try {
    db.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'error';
  }
  return c.json({
    status: 'ok',
    db: dbStatus,
    uptime: process.uptime(),
  });
});
```

## 6. 风险

- **better-sqlite3 原生编译**：Node 24 下需 prebuild 可用；若安装失败需 `npm rebuild`。Mitigation：package.json 锁版本，安装失败时文档化 rebuild 步骤。
- **Next.js 15 + React 19 新版兼容**：部分第三方库尚未声明兼容 React 19。Mitigation：v0.1 仅用 Next 内置能力，不引 UI 库。
