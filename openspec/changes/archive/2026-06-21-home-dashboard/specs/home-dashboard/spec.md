# Spec: home-dashboard

> 首页仪表盘的具体行为规格。

---

## 场景 1：仪表盘加载

**Given** 工作台已有若干 topic 和 copy
**When** 打开 `/`
**Then** 页面显示左侧导航栏、顶部问候、今日计划、今日机会表格、右侧 widgets

## 场景 2：今日机会显示 pending 选题

**Given** 存在 status = pending 的 topic
**When** 仪表盘加载完成
**Then** 今日机会表格列出该 topic，并显示 trendScore、audienceMatch、freshness、signalSource

## 场景 3：模拟指标确定性

**Given** 同一个 pending topic 多次刷新页面
**When** 每次请求 `GET /dashboard/stats`
**Then** 该 topic 的 trendScore、audienceMatch、freshness、signalSource 保持不变

## 场景 4：今日计划进度

**Given** counts 为 { pendingTopics: 3, adoptedTopics: 1, completedCopies: 0 }
**When** 渲染今日计划
**Then** 步骤 1 完成，步骤 2 完成，步骤 3 未完成

## 场景 5：侧边栏导航

**Given** 用户在仪表盘页面
**When** 点击「选题雷达」
**Then** 跳转到 `/topics` 且页面仍有左侧导航栏

## 场景 6：禁用模块

**Given** 用户在仪表盘页面
**When** 查看侧边栏
**Then** 脚本工坊/视频工坊/音频工坊/数据分析 显示「即将开放」且不可点击

## 场景 7：本周产出统计

**Given** 最近 7 天有 2 个 adopted topic 和 3 个 completed copy
**When** 仪表盘加载
**Then** 本周产出 widget 显示 已确认选题 2 / 文案完成 3

## 场景 8：测试中 lint

**Given** 任意环境
**When** 运行 `npm test` 和 `npm run lint`
**Then** 均通过
