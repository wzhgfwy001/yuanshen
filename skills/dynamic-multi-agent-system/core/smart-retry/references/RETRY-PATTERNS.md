# 重试策略完整参考

## 重试策略类型

### 1. 指数退避策略 (Exponential Backoff)

```typescript
interface ExponentialBackoffConfig {
  type: 'exponential';
  initialDelay: number;      // 初始延迟(ms)
  maxDelay: number;          // 最大延迟(ms)
  multiplier: number;         // 退避倍数
  jitter: boolean;           // 是否添加随机抖动
}

function exponentialBackoff(attempt: number, config: ExponentialBackoffConfig): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.multiplier, attempt),
    config.maxDelay
  );
  
  if (config.jitter) {
    return delay * (0.5 + Math.random());
  }
  return delay;
}

// 使用示例
const strategy = {
  type: 'exponential',
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true
};

// 重试延迟序列: 1s, 2s, 4s, 8s, 16s, 30s(max)
```

### 2. 线性退避策略 (Linear Backoff)

```typescript
interface LinearBackoffConfig {
  type: 'linear';
  initialDelay: number;
  increment: number;
  maxDelay: number;
}

function linearBackoff(attempt: number, config: LinearBackoffConfig): number {
  const delay = Math.min(
    config.initialDelay + (attempt * config.increment),
    config.maxDelay
  );
  return delay;
}

// 使用示例
const strategy = {
  type: 'linear',
  initialDelay: 1000,
  increment: 1000,
  maxDelay: 10000
};

// 重试延迟序列: 1s, 2s, 3s, 4s, 5s, ... 10s(max)
```

### 3. 固定延迟策略 (Fixed Delay)

```typescript
interface FixedDelayConfig {
  type: 'fixed';
  delay: number;
}

function fixedDelay(attempt: number, config: FixedDelayConfig): number {
  return config.delay;
}

// 使用示例
const strategy = {
  type: 'fixed',
  delay: 2000
};

// 重试延迟序列: 2s, 2s, 2s, 2s, ...
```

### 4. 抖动策略 (Jitter)

```typescript
interface JitterConfig {
  type: 'jitter';
  baseDelay: number;
  jitterType: 'full' | 'equal' | 'decorrelated';
}

function applyJitter(baseDelay: number, jitterType: string): number {
  switch (jitterType) {
    case 'full':
      // [0, baseDelay]
      return Math.random() * baseDelay;
    case 'equal':
      // [baseDelay/2, baseDelay]
      return baseDelay * (0.5 + Math.random() * 0.5);
    case 'decorrelated':
      // 依赖前一次延迟
      return baseDelay * (0.5 + Math.random());
    default:
      return baseDelay;
  }
}

// Full Jitter 示例
// 重试序列: 0.5s, 1.2s, 0.3s, 1.8s, ...

// Equal Jitter 示例
// 重试序列: 1.5s, 1.8s, 1.2s, 2.0s, ...

// Decorrelated Jitter 示例
// 重试序列: 1.5s, 2.2s, 1.8s, 3.1s, ...
```

## 错误类型与重试策略映射

