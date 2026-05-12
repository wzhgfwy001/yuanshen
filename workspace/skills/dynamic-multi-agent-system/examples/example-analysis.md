# 示例3：数据分析

## 任务描述

```
任务：分析销售数据并生成报告
数据：[附件：sales_2026.xlsx]
要求：
- 同比/环比分析
- 趋势预测
- 可视化图表
- 结论和建议
```

## 系统执行流程

### 步骤1：任务分类

```json
{
  "task-type": "standard",
  "confidence": 0.85,
  "matched-skill": "data-analysis",
  "reasoning": "标准的数据分析任务，有成熟流程"
}
```

### 步骤2：任务分解

```json
{
  "subtasks": [
    {
      "id": "subtask-1",
      "name": "数据获取与清洗",
      "agent-role": "数据专家",
      "description": "读取Excel数据，清洗异常值",
      "estimated-time": 60
    },
    {
      "id": "subtask-2",
      "name": "数据分析",
      "agent-role": "分析专家",
      "description": "同比/环比分析，趋势分析",
      "input": ["subtask-1.output"],
      "estimated-time": 120
    },
    {
      "id": "subtask-3",
      "name": "可视化",
      "agent-role": "图表专家",
      "description": "生成趋势图、对比图等",
      "input": ["subtask-2.output"],
      "estimated-time": 90
    },
    {
      "id": "subtask-4",
      "name": "报告撰写",
      "agent-role": "报告专家",
      "description": "撰写分析报告，提出建议",
      "input": ["subtask-2.output", "subtask-3.output"],
      "estimated-time": 150
    }
  ],
  "dependency-graph": {
    "edges": [
      {"from": "subtask-1", "to": "subtask-2"},
      {"from": "subtask-2", "to": "subtask-3"},
      {"from": "subtask-2", "to": "subtask-4"}
    ],
    "parallel-groups": [
      ["subtask-1"],
      ["subtask-2"],
      ["subtask-3", "subtask-4"]
    ]
  }
}
```

### 步骤3：子Agent创建

```
创建4个子Agent：
1. 数据专家 (qwen3.5-plus)
2. 分析专家 (qwen3.5-plus)
3. 图表专家 (qwen3.5-plus)
4. 报告专家 (qwen3.5-plus)

由于子Agent数量>=4，启用审查Agent
```

### 步骤4：执行

```
并行组1: [数据专家]
  └─ 输出：清洗后的数据

并行组2: [分析专家]
  ├─ 输入：清洗后的数据
  └─ 输出：分析结果（同比/环比/趋势）

并行组3: [图表专家，报告专家]（并行）
  ├─ 图表专家：生成可视化图表
  └─ 报告专家：撰写分析报告

并行组4: [审查Agent]
  └─ 审查数据准确性、结论可靠性
```

### 步骤5：质量检查

```
审查要点：
- 数据计算准确性
- 图表清晰度
- 结论有数据支撑
- 建议切实可行
```

## 执行统计

- 总耗时：约8-10分钟
- 子Agent数：4-5个（含审查）
- 并行度：2（图表和报告可并行）
- 用户满意度：预期4-5分

## 经验总结

- 数据清洗是关键环节
- 图表和报告可并行提高效率
- 审查Agent确保数据准确性
- 适合类似分析报告任务复用
