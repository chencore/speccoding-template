# Design: home-dashboard

> **数据模型变更**：无（复用 topics / copies / copy_versions / imported_videos）
> **跨模块影响**：新增 dashboard 模块，读取 topic/copy 表；前端新增全局布局
> **新增外部依赖**：无

---

## 1. 模块结构

```
backend/src/
├── dashboard/
│   ├── repo.ts        # 聚合查询
│   └── metrics.ts     # 确定性 mock 指标
├── routes/
│   └── dashboard.ts   # GET /dashboard/stats
└── index.ts           # 挂载路由
frontend/app/
├── components/
│   └── SidebarLayout.tsx  # 全局左侧导航布局
├── layout.tsx
├── page.tsx           # 仪表盘首页
├── topics/page.tsx    # 适配侧边栏
├── history/page.tsx   # 适配侧边栏
└── topics/[id]/page.tsx  # 适配侧边栏
```

## 2. 后端聚合接口

### `GET /api/v1/dashboard/stats`

返回：
- `counts`: pending/adopted topics、inProgress/completed copies、imported videos
- `weekly`: 最近 7 天 adopted topics 和 completed copies
- `categoryBreakdown`: 已采纳选题按 category 分组计数
- `recentActivity`: 最近混合动态（topic 创建 + copy version 创建）
- `pendingTopicsList`: 最近 10 条 pending topics + mock 指标
- `inProgressList`: adopted 但文案未完备的 topic 列表
- `recentCopies`: 最近 5 条已采用 copy versions

### Mock 指标

基于 `topic.id + topic.title` 做确定性 hash：
- `trendScore`: 60–99
- `audienceMatch`: 50–99
- `freshness`: 70–99
- `signalSource`: ["热搜榜", "竞品分析", "历史爆款", "AI推荐", "评论区"]

## 3. 前端布局

### SidebarLayout

- 固定左侧，宽度 220px
- 顶部 Logo：圆形图标 + "选题雷达" + "AI 创作工作台"
- 导航项：产品工作台（/）、选题雷达（/topics）、文案工坊（/history），脚本/视频/音频/数据分析（禁用）
- 底部用户区：头像占位 + "独立创作者" + "个人频道"
- 当前项高亮：左侧 3px 蓝色竖线 + 浅蓝背景

### Dashboard Page

- 顶部问候（根据时间显示早上好/下午好/晚上好）+ 日期
- 今日创作计划：3 步骤横向卡片
- 主内容两栏网格 `1fr 360px`
  - 左：今日机会表格
  - 右：进行中内容、本周产出、最近文案

## 4. 现有页面适配

- 去掉 `<main>` 的 `margin: "0 auto"`
- `maxWidth` 从 900 放宽到 1100

## 5. 关键决策

### 决策 1：从 version/v0.1 切出 version/v0.2
- **选择**：version/v0.2 继承 version/v0.1 全部代码
- **理由**：当前 main 仍是模板骨架，version/v0.1 才是实际开发基线；v0.2 必须建立在 v0.1 能力之上

### 决策 2：mock 指标而非真实算法
- **选择**：用确定性 hash 生成趋势分/受众匹配/新鲜度/信号来源
- **放弃**：接入外部热点 API 或训练评分模型
- **理由**：v0.2 重点是工作台结构，真实评分算法留后续数据分析环节

### 决策 3：新增 dashboard 聚合接口
- **选择**：一个接口返回首页全部数据
- **放弃**：前端多次调用现有接口再组装
- **理由**：减少请求瀑布，后端聚合查询简单快速
