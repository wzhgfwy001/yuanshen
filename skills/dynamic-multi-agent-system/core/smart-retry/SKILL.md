---
name: deerflow-smart-retry
description: DeerFlow增强版智能重试 - 指数退避、错误分类、自动路由、重试统计
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | smart_retry=true | retry_enabled=true | fault_tolerance=true
---

# DeerFlow增强版智能重试系统

**【附魔·改】Retry Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 智能重试 | `smart_retry=true` | 启用智能重试 |
| 容错处理 | `fault_tolerance=true` | 启用容错机制 |

## 核心功能

### 1. 基础重试

```javascript
const { SmartRetry, RETRY_DECISIONS } = require('./deflow_enhanced.js');

const retry = new SmartRetry({
  policy: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: 0.1
  }
});

// 执行带重试的函数
const result = await retry.execute(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});

if (result.succeeded) {
  console.log('成功:', result.result);
} else {
  console.log('失败:', result.error);
}
```

### 2. 错误分类

```javascript
// 自动分类错误并决定是否重试
const result = await retry.execute(async () => {
  return await riskyOperation();
});

// 错误分类结果
// - TRANSIENT: 网络、限流、超时 (可重试)
// - RESOURCE: 资源不足 (可重试)
// - CLIENT: 客户端错误 (不重试)
// - SERVER: 服务端错误 (可重试)
// - UNKNOWN: 未知 (不重试)
```

### 3. Fallback机制

```javascript
// 定义fallback
const result = await retry.execute(
  async () => {
    return await callPrimaryAPI();
  },
  {
    fallback: async (error, attempts) => {
      console.log(`Fallback triggered after ${attempts.length} attempts`);
      // 使用缓存或备用服务
      return await callFallbackAPI();
    }
  }
);

if (result.usedFallback) {
  console.log('使用了fallback');
}
```

### 4. 事件监听

```javascript
retry.on('retry_started', ({ taskId }) => {
  console.log(`重试任务开始: ${taskId}`);
});

retry.on('retry_attempt', ({ taskId, attempt, reason, delay }) => {
  console.log(`尝试 ${attempt}: ${reason}, 等待 ${delay}ms`);
});

retry.on('retry_succeeded', ({ taskId, attempt, duration }) => {
  console.log(`成功! 尝试次数: ${attempt}, 耗时: ${duration}ms`);
});

retry.on('retry_aborted', ({ taskId, attempt, reason }) => {
  console.log(`中止: ${reason} (尝试 ${attempt})`);
});

retry.on('backoff_applied', ({ taskId, attempt, delay }) => {
  console.log(`退避: 尝试 ${attempt} 延迟 ${delay}ms`);
});
```

### 5. 包装现有函数

```javascript
// 包装函数自动重试
const fetchWithRetry = retry.wrap(async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});

// 使用
const data = await fetchWithRetry('https://api.example.com/data');
```

### 6. 获取统计

```javascript
const stats = retry.getStats();
console.log(`
总尝试: ${stats.totalAttempts}
成功: ${stats.succeeded}
失败: ${stats.failed}
中止: ${stats.aborted}
成功率: ${stats.successRate}
重试次数: ${stats.totalRetryAttempts}
平均延迟: ${stats.avgRetryDelay}

按错误类型:
${Object.entries(stats.byErrorType).map(([type, data]) => 
  `${type}: ${data.count}次`
).join('\n')}
`);
```

## 重试策略配置

```javascript
const policy = {
  maxAttempts: 5,           // 最多5次尝试
  initialDelayMs: 1000,     // 初始延迟1秒
  maxDelayMs: 60000,       // 最大延迟60秒
  backoffMultiplier: 2,    // 指数退避基数
  jitter: 0.2,             // 20%随机抖动
  timeoutMs: 30000,        // 单次超时30秒
  
  // 可重试的错误
  retryableErrors: [
    { type: 'network', patterns: ['ECONNRESET', 'ETIMEDOUT'] },
    { type: 'rate_limit', patterns: ['429', 'RATE_LIMIT'] },
    { type: 'server', patterns: ['500', '502', '503', '504'] }
  ],
  
  // 不可重试的错误
  nonRetryableErrors: [
    'Invalid API key',
    /auth.*failed/i
  ]
};
```

## 延迟计算示例

```
Attempt 1: 1000ms (initial)
Attempt 2: 1000 * 2^1 = 2000ms
Attempt 3: 1000 * 2^2 = 4000ms
Attempt 4: 1000 * 2^3 = 8000ms
Attempt 5: 1000 * 2^4 = 16000ms

加上 ±10-20% 随机抖动
```

## 集成示例

```javascript
// API调用包装器
async function callAPIWithRetry(endpoint, params) {
  const result = await retry.execute(
    () => api.post(endpoint, params),
    {
      context: { endpoint, params },
      fallback: async (error) => {
        console.log('API调用失败，使用缓存');
        return cache.get(endpoint);
      },
      onRetry: async (error, attempt, delay) => {
        console.log(`API重试 ${attempt}: ${error.message}`);
        await notifyMonitoring({ error, attempt, endpoint });
      }
    }
  );
  
  return result;
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
