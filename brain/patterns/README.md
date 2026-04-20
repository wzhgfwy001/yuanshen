# Patterns（成功模式）数据格式

## 目录说明
`brain/patterns/` 存储从成功任务中提取的可复用模式。

## 数据格式

### 文件命名规则
```
{timestamp}-{agent_name}-{pattern_type}.md
```

- `timestamp`: ISO 8601 格式时间戳（到秒）
- `agent_name`: 负责的Agent名称（如: luzhou, kurosaki, etc.）
- `pattern_type`: 模式类型（如: data-processing, decision-making, workflow）

### 文件内容模板

```markdown
---
id: pattern-uuid-v4
created_at: 2026-04-20T19:19:00+08:00
agent: 鹿丸
type: workflow
tags: [task-decomposition, risk-assessment]
trigger_count: 5
success_rate: 100%
---

# 模式名称

## 适用场景
描述这个模式适用的任务类型和条件。

## 触发条件
什么情况下应该使用这个模式？

## 执行步骤
1. 步骤1
2. 步骤2
3. 步骤3

## 成功案例
描述一次成功应用此模式的案例。

## 关键要点
- 要点1
- 要点2
- 要点3

## 相关模式
- [模式A](./2026-04-20-luzhou-workflow.md)
- [模式B](./2026-04-20-kurosaki-architecture.md)

## 改进建议
未来如何优化这个模式？
```

## 模式类型分类

### workflow（工作流模式）
- 任务分解流程
- 多Agent协作流程
- 决策流程

### data-processing（数据处理模式）
- 数据清洗流程
- 数据转换方法
- 数据验证规则

### decision-making（决策模式）
- 技术选型决策
- 优先级判断
- 风险评估方法

### communication（沟通模式）
- 与用户的沟通方式
- Agent间协作沟通
- 错误通知方式

## 示例文件

### 文件：`2026-04-20T10:30:00-luzhou-workflow-task-decomposition.md`

```markdown
---
id: pattern-001
created_at: 2026-04-20T10:30:00+08:00
agent: 鹿丸
type: workflow
tags: [task-decomposition, risk-assessment]
trigger_count: 5
success_rate: 100%
---

# 复杂任务分解模式

## 适用场景
- 需要多个Agent协作的复杂任务
- 任务包含依赖关系
- 需要风险评估的任务

## 触发条件
- 任务估计时间超过1小时
- 任务包含3个以上子任务
- 子任务之间存在依赖关系

## 执行步骤
1. 分析任务目标和约束
2. 识别关键里程碑
3. 分解为可管理的子任务
4. 评估子任务依赖关系
5. 识别潜在风险
6. 分配子任务给合适的Agent
7. 制定验证标准

## 成功案例
用户要求"分析最近一周的GitHub热门项目"：
- 目标：生成项目列表和分析报告
- 分解为：数据收集、数据处理、分析、报告生成
- 风险：数据源可能不稳定 → 制定重试机制
- 结果：按时生成高质量报告

## 关键要点
- 每个子任务要有明确目标
- 风险要提前识别
- 依赖关系要清晰标注
- 验证标准要可量化

## 相关模式
- [风险评估模式](./2026-04-20T11:00:00-luzhou-decision-making-risk-assessment.md)
- [Agent协作模式](./2026-04-20T12:00:00-luzhou-workflow-agent-collaboration.md)

## 改进建议
- 可以加入更细粒度的时间估算
- 可以增加自动依赖检查功能
```

## 查询API

### 按类型查询
```python
patterns = query_patterns(type="workflow")
```

### 按Agent查询
```python
patterns = query_patterns(agent="鹿丸")
```

### 按成功率排序
```python
patterns = query_patterns(sort_by="success_rate", limit=10)
```

### 按标签查询
```python
patterns = query_patterns(tags=["task-decomposition"])
```

## 更新机制

- 每次成功应用模式，`trigger_count` +1
- 如果失败，`success_rate` 重新计算
- 每30天审查一次，删除低成功率模式
