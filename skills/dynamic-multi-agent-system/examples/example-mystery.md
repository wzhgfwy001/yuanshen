# 示例2：悬疑小说创作

## 任务描述

```
任务：创作悬疑短篇小说
要求：
- 暴风雪山庄模式
- 密室杀人
- 10章，每章1000字
- 采用时间密室诡计
```

## 系统执行流程

### 步骤1：任务分类

```json
{
  "task-type": "innovative",
  "confidence": 0.9,
  "matched-skill": null,
  "reasoning": "悬疑创作需要特殊案件设计和诡计实现，属于创新任务"
}
```

### 步骤2：任务分解

```json
{
  "subtasks": [
    {
      "id": "subtask-1",
      "name": "案件设计",
      "agent-role": "案件分析专家",
      "description": "设计密室杀人案件，采用时间密室诡计",
      "estimated-time": 120
    },
    {
      "id": "subtask-2",
      "name": "大纲设计",
      "agent-role": "悬疑大纲专家",
      "description": "设计10章故事结构和悬念布局",
      "input": ["subtask-1.output"],
      "estimated-time": 180
    },
    {
      "id": "subtask-3",
      "name": "正文撰写",
      "agent-role": "悬疑写作专家",
      "description": "撰写10章内容，每章1000字",
      "input": ["subtask-2.output"],
      "estimated-time": 600
    },
    {
      "id": "subtask-4",
      "name": "质量审查",
      "agent-role": "审查Agent",
      "description": "审查逻辑一致性、悬念设置、诡计合理性",
      "input": ["subtask-3.output"],
      "estimated-time": 120
    }
  ],
  "dependency-graph": {
    "edges": [
      {"from": "subtask-1", "to": "subtask-2"},
      {"from": "subtask-2", "to": "subtask-3"},
      {"from": "subtask-3", "to": "subtask-4"}
    ],
    "parallel-groups": [
      ["subtask-1"],
      ["subtask-2"],
      ["subtask-3"],
      ["subtask-4"]
    ]
  }
}
```

### 步骤3：子Agent创建

```
创建4个子Agent：
1. 案件分析专家 (qwen3.5-plus)
2. 悬疑大纲专家 (qwen3.5-plus)
3. 悬疑写作专家 (qwen3.5-plus)
4. 审查Agent (qwen3.5-plus)

由于子Agent数量>=4，启用审查Agent
```

### 步骤4：执行

```
串行执行：

并行组1: [案件分析专家]
  └─ 输出：案件设计方案（时间密室诡计）

并行组2: [悬疑大纲专家]
  ├─ 输入：案件设计方案
  └─ 输出：10章大纲

并行组3: [悬疑写作专家]
  ├─ 输入：10章大纲
  └─ 输出：10章正文（约10000字）

并行组4: [审查Agent]
  ├─ 输入：10章正文
  └─ 输出：审查报告
```

### 步骤5：质量检查

```
自我检查：每个子Agent自检
主Agent确认：每个环节确认
审查Agent审查：最终全面审查

审查要点：
- 密室诡计是否合理
- 时间线是否一致
- 悬念设置是否有效
- 结局反转是否出人意料
```

### 步骤6：交付

```
输出：
- 案件设计方案
- 10章大纲
- 10章正文（约10000字）
- 审查报告
```

### 步骤7：清理

```
删除：4个子Agent
保留：执行日志、Skill计数+1（悬疑创作类型）
```

## 实际输出

详见 [outputs/snow-mountain-mystery.md](./outputs/snow-mountain-mystery.md)（待创建）

## 执行统计

- 总耗时：约15-20分钟
- 子Agent数：4个
- 修改次数：1-2次
- 用户满意度：预期4-5分

## 经验总结

- 案件设计环节是关键，影响后续所有环节
- 审查Agent有效保证了逻辑一致性
- 适合类似复杂创作任务复用
- 时间密室诡计需要特别注意时间线一致性

## 与科幻示例对比

| 维度 | 科幻示例 | 悬疑示例 |
|------|----------|----------|
| 子Agent数 | 2个 | 4个 |
| 复杂度 | 中等 | 复杂 |
| 审查Agent | 不启用 | 启用 |
| 预计耗时 | 5分钟 | 15-20分钟 |
| 关键检查点 | 世界观一致性 | 逻辑一致性、时间线 |
