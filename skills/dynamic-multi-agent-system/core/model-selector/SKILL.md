---
name: deerflow-model-selector
description: DeerFlow增强版模型选择器 - 动态路由、成本控制、故障转移、自动重试
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | model_selection=advanced | multi_model=true | cost_control=true
---

# DeerFlow增强版模型选择器

**【附魔·改】Model Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 高级模型选择 | `model_selection=advanced` | 动态路由选择 |
| 多模型支持 | `multi_model=true` | 使用多个模型 |
| 成本控制 | `cost_control=true` | 预算和token限制 |

## 核心功能

### 1. 模型注册

```javascript
const { ModelSelector, SELECTION_STRATEGIES } = require('./deerflow_enhanced.js');

const selector = new ModelSelector({
  strategy: SELECTION_STRATEGIES.COST_OPTIMIZED,
  maxBudget: 100,
  maxTokensPerDay: 100000
});

// 注册模型
selector.registerModel({
  name: 'gpt-4',
  provider: 'openai',
  modelId: 'gpt-4',
  maxTokens: 8192,
  costPer1KInput: 0.03,
  costPer1KOutput: 0.06,
  latencyMs: 2000,
  qualityScore: 0.95,
  capabilities: ['general', 'coding', 'reasoning'],
  rateLimit: 100,
  rateLimitWindow: 60000,
  fallback: 'gpt-3.5-turbo'
});

selector.registerModel({
  name: 'gpt-3.5-turbo',
  provider: 'openai',
  modelId: 'gpt-3.5-turbo-16k',
  maxTokens: 16384,
  costPer1KInput: 0.001,
  costPer1KOutput: 0.002,
  latencyMs: 500,
  qualityScore: 0.8,
  capabilities: ['general', 'fast'],
  rateLimit: 500
});

selector.registerModel({
  name: 'claude',
  provider: 'anthropic',
  modelId: 'claude-3-opus',
  maxTokens: 4096,
  costPer1KInput: 0.015,
  costPer1KOutput: 0.075,
  latencyMs: 1500,
  qualityScore: 0.9,
  capabilities: ['general', 'writing', 'reasoning']
});
```

### 2. 模型选择

```javascript
// 根据上下文选择模型
const model = selector.selectModel({
  taskType: 'coding',           // 任务类型
  requiredCapabilities: [],      // 必需能力
  maxCost: 0.01,                // 最大成本
  maxLatency: 3000,             // 最大延迟
  qualityWeight: 0.6,            // 质量权重
  costWeight: 0.3,              // 成本权重
  latencyWeight: 0.1            // 延迟权重
});

console.log(`选择模型: ${model.name}`);
console.log(`预计成本: $${model.calculateCost(1000, 500)}`);
```

### 3. 成本控制

```javascript
// 检查预算
const remaining = selector.budgetController.getRemaining();
console.log(`
剩余预算: $${remaining.budget.toFixed(2)} (${remaining.budgetPercent.toFixed(1)}%)
剩余Token: ${remaining.tokens.toLocaleString()} (${remaining.tokensPercent.toFixed(1)}%)
`);

// 设置告警阈值
selector.budgetController.on('budget_exceeded', (info) => {
  console.error('预算超限!', info);
  // 发送警告或切换到低成本模型
});
```

### 4. 自动重试与故障转移

```javascript
// 执行带重试的请求
const result = await selector.executeWithRetry(
  { taskType: 'coding', maxCost: 0.01 },
  async (model) => {
    console.log(`使用模型: ${model.name}`);
    
    const response = await callModelAPI(model.modelId, prompt);
    
    return {
      content: response.content,
      latencyMs: response.latencyMs,
      tokens: response.usage.total
    };
  },
  {
    maxRetries: 3,
    retryDelay: 1000
  }
);

console.log('成功:', result.content);
```

### 5. 批量注册模型

```javascript
selector.registerModels([
  { name: 'mixtral', provider: 'mistral', capabilities: ['general'] },
  { name: 'gemini', provider: 'google', capabilities: ['general', 'vision'] },
  { name: 'llama', provider: 'meta', capabilities: ['general', 'fast'] }
]);
```

### 6. 获取统计信息

```javascript
const stats = selector.getStatistics();

console.log(`
总模型数: ${stats.totalModels}
可用模型: ${stats.availableModels}
总请求数: ${stats.totalRequests}
总失败数: ${stats.totalFailures}

预算状态:
${stats.budgetStatus.budget.toFixed(2)} / 100.00
${stats.budgetStatus.tokens.toLocaleString()} / 100,000 tokens

各模型状态:
${stats.byModel.map(m => `- ${m.name}: ${m.status} (负载:${m.load}, 错误率:${(m.errorRate*100).toFixed(1)}%)`).join('\n')}
`);
```

## 选择策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `ROUND_ROBIN` | 轮询分配请求 | 均匀负载 |
| `LEAST_LOADED` | 选择负载最低 | 高并发 |
| `COST_OPTIMIZED` | 选择成本最低 | 成本敏感 |
| `LATENCY_OPTIMIZED` | 选择延迟最低 | 实时响应 |
| `QUALITY_OPTIMIZED` | 选择质量最高 | 高质量输出 |

## 事件系统

```javascript
selector.on('model_selected', ({ model, strategy }) => {
  console.log(`选择 ${model.name} (策略: ${strategy})`);
});

selector.on('model_switched', ({ original, fallback, reason }) => {
  console.log(`切换模型: ${original} -> ${fallback} (原因: ${reason})`);
});

selector.on('model_failed', ({ model, error }) => {
  console.error(`模型失败: ${model.name}`, error);
});

selector.on('budget_exceeded', (info) => {
  console.error('预算超限:', info);
});
```

## 集成到主系统

```javascript
// 在系统初始化时
const modelSelector = new ModelSelector({
  strategy: SELECTION_STRATEGIES.QUALITY_OPTIMIZED,
  maxBudget: 50,  // $50
  maxTokensPerDay: 50000
});

// 注册所有模型
for (const config of defaultModels) {
  modelSelector.registerModel(config);
}

// 使用模型
async function callLLM(prompt, context = {}) {
  // 估算成本
  const estimatedTokens = estimateTokens(prompt);
  
  // 检查预算
  if (!modelSelector.budgetController.canExecute(0.001, estimatedTokens)) {
    throw new Error('预算不足');
  }
  
  // 选择并执行
  return await modelSelector.executeWithRetry(
    context,
    async (model) => {
      const result = await modelAPI(model.modelId, prompt);
      return result;
    }
  );
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
