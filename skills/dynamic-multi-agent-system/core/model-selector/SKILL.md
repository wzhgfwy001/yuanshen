---
name: model-selector
description: 智能模型选择器，根据任务复杂度、预算、延迟要求自动选择最优模型
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 智能模型选择器 (Model Selector)

## 功能

根据任务复杂度、Token 预算、延迟要求，自动选择最优模型，最大化性价比，节省 Token 消耗。

## 模型矩阵

### 可用模型

| 模型 | 能力 | 速度 | 成本 | 适用场景 |
|------|------|------|------|----------|
| **MiniMax-M2.5** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ¥ | 简单任务、快速响应 |
| **Qwen3-Coder** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥ | 代码开发、技术任务 |
| **Qwen3.5-Plus** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥ | 标准任务、平衡选择 |
| **Qwen3-Max** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 复杂任务、高质量 |
| **GPT-4** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 英文任务、国际场景 |
| **Claude-3** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 长文本、分析任务 |

---

## 选择算法

### 1. 任务复杂度分析

```typescript
interface TaskComplexity {
  score: number;          // 1-10
  dimensions: {
    length: number;       // 输出长度要求
    difficulty: number;   // 认知难度
    structure: number;    // 结构化程度
    creativity: number;   // 创意要求
    accuracy: number;     // 精度要求
  };
}

function analyzeComplexity(task: Task): TaskComplexity {
  const score = (
    task.expectedLength * 0.2 +      // 长度权重 20%
    task.cognitiveLoad * 0.3 +       // 难度权重 30%
    task.structureRequirement * 0.15 + // 结构权重 15%
    task.creativityRequirement * 0.2 + // 创意权重 20%
    task.accuracyRequirement * 0.15    // 精度权重 15%
  );
  
  return { score, dimensions: { ... } };
}
```

### 2. 模型选择规则

```typescript
function selectModel(complexity: number, budget?: number, urgency?: string): string {
  // 紧急任务 → 最快模型
  if (urgency === 'high') {
    return 'minimax-m2.5';
  }
  
  // 预算有限 → 最便宜模型
  if (budget && budget < 10000) {
    return 'minimax-m2.5';
  }
  
  // 简单任务（复杂度 <4）→ 轻量模型
  if (complexity < 4) {
    return 'minimax-m2.5';
  }
  
  // 中等任务（4-7）→ 平衡模型
  if (complexity < 7) {
    return 'qwen3.5-plus';
  }
  
  // 复杂任务（≥7）→ 强力模型
  if (complexity >= 7) {
    return 'qwen3-max';
  }
  
  // 默认
  return 'qwen3.5-plus';
}
```

### 3. 特殊场景处理

```typescript
// 代码任务 → Qwen3-Coder
if (task.type === 'coding' || task.language === 'code') {
  return 'qwen3-coder-plus';
}

// 英文任务 → GPT-4
if (task.language === 'en' || task.targetLanguage === 'en') {
  return 'gpt-4';
}

// 长文本（>10000 字）→ Claude-3
if (task.expectedLength > 10000) {
  return 'claude-3-opus';
}

// 数学推理 → Qwen3-Max
if (task.requiresMath) {
  return 'qwen3-max';
}
```

---

## 成本估算

### Token 成本计算

```typescript
interface ModelPricing {
  inputCost: number;     // 每 1K Token 输入成本
  outputCost: number;    // 每 1K Token 输出成本
  currency: string;
}

const PRICING: Record<string, ModelPricing> = {
  'minimax-m2.5': { inputCost: 0.001, outputCost: 0.002, currency: 'CNY' },
  'qwen3-coder-plus': { inputCost: 0.002, outputCost: 0.006, currency: 'CNY' },
  'qwen3.5-plus': { inputCost: 0.004, outputCost: 0.012, currency: 'CNY' },
  'qwen3-max': { inputCost: 0.02, outputCost: 0.06, currency: 'CNY' },
  'gpt-4': { inputCost: 0.03, outputCost: 0.06, currency: 'USD' },
  'claude-3-opus': { inputCost: 0.015, outputCost: 0.075, currency: 'USD' },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  return (inputTokens / 1000) * pricing.inputCost + 
         (outputTokens / 1000) * pricing.outputCost;
}
```

### 性价比优化

```typescript
interface CostBenefitAnalysis {
  model: string;
  estimatedQuality: number;    // 1-10
  estimatedCost: number;
  costPerQuality: number;      // 越低越好
}

function analyzeCostBenefit(task: Task): CostBenefitAnalysis[] {
  const models = Object.keys(PRICING);
  
  return models.map(model => {
    const quality = predictQuality(model, task);
    const cost = estimateCost(model, task.inputTokens, task.outputTokens);
    
    return {
      model,
      estimatedQuality: quality,
      estimatedCost: cost,
      costPerQuality: cost / quality,
    };
  }).sort((a, b) => a.costPerQuality - b.costPerQuality);
}
```

---

## Fallback 策略

### 主备模型链

```typescript
interface FallbackChain {
  primary: string;
  fallbacks: string[];
  retryOnErrors: string[];
}

const FALLBACK_CHAINS: Record<string, FallbackChain> = {
  'high-quality': {
    primary: 'qwen3-max',
    fallbacks: ['qwen3.5-plus', 'minimax-m2.5'],
    retryOnErrors: ['rate_limit', 'timeout', 'server_error'],
  },
  'balanced': {
    primary: 'qwen3.5-plus',
    fallbacks: ['minimax-m2.5'],
    retryOnErrors: ['rate_limit', 'timeout'],
  },
  'cost-effective': {
    primary: 'minimax-m2.5',
    fallbacks: [],  // 无 fallback，失败即返回
    retryOnErrors: ['timeout'],
  },
};
```

