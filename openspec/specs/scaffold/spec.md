# Spec: scaffold

> 场景式规格。描述"骨架可用"的具体行为。

---

## 场景 1：首次启动

**Given** 一个新克隆的仓库，已执行 `npm install`（根 + frontend + backend）
**When** 开发者运行 `npm run dev`（根目录）
**Then**
- 前端 Next.js dev server 在 `:3000` 启动
- 后端 Hono server 在 `:3001` 启动
- 控制台输出两条启动日志，不报错

## 场景 2：健康检查

**Given** 后端已启动
**When** 发起 `GET http://localhost:3001/api/v1/health`
**Then** 返回 HTTP 200，body 为：
```json
{ "status": "ok", "db": "connected", "uptime": <number> }
```

## 场景 3：数据库自动初始化

**Given** `backend/data/` 目录不存在或为空
**When** 后端首次启动
**Then**
- `backend/data/app.db` 文件自动创建
- 三张表 `topics` / `copies` / `copy_versions` 存在
- 重复启动不报"表已存在"错误（使用 `CREATE TABLE IF NOT EXISTS`）

## 场景 4：前端首页可访问

**Given** 前端已启动
**When** 浏览器访问 `http://localhost:3000`
**Then** 返回 200，页面渲染一个占位首页（标题如"自媒体创作工作台"即可，无业务功能）

## 场景 5：环境变量未配置时不崩溃

**Given** 未创建 `.env` 文件
**When** 后端启动
**Then** 后端正常启动（使用默认端口 3001、默认数据库路径）；LLM API key 字段为空字符串，不报错（本 task 不调用 LLM）

## 场景 6：代码质量

**Given** 任意源文件
**When** 运行 `npm run lint`
**Then** Biome 无报错退出

## 场景 7：gitignore 正确

**Given** 已安装依赖、已启动过一次
**When** 运行 `git status`
**Then**
- `node_modules/`（根 + 前后端）不被追踪
- `.env` 不被追踪
- `backend/data/*.db` 不被追踪
- `.env.example` 被追踪
