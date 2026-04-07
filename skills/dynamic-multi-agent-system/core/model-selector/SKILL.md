---
name: model-selector
description: 智能模型选择器，根据任务复杂度、预算、延迟要求自动选择最优模型，支持成本优化和性能预测
parent: dynamic-multi-agent-system
version: 2.0.0
---

# 智能模型选择器 v2.0 (Model Selector)

## 功能概述

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 任务复杂度评估 | 自动分析任务难度，选择合适模型 | ⭐⭐⭐⭐⭐ |
| 成本优化 | 同等效果选更便宜的模型 | ⭐⭐⭐⭐⭐ |
| 性能预测 | 根据任务类型预估所需模型 | ⭐⭐⭐⭐ |
| 备选模型自动切换 | 主模型失败自动切换备选 | ⭐⭐⭐⭐⭐ |
| 模型质量评分 | 实时评分，动态调整 | ⭐⭐⭐⭐ |

---

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

---

## 智能选择算法 v2.0

### 1. 任务复杂度自动评估

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

function analyzeTask(task: {
  description: string;
  expectedLength?: string;
  domain?: string;
  hasDeadline?: boolean;
}): TaskProfile {
  let complexity = 5;  // 默认中等
  
  // 分析描述关键词
  const desc = task.description.toLowerCase();
  
  // 复杂度加分
  if (/复杂|困难|深度|专业/i.test(desc)) complexity += 2;
  if (/简单|基础|快速/i.test(desc)) complexity -= 2;
  if (/创意|原创|写作/i.test(desc)) complexity += 1;
  if (/代码|开发|编程/i.test(desc)) complexity += 1;
  if (/分析|研究|调研/i.test(desc)) complexity += 1;
  if (/翻译|总结|摘要/i.test(desc)) complexity -= 1;
  
  // 长度估算
  let estimatedOutput = 1000;
  if (task.expectedLength) {
    const lenMatch = task.expectedLength.match(/(\d+)/);
    if (lenMatch) estimatedOutput = parseInt(lenMatch[1]);
  }
  
  // Token估算（中文约2字符=1Token，英文约4字符=1Token）
  const estimatedTokens = {
    input: 500,
    output: Math.round(estimatedOutput / 2)
  };
  
  // 紧急程度
  let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal';
  if (task.hasDeadline) urgency = 'high';
  if (/紧急|马上|立刻|立即/i.test(desc)) urgency = 'critical';
  
  // 质量要求
  let qualityRequirement = 7;
  if (/最高|最优|专业|学术/i.test(desc)) qualityRequirement = 9;
  if (/简单|快速/i.test(desc)) qualityRequirement = 5;
  
  // 领域识别
  const domains: string[] = [];
  if (/代码|开发|编程|函数|算法/i.test(desc)) domains.push('coding');
  if (/分析|数据|统计|报告/i.test(desc)) domains.push('analysis');
  if (/写作|创作|文案|文章|小说/i.test(desc)) domains.push('writing');
  if (/翻译|语言/i.test(desc)) domains.push('translation');
  if (/问答|回答|咨询/i.test(desc)) domains.push('qa');
  
  return {
    complexity: Math.max(1, Math.min(10, complexity)),
    estimatedTokens,
    domains,
    urgency,
    qualityRequirement
  };
}
```

### 2. 智能模型选择

```typescript
interface ModelScore {
  model: string;
  score: number;           // 综合得分
  qualityScore: number;    // 质量分
  speedScore: number;      // 速度分
  costScore: number;       // 成本分
  matchScore: number;      // 领域匹配分
  reason: string;          // 选择理由
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
  
  // 过滤排除的模型
  const available = models.filter(m => 
    !(options?.excludeModels || []).includes(m.id)
  );
  
