# Tasks: topic-inspiration

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. DB schema 追加 `imported_videos` + `channel_config` 两表，启动自动建表
- [ ] 2. `topic/repo.ts`：topics + imported_videos + channel_config 的 CRUD
- [ ] 3. `topic/prompt.ts`：prompt 构造（频道描述 + 历史标题 top 30 + 种子词 + JSON 输出指令）
- [ ] 4. `topic/generate.ts`：调 `ask(prompt, {tools:[]})` + strip 代码块 + JSON.parse + 批量写库
- [ ] 5. `topic/import.ts`：粘贴文本解析 + multipart 文件解析 + 异常行跳过
- [ ] 6. `routes/topic.ts`：generate / import / list / patch 四个路由 + 错误处理
- [ ] 7. `routes/topic.ts`：imported-videos list/delete + channel-config get/put
- [ ] 8. 挂载 topic 路由到 `src/index.ts`
- [ ] 9. 前端 `/topics` 页：表单区 + 导入区 + 列表区（原生 HTML + fetch）
- [ ] 10. `tests/topic.test.ts`：mock ask 测生成解析 + CSV 解析单测 + 状态更新单测
- [ ] 11. 端到端验证：test + lint + 前端页全流程（无 key 时验证错误路径）
