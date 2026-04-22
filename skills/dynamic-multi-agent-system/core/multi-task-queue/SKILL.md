---
name: deerflow-multi-task-queue
description: DeerFlow增强版多任务队列 - 优先级队列、多队列管理、任务依赖、动态限流
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | task_queue=true | priority_queue=true | concurrent_tasks=true
---

# DeerFlow增强版多任务队列

**【附魔·改】Queue Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 任务队列 | `task_queue=true` | 启用任务队列 |
| 优先级队列 | `priority_queue=true` | 优先级调度 |
| 并发任务 | `concurrent_tasks=true` | 并发执行 |

## 核心功能

### 1. 基础使用

```javascript
const { MultiTaskQueue } = require('./deerflow_enhanced.js');

const queue = new MultiTaskQueue({
  maxConcurrent: 5,
  maxQueueSize: 1000
});

// 添加任务
queue.addTask(
  { data: { action: 'process', value: 123 } },
  { priority: 1 }
);

queue.addTask(
  { data: async () => { return await fetchData(); } },
  { priority: 10 }
);
```

### 2. 优先级队列

```javascript
// 低优先级
queue.addTask(task, { priority: 1 });

// 普通优先级
queue.addTask(task, { priority: 5 });

// 高优先级
queue.addTask(task, { priority: 10 });

// 紧急
queue.addTask(task, { priority: 100 });
```

### 3. 任务依赖

```javascript
// 创建依赖任务
const taskA = queue.addTask({ data: async () => stepA() });
const taskB = queue.addTask(
  { data: async () => stepB() },
  { dependencies: [taskA.id] }  // 等待taskA完成
);
const taskC = queue.addTask(
  { data: async () => stepC() },
  { dependencies: [taskA.id, taskB.id] }  // 等待taskA和taskB
);
```

### 4. 多队列

```javascript
// 添加到指定队列
queue.addTask(task, { queue: 'high-priority' });
queue.addTask(task, { queue: 'low-priority' });
queue.addTask(task, { queue: 'background' });

// 获取队列状态
const status = queue.getQueueStatus();
console.log(status);
// { default: 10, 'high-priority': 5, 'low-priority': 20, background: 100 }
```

### 5. 任务事件

```javascript
queue.on('task_added', ({ task, queue }) => {
  console.log(`新任务: ${task.id} -> ${queue}`);
});

queue.on('task_started', ({ task }) => {
  console.log(`开始执行: ${task.id}`);
});

queue.on('task_completed', ({ task, result }) => {
  console.log(`完成: ${task.id}, 耗时: ${task.getDuration()}ms`);
});

queue.on('task_failed', ({ task, error }) => {
  console.error(`失败: ${task.id}, 错误: ${error.message}`);
});
```

### 6. 任务管理

```javascript
// 获取任务状态
const status = queue.getTaskStatus(taskId);
console.log(status);
// {
//   id: 'task-xxx',
//   status: 'completed',
//   priority: 5,
//   attempts: 1,
//   duration: 1234,
//   ...
// }

// 获取统计
const stats = queue.getStats();
console.log(`
总任务: ${stats.totalTasks}
运行中: ${stats.running}
已完成: ${stats.completed}
失败: ${stats.failed}
`);

// 取消任务
queue.cancelTask(taskId);

// 清空队列
queue.clearQueue('background');
```

## 配置选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `maxConcurrent` | 5 | 最大并发数 |
| `maxQueueSize` | 1000 | 队列最大长度 |
| `defaultTimeout` | 30000ms | 默认超时时间 |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