  // 计算每个模型的得分
  const scored = available.map(m => {
    // 质量分（匹配任务需求）
    let qualityScore = m.ability * 10;
    if (profile.qualityRequirement >= 9 && m.ability < 5) qualityScore *= 0.5;
    if (profile.qualityRequirement <= 5 && m.ability >= 4) qualityScore *= 0.8;
    
    // 速度分
    let speedScore = m.speed * 10;
    if (profile.urgency === 'critical' && m.speed < 4) speedScore *= 0.5;
    if (profile.urgency === 'low' && m.speed >= 4) speedScore *= 0.7;
    
    // 成本分（越低越好）
    let costScore = (6 - m.cost) * 10;
    
    // 领域匹配分
    let matchScore = 50;
    if (profile.domains.length > 0) {
      if (m.domain && profile.domains.includes(m.domain)) {
        matchScore = 100;
      }
    }
    
    // 上下文长度匹配
    const totalTokens = profile.estimatedTokens.input + profile.estimatedTokens.output;
    if (totalTokens > m.ctx * 0.8) {
      qualityScore *= 0.5;  // 上下文不足，大幅降分
    }
    
    // 综合得分（权重可调）
    let weightQuality = 0.4;
    let weightSpeed = 0.2;
    let weightCost = 0.2;
    let weightMatch = 0.2;
    
    if (options?.preferSpeed) {
      weightSpeed = 0.5;
      weightQuality = 0.2;
      weightCost = 0.2;
      weightMatch = 0.1;
    }
    if (options?.preferQuality) {
      weightQuality = 0.6;
      weightSpeed = 0.1;
      weightCost = 0.1;
      weightMatch = 0.2;
    }
    
    const score = 
      qualityScore * weightQuality +
      speedScore * weightSpeed +
      costScore * weightCost +
      matchScore * weightMatch;
    
    // 生成理由
    let reason = '';
    if (matchScore === 100) reason = `领域匹配(${m.domain})`;
    else if (m.speed >= 4 && profile.urgency !== 'low') reason = '速度快';
    else if (m.ability >= 4 && profile.qualityRequirement >= 8) reason = '高质量';
    else reason = '平衡之选';
    
    return {
      model: m.id,
      score,
      qualityScore,
      speedScore,
      costScore,
      matchScore,
      reason
    };
  });
  
  // 按综合得分排序
  return scored.sort((a, b) => b.score - a.score);
}
```

### 3. 成本估算 v2.0

```typescript
interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;     // CNY
  inputCost: number;
  outputCost: number;
  optimization: {
    possible: boolean;
    savingPercent: number;
    recommendedModel: string;
  };
}

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
  const estimatedCost = inputCost + outputCost;
  
  // 成本优化分析
  const optimization = analyzeCostOptimization(model, inputTokens, outputTokens);
  
  return {
    model,
    inputTokens,
    outputTokens,
    estimatedCost,
    inputCost,
    outputCost,
    optimization
  };
}

function analyzeCostOptimization(
  currentModel: string,
  inputTokens: number,
  outputTokens: number
): { possible: boolean; savingPercent: number; recommendedModel: string } {
  const currentPricing = PRICING_V2[currentModel];
  const currentCost = 
    (inputTokens / 1000) * currentPricing.input +
    (outputTokens / 1000) * currentPricing.output;
  
  let bestSaving = 0;
  let bestModel = currentModel;
  
  for (const [model, pricing] of Object.entries(PRICING_V2)) {
    if (model === currentModel) continue;
    
    const cost = 
      (inputTokens / 1000) * pricing.input +
      (outputTokens / 1000) * pricing.output;
    
    const saving = ((currentCost - cost) / currentCost) * 100;
    
    if (saving > bestSaving && saving > 10) {
      bestSaving = saving;
      bestModel = model;
    }
  }
  
  return {
    possible: bestSaving > 10,
    savingPercent: Math.round(bestSaving),
    recommendedModel: bestModel
  };
}
```

---

## 备选模型自动切换

### Fallback Chain v2.0

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

// 自动选择合适的链
function selectFallbackChain(
  profile: TaskProfile,
  selectedModel: string
): FallbackChain {
  // 根据任务画像选择合适的链
  if (profile.domains.includes('coding')) {
    return FALLBACK_CHAINS_V2['coding'];
  }
  
  if (profile.qualityRequirement >= 9) {
    return FALLBACK_CHAINS_V2['high-quality'];
  }
  
  if (profile.urgency === 'critical') {
    return FALLBACK_CHAINS_V2['speed-first'];
  }
  
  if (profile.estimatedTokens.input + profile.estimatedTokens.output > 50000) {
    return FALLBACK_CHAINS_V2['long-text'];
  }
  
  return FALLBACK_CHAINS_V2['balanced'];
}
```

---

## 模型质量评分

