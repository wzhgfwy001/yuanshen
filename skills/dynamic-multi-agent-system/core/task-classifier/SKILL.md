---
name: deerflow-task-classifier
description: DeerFlow增强版任务分类器 - 类型识别、复杂度评估、技能匹配、优先级判定
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | task_classification=true | auto_routing=true | priority_scheduling=true
---

# DeerFlow增强版任务分类器

**【附魔·改】Classifier Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 任务分类 | `task_classification=true` | 启用自动分类 |
| 自动路由 | `auto_routing=true` | 根据类型自动路由 |
| 优先级调度 | `priority_scheduling=true` | 优先级队列 |

## 核心功能

### 1. 基础分类

```javascript
const { TaskClassifier, TASK_TYPES, COMPLEXITY_LEVELS } = require('./deerflow_enhanced.js');

const classifier = new TaskClassifier();

const profile = classifier.classify('帮我写一段JavaScript代码实现排序算法');

console.log(`
类型: ${profile.type}
复杂度: ${profile.complexity.description}
优先级: ${profile.priority}
所需技能: ${profile.requiredSkills.join(', ')}
估计Token: ${profile.estimatedTokens}
置信度: ${(profile.confidence * 100).toFixed(1)}%
`);
```

### 2. 支持的任务类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `general` | 通用任务 | 简单问答 |
| `coding` | 编程任务 | 写代码、debug |
| `writing` | 写作任务 | 写文章、文档 |
| `research` | 研究任务 | 调研、分析 |
| `analysis` | 分析任务 | 对比、评估 |
| `creative` | 创意任务 | 头脑风暴、设计 |
| `question` | 问答任务 | 解释、定义 |
| `conversation` | 对话任务 | 聊天、讨论 |
| `data_processing` | 数据处理 | 清洗、转换 |
| `automation` | 自动化任务 | 批量处理、脚本 |

### 3. 复杂度评估

```javascript
const profile = classifier.classify('写一个完整的后端API系统，包括用户认证、数据库连接、CRUD操作');

// 复杂度级别:
// - LOW (0.2): 简单任务
// - MEDIUM (0.5): 中等任务
// - HIGH (0.75): 复杂任务
// - VERY_HIGH (0.9): 非常复杂

console.log(`
复杂度等级: ${profile.complexity.level}
复杂度分数: ${profile.complexity.score}
估计耗时: ${(profile.estimatedDuration / 1000).toFixed(1)}秒
`);
```

### 4. 批量分类

```javascript
const tasks = [
  { input: '修复这个bug', context: { id: 1 } },
  { input: '写一篇技术博客', context: { id: 2 } },
  { input: '分析销售数据', context: { id: 3 } }
];

const profiles = classifier.classifyBatch(tasks);

for (const profile of profiles) {
  console.log(`${profile.context.id}: ${profile.type} - ${profile.complexity.level}`);
}
```

### 5. 建议的Agent

```javascript
const profile = classifier.classify('帮我用React写一个用户管理界面');

console.log(`建议的Agent: ${profile.suggestedAgents.join(', ')}`);
// 输出: general-purpose, coder, frontend, web
```

### 6. 自定义分类器

```javascript
const customClassifier = new TaskClassifier({
  confidenceThreshold: 0.7,
  complexityThreshold: 0.5
});

// 添加自定义模式
customClassifier.typePatterns[TASK_TYPES.CODING].push('rust', 'golang');
```

## 分类结果结构

```javascript
{
  type: 'coding',              // 主要类型
  subtypes: ['api_development'], // 子类型
  complexity: {                // 复杂度
    level: 'high',
    score: 0.75,
    description: '复杂任务'
  },
  priority: 3,                // 优先级 1-5
  requiredSkills: [            // 所需技能
    'general-purpose',
    'coder',
    'backend'
  ],
  estimatedTokens: 500,         // 估计token数
  estimatedDuration: 90000,    // 估计耗时(ms)
  confidence: 0.85,            // 置信度
  suggestedAgents: ['coder'],  // 建议Agent
  context: {},                 // 原始上下文
  metadata: {                  // 元数据
    textLength: 2000,
    wordCount: 500,
    classifiedAt: '2026-04-22T...'
  }
}
```

## 集成到调度器

```javascript
const profile = classifier.classify(taskInput);

// 根据类型路由
switch (profile.type) {
  case TASK_TYPES.CODING:
    await assignToAgent('coder', profile);
    break;
  case TASK_TYPES.WRITING:
    await assignToAgent('writer', profile);
    break;
  case TASK_TYPES.RESEARCH:
    await assignToAgent('researcher', profile);
    break;
  default:
    await assignToAgent('general-purpose', profile);
}

// 根据优先级排序
if (profile.priority >= PRIORITY_LEVELS.HIGH) {
  taskQueue.priorityInsert(task, profile.priority);
} else {
  taskQueue.enqueue(task);
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
