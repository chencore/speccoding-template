# Proposal: persistence-and-history

> v0.1 第五个 task，补齐数据持久化的历史视图：展示已采用选题及其最终采用文案，支持按时间线回顾创作决策。

---

## 是什么（What）

新增「历史记录」页面，集中展示创作者在 v0.1 里所有「已采用」的选题及其对应的最终文案：

- 列表展示所有 `status = adopted` 的 topic
- 每个 topic 下展示三类 copy 当前被 adopted 的 version
- 时间线倒序，最新采用的排在最前
- 点击可跳转回对应 topic 详情页继续改写

## 为什么（Why）

v0.1 选题 + 文案已经能跑通单次创作流程，但采纳的选题和文案散落在各 topic 详情页，缺少一个全局回顾视图。历史记录让创作者能快速找到「上周我采用了哪些选题、最终文案是什么」，为后续脚本/视频环节留入口。

## 范围（Scope）

### 包含
- 后端 API：`GET /api/v1/history` —— 返回已采用 topic + adopted copies + adopted versions
- 前端页面：`/history`
- 首页导航增加「历史记录」入口
- 单元测试：mock 数据测历史查询

### 不包含
- 版本之间 side-by-side 差异对比（v0.1 已能在 topic 详情页看全版本，差异对比留 v0.2）
- 数据分析/统计（留 v0.2 数据分析环节）
- 导出/导入历史（v0.1 只读）
- 删除历史（v0.1 只增不删）

## 成功标准
- [ ] `GET /api/v1/history` 只返回 `status = adopted` 的 topics
- [ ] 每个 topic 返回其 adopted 的三类 copy versions（标题/描述/标签）
- [ ] 无 adopted 选题时返回空数组
- [ ] 前端 `/history` 能正确渲染时间线
- [ ] `npm test` 通过，`npm run lint` 通过
