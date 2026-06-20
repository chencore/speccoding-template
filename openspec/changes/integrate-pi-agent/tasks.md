# Tasks: integrate-pi-agent

> 实现任务清单。勾选由 `/opsx:apply` 流程驱动。

---

- [ ] 1. 引入 vitest 测试框架（backend devDep + scripts.test + biome 放宽 tests 规则）
- [ ] 2. `agent/models.ts`：默认模型 + 切换函数
- [ ] 3. `agent/tools/echo.ts`：demo 工具（校准 AgentTool 字段名）
- [ ] 4. `agent/tools/index.ts`：工具汇总导出
- [ ] 5. `agent/index.ts`：`ask()` 封装（新建 Agent + prompt + waitForIdle + 提取文本）
- [ ] 6. `routes/agent.ts`：`POST /api/v1/agent/ask` + 错误处理（400/503/500）
- [ ] 7. 挂载 agentRoute 到 `src/index.ts`
- [ ] 8. `tests/agent.test.ts`：mock streamFn 覆盖场景 1/2/4/7
- [ ] 9. 端到端验证：`npm test` 通过 + `npm run lint` 通过 + 手动 curl 场景 3（无需 key）
