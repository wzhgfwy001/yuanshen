# 模型矩阵与Fallback链完整参考

## 模型矩阵 v2.0

### 可用模型

| 模型 | 能力 | 速度 | 成本 | 上下文 | 适用场景 |
|------|------|------|------|--------|----------|
| **MiniMax-M2.5** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ¥ | 32K | 简单任务、快速响应 |
| **MiniMax-M2.7** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ¥¥ | 32K | 标准任务、高速度 |
| **Qwen3-Coder** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥ | 32K | 代码开发 |
| **Qwen3.5-Plus** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥ | 32K | 平衡任务 |
| **Qwen3-Max** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 32K | 复杂推理 |
| **Qwen3.5-Max** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 128K | 长文本/复杂任务 |
| **GPT-4o** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥¥ | 128K | 国际场景 |
| **Claude-3.5** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥¥ | 200K | 长文本分析 |

### 模型选择算法

```typescript
interface TaskProfile {
  complexity: number;        // 1-10
  estimatedTokens: {
    input: number;
    output: number;
  };
  domains: string[];         // ['coding', 'analysis', 'writing']
  urgency: 'low' | 'normal' | 'high' | 'critical';
  qualityRequirement: number; // 1-10
}

function selectOptimalModel(
  profile: TaskProfile,
  options?: {
    preferSpeed?: boolean;
    preferQuality?: boolean;
    budgetLimit?: number;
    excludeModels?: string[];
  }
): ModelScore[] {
  const models = [
    { id: 'minimax-m2.5', ability: 3, speed: 5, cost: 1, ctx: 32 },
    { id: 'minimax-m2.7', ability: 4, speed: 5, cost: 2, ctx: 32 },
    { id: 'qwen3-coder-plus', ability: 4, speed: 3, cost: 2, ctx: 32, domain: 'coding' },
    { id: 'qwen3.5-plus', ability: 5, speed: 3, cost: 3, ctx: 32 },
    { id: 'qwen3-max', ability: 5, speed: 2, cost: 4, ctx: 32 },
    { id: 'qwen3.5-max', ability: 5, speed: 2, cost: 4, ctx: 128 },
    { id: 'gpt-4o', ability: 5, speed: 3, cost: 4, ctx: 128, domain: 'english' },
    { id: 'claude-3.5', ability: 5, speed: 3, cost: 4, ctx: 200, domain: 'long-text' },
  ];
  // ... scoring logic
}
```

## Fallback Chain v2.0

```typescript
interface FallbackChain {
  primary: string;
  chain: string[];         // 完整链 [primary, fallback1, fallback2, ...]
  conditions: string[];    // 触发fallback的条件
}

const FALLBACK_CHAINS_V2: Record<string, FallbackChain> = {
  // 高质量链
  'high-quality': {
    primary: 'qwen3.5-max',
    chain: ['qwen3.5-max', 'qwen3-max', 'qwen3.5-plus', 'minimax-m2.7'],
    conditions: ['rate_limit', 'timeout', 'context_overflow', 'server_error'],
  },
  // 平衡链
  'balanced': {
    primary: 'qwen3.5-plus',
    chain: ['qwen3.5-plus', 'qwen3-max', 'minimax-m2.7'],
    conditions: ['rate_limit', 'timeout', 'server_error'],
  },
  // 速度链
  'speed-first': {
    primary: 'minimax-m2.7',
    chain: ['minimax-m2.7', 'minimax-m2.5', 'qwen3.5-plus'],
    conditions: ['rate_limit', 'timeout'],
  },
  // 代码链
  'coding': {
    primary: 'qwen3-coder-plus',
    chain: ['qwen3-coder-plus', 'qwen3.5-plus', 'minimax-m2.7'],
    conditions: ['rate_limit', 'timeout', 'compilation_error'],
  },
  // 长文本链
  'long-text': {
    primary: 'claude-3.5',
    chain: ['claude-3.5', 'qwen3.5-max', 'qwen3.5-plus'],
    conditions: ['rate_limit', 'timeout', 'context_overflow'],
  },
};
```

## 成本估算 v2.0

```typescript
const PRICING_V2: Record<string, { input: number; output: number; unit: string }> = {
  'minimax-m2.5': { input: 0.001, output: 0.002, unit: 'CNY' },
  'minimax-m2.7': { input: 0.002, output: 0.004, unit: 'CNY' },
  'qwen3-coder-plus': { input: 0.002, output: 0.006, unit: 'CNY' },
  'qwen3.5-plus': { input: 0.004, output: 0.012, unit: 'CNY' },
  'qwen3-max': { input: 0.02, output: 0.06, unit: 'CNY' },
  'qwen3.5-max': { input: 0.02, output: 0.06, unit: 'CNY' },
  'gpt-4o': { input: 0.015, output: 0.06, unit: 'USD' },
  'claude-3.5': { input: 0.003, output: 0.015, unit: 'USD' },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): CostEstimate {
  const pricing = PRICING_V2[model] || PRICING_V2['qwen3.5-plus'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return {
    model,
    inputTokens,
    outputTokens,
    estimatedCost: inputCost + outputCost,
    inputCost,
    outputCost,
  };
}
```

## 模型质量评分

```typescript
interface ModelQualityScore {
  model: string;
  scores: {
    overall: number;        // 0-100
    reliability: number;     // 稳定性
    accuracy: number;        // 准确性
    coherence: number;       // 连贯性
    helpfulness: number;     // 有帮助程度
  };
  recentHistory: {
    task: string;
    score: number;
    timestamp: number;
  }[];
  recommendation: 'use' | 'caution' | 'avoid';
}

class ModelQualityTracker {
  recordResult(model: string, task: string, score: number) {
    // 记录质量分数
  }
  
  getScore(model: string): ModelQualityScore | null {
    return this.scores.get(model) || null;
  }
  
  getRecommendation(model: string): 'use' | 'caution' | 'avoid' {
    const score = this.scores.get(model);
    return score?.recommendation || 'use';
  }
}
```
