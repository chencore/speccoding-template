# Spec: topic-library

> 选题库功能的具体行为规格。

---

## 场景 1：采纳选题自动分类

**Given** 存在一个 pending topic，标题为 "Cursor 编辑器上手评测"
**When** 调用 `PATCH /api/v1/topics/:id` 将 status 改为 `adopted`
**Then** 返回的 topic 的 `category` 为 "评测/体验"

## 场景 2：手动修改分类

**Given** 存在一个已分类为 "评测/体验" 的 topic
**When** 调用 `PATCH /api/v1/topics/:id/category`，body 为 `{ "category": "教程/干货" }`
**Then** 返回的 topic 的 `category` 变为 "教程/干货"

## 场景 3：自动重新分类

**Given** 存在一个已分类 topic
**When** 调用 `PATCH /api/v1/topics/:id/category`，body 为 `{ "auto": true }`
**Then** 返回的 topic 的 `category` 被 AI 重新分类

## 场景 4：未分类旧数据显示在选题库

**Given** 数据库里存在一个 adopted 但 `category IS NULL` 的 topic
**When** 打开 `/history`
**Then** 该 topic 出现在「未分类」分组

## 场景 5：按类型筛选

**Given** 选题库中存在 "教程/干货" 和 "评测/体验" 两类 topic
**When** 在历史页选择筛选 "教程/干货"
**Then** 只显示 "教程/干货" 分组及其下的 topic

## 场景 6：未分类选题一键补分类

**Given** 存在一个未分类 adopted topic
**When** 在历史页点击该 topic 的「自动分类」按钮
**Then** 该 topic 被 AI 分类并移动到对应分组

## 场景 7：分类非法值校验

**Given** 调用 `PATCH /api/v1/topics/:id/category`，body 为 `{ "category": "不存在" }`
**When** 请求到达后端
**Then** 返回 400，错误信息提示分类不在预设列表中

## 场景 8：测试与 lint

**Given** 任意环境
**When** 运行 `npm test` 和 `npm run lint`
**Then** 均通过
