---
name: deerflow-executor-coordinator
description: DeerFlow增强版执行协调器 - 多阶段编排、依赖管理、失败恢复、执行计划
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | orchestration=true | multi_phase=true | execution_plan=true
---

# DeerFlow增强版执行协调器

**【附魔·改】Coordination Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 编排 | `orchestration=true` | 多阶段编排 |
| 执行计划 | `execution_plan=true` | 执行计划管理 |

## 核心功能

### 1. 创建执行计划

```javascript
const { ExecutorCoordinator, ExecutionPlan, ExecutionPhase } = require('./deerflow_enhanced.js');

const coordinator = new ExecutorCoordinator();

// 创建计划
const plan = coordinator.createPlan('my-workflow')
  .addPhase(new ExecutionPhase('prepare', {
    executor: async (ctx) => { /* 准备阶段 */ },
    timeout: 30000
  }))
  .addPhase(new ExecutionPhase('process', {
    executor: async (ctx) => { /* 处理阶段 */ },
    dependencies: ['prepare'],
    retryCount: 2
  }))
  .addPhase(new ExecutionPhase('finalize', {
    executor: async (ctx) => { /* 完成阶段 */ },
    dependencies: ['process']
  }));
```

### 2. 执行计划

```javascript
const result = await coordinator.executePlan('my-workflow', {
  initialData: 'value'
});

console.log(`
状态: ${result.status}
耗时: ${result.duration}ms
结果: ${JSON.stringify(result.results)}
`);
```

### 3. 带Fallback的执行

```javascript
const plan = coordinator.createPlan('with-fallback')
  .addPhase(new ExecutionPhase('primary', {
    executor: async (ctx) => { return await primaryService(ctx); },
    fallback: async (ctx, error) => {
      console.log('主服务失败，使用备用');
      return await fallbackService(ctx);
    }
  }));
```

### 4. 阶段事件

```javascript
coordinator.on('execution_started', (exec) => {
  console.log(`开始执行: ${exec.planName}`);
});

coordinator.on('phase_started', ({ phase }) => {
  console.log(`阶段开始: ${phase}`);
});

coordinator.on('phase_completed', ({ phase, result }) => {
  console.log(`阶段完成: ${phase}`);
});

coordinator.on('phase_failed', ({ phase, error }) => {
  console.error(`阶段失败: ${phase} - ${error}`);
});

coordinator.on('execution_completed', (exec) => {
  console.log(`执行完成: ${exec.planName}, 耗时: ${exec.duration}ms`);
});

coordinator.on('execution_failed', (exec) => {
  console.error(`执行失败: ${exec.error}`);
});
```

### 5. 获取统计

```javascript
const stats = coordinator.getStats();
console.log(`
总执行数: ${stats.total}
成功: ${stats.completed}
失败: ${stats.failed}
成功率: ${stats.successRate}
平均耗时: ${stats.avgDuration}
`);
```

## 配置

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `maxConcurrent` | 3 | 最大并发数 |
| `enableOptimization` | true | 启用执行优化 |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