### 自动重试

```typescript
async function callWithFallback(prompt: string, chain: FallbackChain): Promise<string> {
  const models = [chain.primary, ...chain.fallbacks];
  
  for (const model of models) {
    try {
      const response = await callAPI(model, prompt);
      return response;
    } catch (error) {
      if (chain.retryOnErrors.includes(error.type)) {
        console.log(`模型 ${model} 失败，尝试下一个...`);
        continue;
      } else {
        throw error;  // 非可重试错误，直接抛出
      }
    }
  }
  
  throw new Error('所有模型都失败了');
}
```

---

## 使用示例

### 基础用法

```typescript
import { ModelSelector } from './model-selector';

const selector = new ModelSelector({
  budget: 10000,        // Token 预算
  urgency: 'normal',    // normal | high
  qualityPreference: 'balanced',  // high | balanced | cost-effective
});

// 选择模型
const model = selector.select(task);
console.log(`选择模型：${model}`);

// 估算成本
const cost = selector.estimateCost(model, task);
console.log(`预估成本：${cost} Token`);

// 调用 API
const response = await callWithFallback(prompt, {
  primary: model,
  fallbacks: selector.getFallbacks(model),
  retryOnErrors: ['rate_limit', 'timeout'],
});
```

### 批量任务优化

```typescript
// 多个任务批量处理
const tasks = [task1, task2, task3, task4, task5];

// 按复杂度分组
const simpleTasks = tasks.filter(t => selector.analyzeComplexity(t) < 4);
const mediumTasks = tasks.filter(t => {
  const c = selector.analyzeComplexity(t);
  return c >= 4 && c < 7;
});
const complexTasks = tasks.filter(t => selector.analyzeComplexity(t) >= 7);

// 分别选择模型
const simpleModel = selector.select({ complexity: 'simple' });
const mediumModel = selector.select({ complexity: 'medium' });
const complexModel = selector.select({ complexity: 'high' });

// 批量处理
const simpleResults = await processBatch(simpleTasks, simpleModel);
const mediumResults = await processBatch(mediumTasks, mediumModel);
const complexResults = await processBatch(complexTasks, complexModel);
```

---

## 性能监控

### 模型性能追踪

```typescript
interface ModelPerformance {
  model: string;
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  avgQuality: number;
  avgCost: number;
}

function trackPerformance(model: string, result: CallResult) {
  const perf = performanceTracker.get(model) || {
    model,
    totalCalls: 0,
    successRate: 1,
    avgResponseTime: 0,
    avgQuality: 0,
    avgCost: 0,
  };
  
  perf.totalCalls++;
  perf.successRate = updateSuccessRate(perf.successRate, result.success);
  perf.avgResponseTime = updateAverage(perf.avgResponseTime, result.responseTime);
  perf.avgQuality = updateAverage(perf.avgQuality, result.quality);
  perf.avgCost = updateAverage(perf.avgCost, result.cost);
  
  performanceTracker.set(model, perf);
}
```

### 实时统计

```
模型性能统计（最近 100 次调用）
├─ MiniMax-M2.5
│  ├─ 调用次数：45
│  ├─ 成功率：98%
│  ├─ 平均响应：1.2s
│  ├─ 平均质量：7.2/10
│  └─ 平均成本：¥0.05/次
├─ Qwen3.5-Plus
│  ├─ 调用次数：35
│  ├─ 成功率：96%
│  ├─ 平均响应：3.5s
│  ├─ 平均质量：8.5/10
│  └─ 平均成本：¥0.15/次
└─ Qwen3-Max
   ├─ 调用次数：20
   ├─ 成功率：94%
   ├─ 平均响应：8.2s
   ├─ 平均质量：9.3/10
   └─ 平均成本：¥0.45/次
```

---

## 最佳实践

### ✅ 推荐

1. **根据任务选择** - 不要一刀切用最强模型
2. **设置预算** - 避免 Token 超支
3. **配置 Fallback** - 提高可用性
4. **监控性能** - 持续优化选择策略
5. **批量处理** - 相似任务一起处理

### ❌ 避免

1. **过度配置** - 简单任务用 Qwen3-Max 浪费
2. **无预算控制** - 可能导致 Token 爆炸
3. **单一模型** - 无 fallback 风险高
4. **忽略统计** - 无法优化选择策略

---

## 预期效果

### Token 节省

| 场景 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| 简单任务 | Qwen3-Max (5000) | MiniMax (2000) | 60% |
| 中等任务 | Qwen3-Max (8000) | Qwen3.5-Plus (5000) | 37.5% |
| 复杂任务 | Qwen3-Max (15000) | Qwen3-Max (15000) | 0% |
| **平均** | - | - | **30-50%** |

### 成本节省

| 场景 | 优化前成本 | 优化后成本 | 节省 |
|------|------------|------------|------|
| 简单任务 | ¥0.75 | ¥0.05 | 93% |
| 中等任务 | ¥1.20 | ¥0.15 | 87.5% |
| 复杂任务 | ¥2.25 | ¥2.25 | 0% |
| **平均** | - | - | **60-80%** |

---

*智能模型选择器 v1.0*  
*创建时间：2026-04-05*  
*预期节省：30-50% Token + 60-80% 成本*
