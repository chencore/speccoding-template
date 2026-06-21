# Plan: home-dashboard

> 执行计划，按顺序完成。

---

## 第 1 步：后端 mock 指标

创建 `backend/src/dashboard/metrics.ts`：
- `hashString(str)`：DJB2 风格确定性 hash
- `mockMetricsForTopic(topic)`：返回 trendScore、audienceMatch、freshness、signalSource
- `freshnessLabel(score)`：把分数映射为「很新/较新/一般/稳定」
- `colorForScore(score)`：返回色阶类名/颜色值（高绿、中橙、低红）

## 第 2 步：后端聚合 repo

创建 `backend/src/dashboard/repo.ts`，导出 `getDashboardStats()`：
- 使用 `db.prepare` 查询 counts
- 查询最近 pending topics 并附加 mock 指标
- 查询 category breakdown
- 查询 recent activity、in-progress list、recent copies
- 返回完整的 DashboardStats 对象

## 第 3 步：后端路由

创建 `backend/src/routes/dashboard.ts`：
- `dashboardRouter.get("/dashboard/stats", (c) => c.json(getDashboardStats()))`

修改 `backend/src/index.ts` 挂载 `.route("/", dashboardRouter)`。

## 第 4 步：后端测试

创建 `backend/tests/dashboard.test.ts`：
- 插入 topic/copy/version 测试数据
- 断言返回形状和各计数值
- 断言 mock 指标确定性
- cleanup

## 第 5 步：全局侧边栏布局

创建 `frontend/app/components/SidebarLayout.tsx`：
- "use client"
- 使用 `usePathname()` 判断当前项
- 220px 固定左侧，flex 布局
- Logo、导航项、底部用户区

修改 `frontend/app/layout.tsx` 使用 SidebarLayout。

## 第 6 步：仪表盘首页

重写 `frontend/app/page.tsx`：
- 请求 `GET ${API_BASE}/dashboard/stats`
- 顶部问候区
- 今日创作计划 3 步骤
- 今日机会表格
- 右侧 widgets

所有子组件写在同一文件内，保持内联样式风格。

## 第 7 步：适配现有页面

修改 `frontend/app/topics/page.tsx`、`frontend/app/history/page.tsx`、`frontend/app/topics/[id]/page.tsx`：
- `maxWidth` 900 → 1100
- 去掉 `margin: "0 auto"` 或改为 `marginLeft: 0`

## 第 8 步：验证

- `npm -C backend test`
- `npm run lint`
- `npm -C frontend run build`
- `npm -C backend run build`
- 手动启动前后端，访问 `/` 验证布局、导航、数据
