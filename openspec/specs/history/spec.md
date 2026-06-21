# Spec: history

> 历史记录功能的具体行为规格。

---

## 场景 1：已采用选题的历史记录

**Given** 存在 status = adopted 的 topic，其 title copy 有 adopted version "最终标题"
**When** `GET /api/v1/history`
**Then** 返回 200，`items` 含该 topic；`copies` 中 title 的 `versions` 只有一条且 `content` 为 "最终标题"

## 场景 2：未采用选题不出现在历史记录

**Given** 只存在 status = pending 的 topic
**When** `GET /api/v1/history`
**Then** 返回 200，`items` 为空数组

## 场景 3：copy 无 adopted version

**Given** topic 已 adopted，但其 description copy 下所有 version 的 is_adopted = 0
**When** `GET /api/v1/history`
**Then** 返回的该 topic copies 中 description 的 `versions` 为空数组

## 场景 4：前端历史页空态

**Given** 无 adopted topic
**When** 打开 `/history`
**Then** 页面显示「还没有已采用的选题」

## 场景 5：前端历史页展示已采用文案

**Given** 存在已采用 topic 及其 adopted 标题/描述/标签
**When** 打开 `/history`
**Then** 看到 topic 卡片，标题/描述/标签分别展示对应 adopted version 的内容

## 场景 6：测试与 lint

**Given** 任意环境
**When** 运行 `npm test` 和 `npm run lint`
**Then** 均通过
