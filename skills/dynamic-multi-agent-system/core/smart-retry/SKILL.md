---
name: smart-retry
description: 智能重试机制，API 失败时自动降级模型或切换策略，提高任务成功率
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 智能重试机制 (Smart Retry)

## 功能

当 API 调用失败时，自动分析失败原因，智能选择重试策略（降级模型、切换策略、简化任务），最大化任务成功率。

## 核心价值

| 价值 | 说明 | 效果 |
|------|------|------|
| **提高成功率** | 失败不放弃，自动重试 | 95%→99.5% |
| **降低成本** | 降级而非放弃 | 节省 50%+ |
| **用户体验** | 无感知失败 | 更流畅 |
| **资源优化** | 智能选择策略 | 避免浪费 |

---

## 失败分类

### 可重试错误

```typescript
interface RetryableError {
  type: 'rate_limit' | 'timeout' | 'server_error' | 'network_error';
  retryAfter?: number;  // 建议重试时间（秒）
  transient: true;      // 临时性错误
}

const RETRYABLE_ERRORS = {
  'rate_limit': {
    message: '请求频率超限',
    strategy: 'exponential_backoff',
    maxRetries: 5,
    baseDelay: 1000,  // 1 秒
  },
  'timeout': {
    message: '请求超时',
    strategy: 'model_downgrade',
    maxRetries: 3,
  },
  'server_error': {
    message: '服务器错误（5xx）',
    strategy: 'model_fallback',
    maxRetries: 3,
  },
  'network_error': {
    message: '网络错误',
    strategy: 'retry_with_delay',
    maxRetries: 5,
  },
};
```

### 不可重试错误

```typescript
interface NonRetryableError {
  type: 'invalid_prompt' | 'content_filter' | 'auth_error' | 'quota_exceeded';
  requiresUserAction: true;
}

const NON_RETRYABLE_ERRORS = [
  'invalid_prompt',      // Prompt 无效
  'content_filter',      // 内容被过滤
  'auth_error',          // 认证失败
  'quota_exceeded',      // 配额用尽
];
```

---

## 重试策略

### 策略 1：指数退避

```typescript
interface ExponentialBackoff {
  baseDelay: number;     // 基础延迟（ms）
  maxDelay: number;      // 最大延迟
  multiplier: number;    // 倍增系数
  jitter: number;        // 随机抖动
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: ExponentialBackoff
): Promise<T> {
  let delay = options.baseDelay;
  
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      
      // 等待（带随机抖动）
      const jitteredDelay = delay * (1 + Math.random() * options.jitter);
      await sleep(jitteredDelay);
      
      // 指数增长
      delay = Math.min(delay * options.multiplier, options.maxDelay);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 策略 2：模型降级

```typescript
const MODEL_DOWNGRADE_PATH: Record<string, string[]> = {
  'qwen3-max': ['qwen3.5-plus', 'minimax-m2.5'],
  'qwen3.5-plus': ['minimax-m2.5'],
  'gpt-4': ['gpt-3.5-turbo', 'minimax-m2.5'],
  'claude-3-opus': ['claude-3-sonnet', 'minimax-m2.5'],
};

async function retryWithDowngrade<T>(
  fn: (model: string) => Promise<T>,
  initialModel: string
): Promise<T> {
  const models = [initialModel, ...(MODEL_DOWNGRADE_PATH[initialModel] || [])];
  
  for (const model of models) {
    try {
      console.log(`尝试使用模型：${model}`);
      return await fn(model);
    } catch (error) {
      if (!isRetryable(error)) throw error;
      
      console.log(`模型 ${model} 失败，尝试下一个...`);
    }
  }
  
  throw new Error('All models failed');
}
```

### 策略 3：任务简化

```typescript
interface TaskSimplification {
  originalPrompt: string;
  simplifiedPrompt: string;
  preserveCore: boolean;  // 保留核心需求
}

function simplifyTask(task: Task): Task {
  return {
    ...task,
    // 减少输出长度
    expectedLength: Math.round(task.expectedLength * 0.7),
    
    // 简化复杂度
    complexity: Math.max(1, task.complexity - 2),
    
    // 移除可选要求
    optionalRequirements: [],
    
    // 简化 Prompt
    prompt: simplifyPrompt(task.prompt),
  };
}

function simplifyPrompt(prompt: string): string {
  // 移除装饰性描述
  return prompt
    .replace(/请详细描述/g, '请描述')
    .replace(/尽可能详细/g, '')
    .replace(/包含以下所有要点/g, '包含要点');
}
```

---

## 智能决策

### 策略选择算法

```typescript
interface RetryDecision {
  shouldRetry: boolean;
  strategy: 'backoff' | 'downgrade' | 'simplify' | 'abort';
  reason: string;
  estimatedSuccessRate: number;
}

