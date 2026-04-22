# 子Agent执行日志 - 设计规范

**创建时间：** 2026-04-16T00:37:00+08:00
**状态：** ⚠️ 设计阶段 - 尚未实现

> ⚠️ 注意：此文件为设计规范文档，实际日志记录机制尚未实现。
> 子Agent结果目前通过 sessions_history 和 sessions_send 工具获取，
> 由主Agent手动记录到 brain/progress.json 的 completed_steps。

---

## 核心原则

**子Agent不直接写状态文件！**

```
子Agent → 返回结果给阳神 → 阳神决策 → 阴神执行写入
```

---

## 子Agent结果格式

当子Agent完成任务后，返回给阳神的结果应包含：

```json
{
  "agent_id": "朽木白哉",
  "task_id": "task-001",
  "status": "completed|failed|partial",
  "result": {
    "summary": "执行结果摘要",
    "confidence": 0.85,
    "findings": ["发现1", "发现2"],
    "artifacts": ["file1.md", "data.json"]
  },
  "execution_time": "2026-04-16T00:30:00+08:00",
  "metadata": {
    "tokens_used": 1500,
    "model": "MiniMax-M2.7"
  }
}
```

---

## 阳神处理流程

```
1. 接收子Agent结果
2. 审查结果（置信度、完整性）
3. 决定是否写入状态：
   - 如果需要记录：
     → 追加到 completed_steps（类型=EXECUTION）
     → 如果发现问题，追加到 known_issues
4. 决定是否更新 reasoning_chain
5. 阴神执行写入
```

---

## 写入 progress.json 的格式

```json
{
  "step": "子Agent朽木白哉完成任务：XXX",
  "timestamp": "2026-04-16T00:35:00+08:00",
  "source": "子Agent:朽木白哉",
  "type": "EXECUTION",
  "confidence": 0.85,
  "alternatives_considered": [],
  "execution_details": {
    "agent_id": "朽木白哉",
    "task_id": "task-001",
    "status": "completed",
    "tokens_used": 1500
  }
}
```

---

## 注意事项

1. **子Agent只能返回结果，不能直接写状态**
2. **阳神保留审查权** — 可以修改、拒绝或补充子Agent结果
3. **所有写入经过阳神确认** — 保证状态一致性
4. **执行日志轻量化** — 只记录关键信息，不记录完整输出

---

## 待实现

- [ ] subagent-manager 模块适配
- [ ] 阳神审查逻辑增强
- [ ] 执行日志格式标准化

> ⚠️ 这些待实现项暂不需要处理。当前通过以下方式替代：
> - **结果获取**：sessions_history / sessions_send 工具
> - **状态记录**：主Agent手动写入 progress.json completed_steps
> - **错误追踪**：learnings/errors.json

---

*最后更新：2026-04-22*
