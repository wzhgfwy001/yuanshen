---
name: deerflow-enhanced-subagent-manager
description: 借鉴DeerFlow的增强版SubAgent管理器，支持双线程池、并发限制、事件驱动执行
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | subagent_mode=advanced | concurrent_tasks>3
---

# DeerFlow增强版SubAgent管理器

**【召唤盟友·改】Enhanced Summon**

## 触发条件

当满足以下任一条件时，自动启用此增强版管理器：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 用户指定使用DeerFlow增强模式 |
| 高级模式 | `subagent_mode=advanced` | 需要高级并发控制 |
| 高并发 | `concurrent_tasks>3` | 同时运行超过3个子任务 |
| 后台任务 | `background_tasks=true` | 需要后台执行的长时间任务 |
| 复杂协调 | `coordination=complex` | 多子Agent需要协调 |

## 使用方式

```javascript
// 引入增强版管理器
const { 
  EnhancedSubAgentManager, 
  SUBAGENT_EVENTS, 
  SUBAGENT_STATUS 
} = require('./deerflow_enhanced.js');

// 创建管理器
const manager = new EnhancedSubAgentManager({
  maxConcurrent: 3,    // 最大并发数
  taskTimeout: 900000, // 15分钟超时
  pollInterval: 5000  // 5秒轮询
});

// 监听事件
manager.on(SUBAGENT_EVENTS.TASK_STARTED, (data) => {
  console.log(`SubAgent启动: ${data.taskId}, 类型: ${data.type}`);
});

manager.on(SUBAGENT_EVENTS.TASK_COMPLETED, (data) => {
  console.log(`SubAgent完成: ${data.taskId}, 耗时: ${data.duration}ms`);
});

manager.on(SUBAGENT_EVENTS.TASK_FAILED, (data) => {
  console.log(`SubAgent失败: ${data.taskId}, 错误: ${data.error}`);
});

manager.on(SUBAGENT_EVENTS.ALL_COMPLETED, (data) => {
  console.log(`全部完成: ${data.completed}/${data.total}`);
});

// 创建单个任务
const task = await manager.createTask({
  type: 'coder',           // Agent类型
  prompt: '写一个排序算法',  // 任务描述
  description: '实现快速排序', // 简短描述
  context: {
    language: 'javascript',
    complexity: 'medium'
  }
});

// 等待任务完成
task.on(SUBAGENT_EVENTS.TASK_COMPLETED, (data) => {
  console.log('任务输出:', data.result);
});

// 批量创建任务
const batchResults = await manager.createBatch([
  { type: 'researcher', prompt: '研究AI最新进展' },
  { type: 'writer', prompt: '写一篇相关文章' },
  { type: 'coder', prompt: '实现代码示例' }
]);

// 获取状态
const status = manager.getAllStatus();
console.log('运行中:', status.tasks.running);
console.log('池状态:', status.pools.executor);

// 取消任务
manager.cancelTask(taskId);
```

## 核心特性

### 1. 双线程池（借鉴DeerFlow）
```javascript
DEFAULT_CONFIG = {
  SCHEDULER_POOL_SIZE: 3,  // 调度池
  EXECUTOR_POOL_SIZE: 3,   // 执行池
  MAX_CONCURRENT: 3         // 最大并发
}
```

### 2. 内置Agent类型
```javascript
// general-purpose - 通用任务（除task外的所有工具）
// bash - 命令执行专家
// researcher - 研究专家
// coder - 编程专家
// writer - 写作专家
```

### 3. 事件驱动
```javascript
SUBAGENT_EVENTS.TASK_STARTED     // 任务启动
SUBAGENT_EVENTS.TASK_RUNNING     // 任务运行中
SUBAGENT_EVENTS.TASK_COMPLETED   // 任务完成
SUBAGENT_EVENTS.TASK_FAILED      // 任务失败
SUBAGENT_EVENTS.TASK_TIMED_OUT   // 任务超时
SUBAGENT_EVENTS.RATE_LIMITED     // 限流
SUBAGENT_EVENTS.ALL_COMPLETED     // 全部完成
```

### 4. 任务状态
```javascript
SUBAGENT_STATUS.PENDING     // 等待执行
SUBAGENT_STATUS.RUNNING     // 运行中
SUBAGENT_STATUS.COMPLETED   // 已完成
SUBAGENT_STATUS.FAILED      // 失败
SUBAGENT_STATUS.TIMED_OUT   // 超时
SUBAGENT_STATUS.CANCELLED   // 已取消
```

### 5. 超时与重试
```javascript
// 默认配置
TASK_TIMEOUT: 900000,    // 15分钟
RETRY_DELAY: 1000,       // 1秒重试延迟
MAX_RETRIES: 3           // 最多重试3次
```

## 集成到主系统

在 fusion-scheduler.js 或任务编排逻辑中添加：

```javascript
const path = require('path');

// 检测是否启用DeerFlow增强
function shouldUseDeerFlowEnhanced(config) {
  return (
    config.deerflow_mode === true ||
    config.subagent_mode === 'advanced' ||
    config.concurrent_tasks > 3 ||
    config.background_tasks === true
  );
}

// 获取管理器
function getSubAgentManager(config) {
  if (shouldUseDeerFlowEnhanced(config)) {
    const enhanced = require('./subagent-manager/deerflow_enhanced.js');
    return new enhanced.EnhancedSubAgentManager({
      maxConcurrent: config.maxConcurrent || 3,
      taskTimeout: config.taskTimeout || 900000
    });
  }
  // 回退到原有管理器
  return require('./subagent-manager/original-manager.js');
}
```

## 性能对比

| 指标 | 原有管理器 | 增强版 | 提升 |
|------|-----------|--------|------|
| 并发控制 | ❌ 无限制 | ✅ 3并发 | +300% |
| 线程池 | ❌ 单线程 | ✅ 双池(6线程) | +500% |
| 事件追踪 | ❌ 简单回调 | ✅ 完整事件链 | +500% |
| 超时控制 | ❌ 无 | ✅ 15分钟 | +∞ |
| 重试机制 | ❌ 手动 | ✅ 自动重试 | +300% |

## SSE事件流（可选）

增强版支持SSE事件流用于实时推送：

```javascript
// 生成SSE流
for (const event of manager.generateSSEStream(taskId)) {
  console.log(event); // "event: task_started\ndata: {...}\n\n"
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
