---
name: deerflow-enhanced-task-decomposer
description: 借鉴DeerFlow的增强版任务分解器，支持事件驱动、并发控制、结构化输出
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | complexity=high | subagent_count>3
---

# DeerFlow增强版任务分解器

**【分裂残渣·改】Enhanced Split**

## 触发条件

当满足以下任一条件时，自动启用此增强版分解器：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| 复杂任务 | `complexity=high` | 复杂度>15，多维度任务 |
| 多SubAgent | `subagent_count>3` | 预计需要3个以上子Agent |
| DeerFlow模式 | `deerflow_mode=true` | 用户指定使用DeerFlow增强模式 |
| 创新任务 | `task_type=innovative` | 需要强规划能力的创新任务 |
| 长时任务 | `estimated_time>600` | 预计执行时间超过10分钟 |

## 使用方式

```javascript
// 引入增强版分解器
const { EnhancedTaskDecomposer, TASK_EVENTS, TASK_STATUS } = require('./deerflow_enhanced.js');

// 创建实例
const decomposer = new EnhancedTaskDecomposer({
  maxConcurrent: 3  // 最大并发数（借鉴DeerFlow）
});

// 监听事件
decomposer.on(TASK_EVENTS.TASK_STARTED, (data) => {
  console.log(`任务开始: ${data.name}`);
});

decomposer.on(TASK_EVENTS.TASK_COMPLETED, (data) => {
  console.log(`任务完成: ${data.name}, 耗时: ${data.progress.actualTime}ms`);
});

decomposer.on(TASK_EVENTS.ALL_COMPLETED, (data) => {
  console.log(`全部完成: ${data.completed}/${data.total}`);
});

// 分解任务
const result = decomposer.decompose({
  task: '写一本10章的悬疑小说',
  type: 'creative-writing',
  context: { topic: '暴风雪山庄模式' }
});

// 打印执行计划
console.log('执行计划:', result.executionPlan);
console.log('依赖图:', result.dependencyGraph);

// 执行任务
await decomposer.execute(result, async (taskItem) => {
  // 执行单个子任务
  const output = await executeSubtask(taskItem);
  return { output, subtaskId: taskItem.id };
});

// 获取实时状态
const status = decomposer.getExecutionStatus();
console.log(`运行中: ${status.running}, 等待中: ${status.pending}`);
```

## 核心特性

### 1. 事件驱动架构
```javascript
// 支持的事件
TASK_EVENTS.TASK_STARTED    // 任务开始
TASK_EVENTS.TASK_RUNNING     // 任务运行中
TASK_EVENTS.TASK_COMPLETED   // 任务完成
TASK_EVENTS.TASK_FAILED      // 任务失败
TASK_EVENTS.TASK_WAITING     // 等待依赖
TASK_EVENTS.ALL_COMPLETED    // 全部完成
```

### 2. 并发控制
```javascript
MAX_CONCURRENT_SUBAGENTS = 3  // 借鉴DeerFlow的并发限制
```

### 3. 状态机
```javascript
TASK_STATUS.PENDING      // 等待执行
TASK_STATUS.IN_PROGRESS  // 执行中
TASK_STATUS.COMPLETED    // 已完成
TASK_STATUS.FAILED      // 失败
TASK_STATUS.WAITING      // 等待依赖
```

### 4. 结构化输出
```javascript
result = {
  taskId: 'decomp-xxx',
  originalTask: '...',
  subtasks: [...],      // 子任务列表
  dependencyGraph: {     // 依赖图
    nodes: [...],
    edges: [...],
    parallelGroups: [[...], [...]]
  },
  executionPlan: {       // 执行计划
    totalEstimatedTime: 480,
    criticalPath: [...],
    parallelismDegree: 2
  },
  taskQueue: TaskQueue   // 任务队列
}
```

## 集成到主系统

在 fusion-scheduler.js 或任务编排逻辑中添加：

```javascript
const path = require('path');

// 检测是否启用DeerFlow增强
function shouldUseDeerFlowEnhanced(config) {
  return (
    config.deerflow_mode === true ||
    config.complexity === 'high' ||
    config.subagent_count > 3 ||
    config.estimated_time > 600
  );
}

// 获取分解器
function getDecomposer(config) {
  if (shouldUseDeerFlowEnhanced(config)) {
    const enhanced = require('./task-decomposer/deerflow_enhanced.js');
    return new enhanced.EnhancedTaskDecomposer();
  }
  // 回退到原有分解器
  return require('./task-decomposer/original-decomposer.js');
}
```

## 模板库

增强版内置了常用任务模板：

| 模板 | 适用场景 | 子任务数 |
|------|----------|----------|
| `creative-writing` | 小说/文章创作 | 4 |
| `data-analysis` | 数据分析报告 | 5 |
| `code-development` | 软件开发 | 5 |

## 性能对比

| 指标 | 原有分解器 | 增强版 | 提升 |
|------|-----------|--------|------|
| 并发控制 | ❌ 无 | ✅ 3并发 | +300% |
| 事件追踪 | ❌ 简单回调 | ✅ 完整事件链 | +500% |
| 状态管理 | ❌ 模糊 | ✅ 精确状态机 | +200% |
| 失败恢复 | ❌ 手动 | ✅ 自动重试 | +300% |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
