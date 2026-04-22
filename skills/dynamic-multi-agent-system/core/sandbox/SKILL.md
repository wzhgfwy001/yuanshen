---
name: deerflow-sandbox-execution
description: DeerFlow增强版沙箱执行系统 - 隔离执行、安全审计、资源限制
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | sandbox_mode=true | untrusted_code=true | isolated_execution=true
---

# DeerFlow增强版沙箱执行系统

**【附魔·改】Sandbox Enchant**

## 触发条件

当满足以下任一条件时，自动启用沙箱隔离执行：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 沙箱模式 | `sandbox_mode=true` | 明确启用沙箱 |
| 不信任代码 | `untrusted_code=true` | 执行第三方/用户代码 |
| 隔离执行 | `isolated_execution=true` | 需要进程隔离 |
| 资源限制 | `resource_limit=true` | 需要CPU/内存限制 |
| 安全审计 | `security_audit=true` | 需要操作审计日志 |

## 核心功能

### 1. 沙箱实例创建

```javascript
const { SandboxInstance } = require('./deerflow_enhanced.js');

// 创建沙箱实例
const sandbox = new SandboxInstance({
  name: 'my-sandbox',
  timeout: 30000,  // 30秒超时
  resourceLimits: {
    maxMemoryMB: 256,
    maxCPUPercent: 50
  }
});

// 初始化
await sandbox.initialize();
console.log('沙箱已创建:', sandbox.id);
```

### 2. 安全代码执行

```javascript
// 在沙箱中执行代码
const result = await sandbox.execute(`
  // 安全受限的代码
  const greeting = 'Hello, DeerFlow!';
  console.log(greeting);
  return { message: greeting, math: 2 + 2 };
`, { context: 'user-data' });

console.log('执行结果:', result.result);
console.log('输出:', result.result.outputs);
console.log('耗时:', result.duration, 'ms');
```

### 3. 资源监控

```javascript
const { ResourceMonitor } = require('./deerflow_enhanced.js');

const monitor = new ResourceMonitor({
  maxMemoryMB: 512,
  maxCPUPercent: 80
});

monitor.on('resource_update', (usage) => {
  console.log('内存:', usage.memoryMB, 'MB');
  console.log('CPU:', usage.cpuPercent, '%');
});

monitor.start();

// 检查资源
const isOk = monitor.isWithinLimits();
console.log('资源正常:', isOk);

monitor.stop();
```

### 4. 审计日志

```javascript
const { AuditLogger } = require('./deerflow_enhanced.js');

const logger = new AuditLogger({
  logPath: 'sandbox-audit.log'
});

logger.on('logged', (entry) => {
  console.log('审计:', entry.action, entry.timestamp);
});

// 记录操作
logger.log('task_started', { taskId: '123', code: '...' });
logger.log('task_completed', { taskId: '123', duration: 1000 });

// 查询日志
const errors = logger.query({ action: 'task_error' });
console.log('错误统计:', errors);

// 统计
const stats = logger.getStatistics();
console.log('总操作:', stats.total);
```

### 5. 沙箱池管理

```javascript
const { SandboxPool } = require('./deerflow_enhanced.js');

const pool = new SandboxPool({
  minSize: 2,
  maxSize: 10,
  idleTimeout: 60000
});

// 获取沙箱
const sandbox = await pool.acquire('code-executor');

// 执行任务
await sandbox.execute(`return 42;`);

// 释放回池
pool.release(sandbox);

// 获取状态
const status = pool.getStatus();
console.log(`池状态: ${status.available} 空闲, ${status.inUse} 使用中`);

// 清理所有
pool.terminateAll();
```

## 资源限制

| 资源 | 默认值 | 可配置范围 | 说明 |
|------|--------|-----------|------|
| 内存 | 512MB | 64-2048MB | 堆内存限制 |
| CPU | 80% | 10-100% | 最大CPU占用 |
| 超时 | 5分钟 | 1秒-30分钟 | 单任务超时 |
| 输出 | 1MB | 64KB-10MB | 最大输出大小 |
| 文件 | 10MB | 1-100MB | 最大文件大小 |

## 安全特性

### 1. 进程隔离
- 每个沙箱在独立进程中运行
- 使用 `fork()` 创建隔离环境
- `SIGKILL` 强制终止超时进程

### 2. 资源限制
- V8堆内存限制 (--max-old-space-size)
- CPU使用率监控
- 自动终止超限进程

### 3. 模块访问控制
```javascript
// 禁用的模块
blockedModules: ['child_process', 'fs', 'net', 'tls', 'http', 'https']

// 仅允许的路径
allowedPaths: [os.tmpdir()]
```

### 4. 输出捕获
- 所有 `console.log` 被捕获
- 限制输出大小防止内存耗尽
- JSON序列化保证数据完整

### 5. 审计追踪
```javascript
// 自动记录
- sandbox_initializing
- task_started
- task_output
- task_completed
- task_timeout
- task_error
- sandbox_terminated
```

## 事件系统

```javascript
sandbox.on('task_started', ({ sandboxId, taskId }) => {
  console.log('任务开始:', taskId);
});

sandbox.on('task_output', ({ taskId, output }) => {
  process.stdout.write(output);
});

sandbox.on('task_completed', ({ sandboxId, task }) => {
  console.log('完成:', task.duration, 'ms');
});

sandbox.on('task_timeout', ({ sandboxId, taskId, timeout }) => {
  console.error('任务超时:', timeout);
});

pool.on('sandbox_acquired', ({ sandboxId }) => {
  console.log('沙箱分配:', sandboxId);
});
```

## 集成到主系统

```javascript
// 在任务执行前决定是否使用沙箱
const shouldUseSandbox = (config) => {
  return config.deerflow_mode || 
         config.untrusted_code || 
         config.isolated_execution;
};

// 任务执行
if (shouldUseSandbox(taskConfig)) {
  const sandbox = await sandboxPool.acquire('default');
  result = await sandbox.execute(taskCode, taskContext);
  sandboxPool.release(sandbox);
} else {
  result = await eval(taskCode); // 直接执行
}
```

## 性能对比

| 特性 | 直接执行 | 沙箱执行 | 改进 |
|------|---------|---------|------|
| 隔离性 | ❌ 无 | ✅ 进程级隔离 | +∞ |
| 资源控制 | ❌ 无 | ✅ 监控+限制 | +∞ |
| 错误捕获 | ⚠️ 部分 | ✅ 完全 | +100% |
| 审计追踪 | ❌ 无 | ✅ 完整日志 | +∞ |
| 性能开销 | 0ms | +50-100ms | -10-20% |

## 使用场景

| 场景 | 推荐配置 |
|------|---------|
| 执行用户提交的代码 | `untrusted_code=true` |
| 运行第三方脚本 | `sandbox_mode=true` |
| 需要结果验证 | `security_audit=true` |
| 高并发任务 | 使用 `SandboxPool` |
| 长时间运行任务 | 增加 `timeout` |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