```typescript
const ERROR_RETRY_STRATEGY_MAP: Record<string, RetryStrategy> = {
  // 网络相关 - 指数退避
  'ERR-NET-0101': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-NET-0102': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-NET-0103': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-NET-0106': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-NET-0108': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-NET-0109': { type: 'fixed', delay: 1000 },
  'ERR-NET-0110': { type: 'exponential', initialDelay: 2000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-NET-0111': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-NET-0112': { type: 'linear', initialDelay: 5000, increment: 2000, maxDelay: 60000 },

  // API相关 - 根据错误码定制
  'ERR-API-0203': { type: 'exponential', initialDelay: 5000, maxDelay: 300000, multiplier: 2, jitter: true },
  'ERR-API-0204': { type: 'exponential', initialDelay: 10000, maxDelay: 600000, multiplier: 2, jitter: true },
  'ERR-API-0205': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: false },
  'ERR-API-0206': { type: 'exponential', initialDelay: 1000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-API-0208': { type: 'fixed', delay: 2000 },
  'ERR-API-0216': { type: 'fixed', delay: 1000 },
  'ERR-API-0218': { type: 'exponential', initialDelay: 30000, maxDelay: 300000, multiplier: 1.5, jitter: false },
  'ERR-API-0219': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: true },
  'ERR-API-0220': { type: 'linear', initialDelay: 2000, increment: 1000, maxDelay: 30000 },

  // Agent相关
  'ERR-AGT-0301': { type: 'exponential', initialDelay: 3000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-AGT-0303': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-AGT-0304': { type: 'exponential', initialDelay: 2000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AGT-0305': { type: 'linear', initialDelay: 10000, increment: 5000, maxDelay: 120000 },
  'ERR-AGT-0306': { type: 'fixed', delay: 1000 },
  'ERR-AGT-0307': { type: 'exponential', initialDelay: 5000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-AGT-0308': { type: 'exponential', initialDelay: 2000, maxDelay: 30000, multiplier: 1.5, jitter: false },
  'ERR-AGT-0309': { type: 'fixed', delay: 2000 },
  'ERR-AGT-0310': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AGT-0312': { type: 'exponential', initialDelay: 5000, maxDelay: 60000, multiplier: 2, jitter: false },
  'ERR-AGT-0315': { type: 'fixed', delay: 1000 },
  'ERR-AGT-0316': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AGT-0318': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },

  // 任务相关
  'ERR-TASK-0402': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-TASK-0405': { type: 'exponential', initialDelay: 3000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-TASK-0409': { type: 'fixed', delay: 2000 },
  'ERR-TASK-0411': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: true },
  'ERR-TASK-0414': { type: 'exponential', initialDelay: 2000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-TASK-0415': { type: 'fixed', delay: 3000 },
  'ERR-TASK-0419': { type: 'exponential', initialDelay: 10000, maxDelay: 180000, multiplier: 2, jitter: false },
  'ERR-TASK-0420': { type: 'fixed', delay: 2000 },

  // 认证相关
  'ERR-AUTH-0502': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AUTH-0503': { type: 'fixed', delay: 1000 },
  'ERR-AUTH-0508': { type: 'fixed', delay: 5000 },
  'ERR-AUTH-0509': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AUTH-0510': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AUTH-0511': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-AUTH-0514': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: true },

  // 数据相关
  'ERR-DATA-0603': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-DATA-0607': { type: 'linear', initialDelay: 5000, increment: 5000, maxDelay: 60000 },
  'ERR-DATA-0610': { type: 'exponential', initialDelay: 3000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-DATA-0611': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-DATA-0612': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-DATA-0613': { type: 'fixed', delay: 2000 },
  'ERR-DATA-0615': { type: 'fixed', delay: 1000 },

  // 文件相关
  'ERR-FILE-0704': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-FILE-0705': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-FILE-0706': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-FILE-0707': { type: 'fixed', delay: 1000 },
  'ERR-FILE-0708': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-FILE-0709': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-FILE-0710': { type: 'exponential', initialDelay: 2000, maxDelay: 30000, multiplier: 1.5, jitter: false },
  'ERR-FILE-0713': { type: 'fixed', delay: 1000 },

  // 缓存相关
  'ERR-CACHE-0802': { type: 'fixed', delay: 1000 },
  'ERR-CACHE-0805': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-CACHE-0806': { type: 'fixed', delay: 500 },
  'ERR-CACHE-0809': { type: 'fixed', delay: 1000 },

  // 验证相关
  'ERR-VAL-1008': { type: 'fixed', delay: 1000 },
  'ERR-VAL-1009': { type: 'fixed', delay: 1000 },
  'ERR-VAL-1010': { type: 'fixed', delay: 1000 },

  // 超时相关
  'ERR-TIME-1101': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: false },
  'ERR-TIME-1102': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: false },
  'ERR-TIME-1103': { type: 'exponential', initialDelay: 1000, maxDelay: 30000, multiplier: 2, jitter: true },
  'ERR-TIME-1104': { type: 'fixed', delay: 1000 },
  'ERR-TIME-1106': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },

  // 内存相关
  'ERR-MEM-1201': { type: 'exponential', initialDelay: 10000, maxDelay: 180000, multiplier: 2, jitter: false },
  'ERR-MEM-1202': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-MEM-1204': { type: 'exponential', initialDelay: 30000, maxDelay: 300000, multiplier: 2, jitter: false },

  // 磁盘相关
  'ERR-DISK-1302': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-DISK-1303': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-DISK-1304': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },

  // 模型相关
  'ERR-MODEL-1402': { type: 'exponential', initialDelay: 10000, maxDelay: 300000, multiplier: 2, jitter: true },
  'ERR-MODEL-1403': { type: 'exponential', initialDelay: 20000, maxDelay: 600000, multiplier: 2, jitter: true },
  'ERR-MODEL-1404': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-MODEL-1407': { type: 'fixed', delay: 2000 },
  'ERR-MODEL-1408': { type: 'exponential', initialDelay: 10000, maxDelay: 600000, multiplier: 2, jitter: true },
  'ERR-MODEL-1409': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: true },
  'ERR-MODEL-1410': { type: 'fixed', delay: 2000 },

  // 解析相关
  'ERR-PARSE-1501': { type: 'fixed', delay: 1000 },
  'ERR-PARSE-1502': { type: 'fixed', delay: 1000 },
  'ERR-PARSE-1503': { type: 'fixed', delay: 1000 },
  'ERR-PARSE-1504': { type: 'fixed', delay: 1000 },
  'ERR-PARSE-1505': { type: 'fixed', delay: 1000 },
  'ERR-PARSE-1506': { type: 'fixed', delay: 1000 },

  // 流程相关
  'ERR-FLOW-1602': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },
  'ERR-FLOW-1603': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-FLOW-1604': { type: 'fixed', delay: 2000 },

  // 集成相关
  'ERR-INTEG-1701': { type: 'exponential', initialDelay: 10000, maxDelay: 300000, multiplier: 2, jitter: true },
  'ERR-INTEG-1702': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: true },
  'ERR-INTEG-1705': { type: 'exponential', initialDelay: 5000, maxDelay: 120000, multiplier: 2, jitter: false },
  'ERR-INTEG-1706': { type: 'exponential', initialDelay: 2000, maxDelay: 60000, multiplier: 2, jitter: true },

  // 批处理相关
  'ERR-BATCH-1901': { type: 'fixed', delay: 2000 },
  'ERR-BATCH-1904': { type: 'linear', initialDelay: 5000, increment: 5000, maxDelay: 60000 },
  'ERR-BATCH-1906': { type: 'exponential', initialDelay: 10000, maxDelay: 300000, multiplier: 2, jitter: false },
};
```