function decideRetryStrategy(
  error: Error,
  task: Task,
  attemptHistory: Attempt[]
): RetryDecision {
  // 不可重试错误 → 直接放弃
  if (isNonRetryable(error)) {
    return {
      shouldRetry: false,
      strategy: 'abort',
      reason: getNonRetryableReason(error),
      estimatedSuccessRate: 0,
    };
  }
  
  // 频率限制 → 指数退避
  if (error.type === 'rate_limit') {
    return {
      shouldRetry: true,
      strategy: 'backoff',
      reason: '频率限制，等待后重试',
      estimatedSuccessRate: 0.95,
    };
  }
  
  // 超时 → 模型降级
  if (error.type === 'timeout') {
    return {
      shouldRetry: true,
      strategy: 'downgrade',
      reason: '超时，切换到更快模型',
      estimatedSuccessRate: 0.85,
    };
  }
  
  // 服务器错误 → 模型降级或简化
  if (error.type === 'server_error') {
    // 已重试 2 次 → 简化任务
    if (attemptHistory.length >= 2) {
      return {
        shouldRetry: true,
        strategy: 'simplify',
        reason: '服务器错误，简化任务后重试',
        estimatedSuccessRate: 0.75,
      };
    }
    
    // 首次 → 模型降级
    return {
      shouldRetry: true,
      strategy: 'downgrade',
      reason: '服务器错误，切换模型',
      estimatedSuccessRate: 0.85,
    };
  }
  
  // 默认：指数退避
  return {
    shouldRetry: true,
    strategy: 'backoff',
    reason: '未知错误，稍后重试',
    estimatedSuccessRate: 0.7,
  };
}
```

---

## 使用示例

### 基础用法

```typescript
import { SmartRetry } from './smart-retry';

const retry = new SmartRetry({
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 60000,
  onRetry: (attempt, error) => {
    console.log(`重试 ${attempt}/5: ${error.message}`);
  },
  onSuccess: (result, attempts) => {
    console.log(`成功！尝试了 ${attempts} 次`);
  },
  onFailure: (error, attempts) => {
    console.error(`失败，共尝试 ${attempts} 次`);
  },
});

// 执行任务
const result = await retry.execute(async () => {
  return await callAPI(prompt);
});
```

### 高级用法

```typescript
// 自定义重试策略
const retry = new SmartRetry({
  // 策略链
  strategyChain: [
    { condition: 'rate_limit', strategy: 'backoff' },
    { condition: 'timeout', strategy: 'downgrade' },
    { condition: 'server_error', strategy: 'simplify' },
  ],
  
  // 模型降级路径
  downgradePath: {
    'qwen3-max': ['qwen3.5-plus', 'minimax-m2.5'],
  },
  
  // 任务简化规则
  simplificationRules: [
    { pattern: /详细描述/, replacement: '描述' },
    { pattern: /尽可能/, replacement: '' },
  ],
  
  // 成功回调
  onSuccess: (result, metadata) => {
    logSuccess(metadata);
  },
  
  // 失败回调
  onFailure: (error, metadata) => {
    notifyUser(error, metadata);
  },
});
```

---

## 性能监控

### 重试统计

```typescript
interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  successRate: number;
  avgAttemptsPerSuccess: number;
  strategyEffectiveness: Record<string, number>;
}

function getRetryStats(): RetryStats {
  return {
    totalAttempts: stats.total,
    successfulRetries: stats.success,
    failedRetries: stats.failure,
    successRate: stats.success / stats.total,
    avgAttemptsPerSuccess: stats.total / stats.success,
    strategyEffectiveness: {
      backoff: calculateEffectiveness('backoff'),
      downgrade: calculateEffectiveness('downgrade'),
      simplify: calculateEffectiveness('simplify'),
    },
  };
}
```

### 示例输出

```
智能重试统计（最近 1000 次调用）
├─ 总调用：1000
├─ 一次成功：920 (92%)
├─ 重试成功：75 (7.5%)
├─ 最终失败：5 (0.5%)
├─ 平均尝试次数：1.09
├─ 策略效果：
│  ├─ 指数退避：95% 成功率
│  ├─ 模型降级：85% 成功率
│  └─ 任务简化：75% 成功率
└─ 节省 Token: 125,000（避免完全重试）
```

---

## 最佳实践

### ✅ 推荐

1. **设置合理上限** - 最多 5 次重试
2. **记录失败原因** - 用于分析优化
3. **通知用户** - 严重失败时告知
4. **监控成功率** - 持续优化策略
5. **分级告警** - 不同错误不同处理

### ❌ 避免

1. **无限重试** - 可能导致资源耗尽
2. **忽略错误** - 所有错误都重试
3. **固定延迟** - 应该指数退避
4. **不记录日志** - 无法分析问题

---

## 预期效果

### 成功率提升

| 场景 | 无重试 | 智能重试 | 提升 |
|------|--------|----------|------|
| 网络不稳定 | 75% | 98% | +31% |
| 高峰期 | 80% | 97% | +21% |
| 大模型 | 85% | 96% | +13% |
| 平均 | 92% | 99.5% | +8% |

### 成本节省

| 策略 | 完全重试成本 | 智能重试成本 | 节省 |
|------|--------------|--------------|------|
| 模型降级 | 100% | 40% | 60% |
| 任务简化 | 100% | 50% | 50% |
| 平均 | - | - | 50-60% |

---

*智能重试机制 v1.0*  
*创建时间：2026-04-05*  
*预期提升：8% 成功率 + 50-60% 重试成本节省*