### 实时评分系统

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
  private scores: Map<string, ModelQualityScore> = new Map();
  
  recordResult(
    model: string,
    task: string,
    score: number  // 0-10
  ) {
    const record = this.scores.get(model) || {
      model,
      scores: { overall: 0, reliability: 0, accuracy: 0, coherence: 0, helpfulness: 0 },
      recentHistory: [],
      recommendation: 'use'
    };
    
    // 添加到历史
    record.recentHistory.push({ task, score, timestamp: Date.now() });
    if (record.recentHistory.length > 20) {
      record.recentHistory.shift();
    }
    
    // 更新分数（滑动平均）
    const n = record.recentHistory.length;
    const avgScore = record.recentHistory.reduce((a, b) => a + b.score, 0) / n;
    record.scores.overall = Math.round(avgScore * 10);
    
    // 计算各维度
    record.scores.reliability = this.calcReliability(record.recentHistory);
    record.scores.accuracy = avgScore > 7 ? 80 : avgScore * 10;
    record.scores.coherence = avgScore > 6 ? 75 : avgScore * 10;
    record.scores.helpfulness = avgScore * 10;
    
    // 推荐等级
    if (record.scores.overall >= 70) {
      record.recommendation = 'use';
    } else if (record.scores.overall >= 50) {
      record.recommendation = 'caution';
    } else {
      record.recommendation = 'avoid';
    }
    
    this.scores.set(model, record);
  }
  
  private calcReliability(history: { score: number }[]): number {
    if (history.length < 2) return 70;
    let consistent = 0;
    for (let i = 1; i < history.length; i++) {
      if (Math.abs(history[i].score - history[i-1].score) < 2) consistent++;
    }
    return Math.round((consistent / (history.length - 1)) * 100);
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

---

## 使用示例

### 基础用法

```typescript
const selector = new IntelligentModelSelector({
  preferSpeed: false,
  preferQuality: false,
  budgetLimit: 1000,
});

const profile = selector.analyzeTask({
  description: '撰写一篇3000字的产品分析报告',
  expectedLength: '3000字'
});

const recommendations = selector.select(profile, { preferQuality: true });
console.log(`最优模型：${recommendations[0].model}`);
console.log(`选择理由：${recommendations[0].reason}`);

const cost = selector.estimateCost(
  recommendations[0].model,
  profile.estimatedTokens.input,
  profile.estimatedTokens.output
);
console.log(`预估成本：¥${cost.estimatedCost.toFixed(4)}`);

if (cost.optimization.possible) {
  console.log(`成本优化：换用${cost.optimization.recommendedModel}可节省${cost.optimization.savingPercent}%`);
}
```

### 带Fallback的执行

```typescript
const chain = selector.selectFallbackChain(profile, recommendations[0].model);
console.log(`Fallback链：${chain.chain.join(' → ')}`);

const result = await executeWithFallback(chain, prompt, {
  onFallback: (from, to) => console.log(`切换模型：${from} → ${to}`)
});
```

---

## 性能监控 v2.0

```
智能模型选择统计（最近100次）
├─ 选择准确率：92%
├─ 成本节省：平均38%
├─ Fallback触发：8次
│
├─ 模型分布
│  ├─ minimax-m2.7: 35% (速度优先)
│  ├─ qwen3.5-plus: 30% (平衡)
│  ├─ qwen3.5-max: 20% (质量优先)
│  └─ 其他: 15%
│
└─ 质量评分
   ├─ qwen3.5-max: 92/100 ⭐推荐
   ├─ qwen3.5-plus: 88/100 ⭐推荐
   ├─ minimax-m2.7: 82/100 ✅可用
   └─ qwen3-coder: 85/100 ⭐推荐
```

---

## 最佳实践

### ✅ 推荐

1. **使用复杂度评估** - 不要手动估算，用 `analyzeTask()` 
2. **开启成本优化** - 定期检查 `estimateCost().optimization`
3. **配置Fallback链** - 根据任务类型选择合适链
4. **记录质量分数** - 持续优化选择策略
5. **批量处理** - 相似任务用相同模型提高缓存命中

### ❌ 避免

1. **固定最强模型** - 造成不必要的成本浪费
2. **忽略Fallback** - 单点故障风险高
3. **不看质量评分** - 可能选到近期表现差的模型
4. **忽视任务画像** - 不同任务需要不同策略

---

*智能模型选择器 v2.0*  
*创建时间：2026-04-07*  
*预期节省：30-40% 成本 + 提升选择准确率至 92%*