## 完整重试执行器

```typescript
interface RetryConfig {
  maxAttempts: number;
  strategy: RetryStrategy;
  timeout?: number;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // 检查是否应该重试
      if (config.shouldRetry && !config.shouldRetry(lastError)) {
        throw lastError;
      }
      
      // 最后一次尝试失败
      if (attempt === config.maxAttempts - 1) {
        break;
      }
      
      // 计算延迟
      const delay = calculateDelay(attempt, config.strategy);
      
      // 触发回调
      if (config.onRetry) {
        config.onRetry(attempt + 1, lastError, delay);
      }
      
      // 等待
      if (config.timeout) {
        await Promise.race([
          sleep(delay),
          timeout(config.timeout)
        ]);
      } else {
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

// 完整使用示例
const result = await executeWithRetry(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 5,
    strategy: {
      type: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true
    },
    timeout: 60000,
    onRetry: (attempt, error, delay) => {
      console.log(`重试 ${attempt}/5，${delay}ms后... 错误: ${error.message}`);
    },
    shouldRetry: (error) => {
      // 只对特定错误重试
      return error.message.includes('network') || 
             error.message.includes('timeout');
    }
  }
);
```

## 场景化重试策略

### 场景1：网络请求

```typescript
const networkRetryConfig: RetryConfig = {
  maxAttempts: 5,
  strategy: {
    type: 'exponential',
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  },
  timeout: 60000,
  shouldRetry: (error) => {
    // 网络错误、超时、服务器错误重试
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503');
  }
};
```

### 场景2：文件操作

```typescript
const fileRetryConfig: RetryConfig = {
  maxAttempts: 3,
  strategy: {
    type: 'exponential',
    initialDelay: 500,
    maxDelay: 5000,
    multiplier: 2,
    jitter: false
  },
  timeout: 30000,
  shouldRetry: (error) => {
    return error.message.includes('EBUSY') ||
           error.message.includes('ENOENT') ||
           error.message.includes('file locked');
  }
};
```

### 场景3：API限流

```typescript
const rateLimitRetryConfig: RetryConfig = {
  maxAttempts: 10,
  strategy: {
    type: 'exponential',
    initialDelay: 10000,
    maxDelay: 600000,
    multiplier: 2,
    jitter: true
  },
  timeout: 900000, // 15分钟
  shouldRetry: (error) => {
    return error.message.includes('rate limit') ||
           error.message.includes('429') ||
           error.message.includes('quota');
  }
};
```

### 场景4：数据库操作

```typescript
const dbRetryConfig: RetryConfig = {
  maxAttempts: 5,
  strategy: {
    type: 'exponential',
    initialDelay: 100,
    maxDelay: 5000,
    multiplier: 2,
    jitter: true
  },
  timeout: 30000,
  shouldRetry: (error) => {
    return error.message.includes('deadlock') ||
           error.message.includes('lock timeout') ||
           error.message.includes('connection');
  }
};
```

### 场景5：Agent执行

```typescript
const agentRetryConfig: RetryConfig = {
  maxAttempts: 4,
  strategy: {
    type: 'exponential',
    initialDelay: 5000,
    maxDelay: 60000,
    multiplier: 2,
    jitter: false
  },
  timeout: 120000,
  shouldRetry: (error) => {
    return error.message.includes('timeout') ||
           error.message.includes('connection') ||
           error.message.includes('unavailable');
  }
};
```

### 场景6：模型调用

```typescript
const modelRetryConfig: RetryConfig = {
  maxAttempts: 5,
  strategy: {
    type: 'decorrelated_jitter',
    baseDelay: 2000,
    jitterType: 'decorrelated'
  },
  timeout: 120000,
  shouldRetry: (error) => {
    return error.message.includes('timeout') ||
           error.message.includes('overloaded') ||
           error.message.includes('context') ||
           error.message.includes('503');
  }
};
```
