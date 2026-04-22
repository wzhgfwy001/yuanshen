---
name: deerflow-budget-controller
description: DeerFlow增强版预算控制器 - 多维度预算、实时预警、成本分析、配额管理
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | budget_control=true | cost_tracking=true | quota_management=true
---

# DeerFlow增强版预算控制器

**【附魔·改】Budget Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 预算控制 | `budget_control=true` | 启用预算管理 |
| 成本追踪 | `cost_tracking=true` | 追踪使用成本 |
| 配额管理 | `quota_management=true` | 管理用户/项目配额 |

## 核心功能

### 1. 创建预算分配

```javascript
const { BudgetController } = require('./deerflow_enhanced.js');

const controller = new BudgetController({
  globalLimit: 1000,  // 全局限制 $1000
  currency: 'USD',
  defaultAllocations: [
    { name: 'gpt4', limit: 500 },
    { name: 'claude', limit: 300 },
    { name: 'embedding', limit: 200 }
  ]
});

// 创建自定义分配
controller.createAllocation('premium-users', 100, {
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  resetPolicy: 'auto',
  resetInterval: 86400000 // 24小时
});
```

### 2. 使用预算

```javascript
// 直接使用预算
const success = controller.spend('gpt4', 0.05, {
  userId: 'user-123',
  taskId: 'task-456'
});

if (!success) {
  console.log('预算不足!');
}

// 基于Token使用
const result = controller.spendTokens(
  'gpt4',
  1000,   // prompt tokens
  500,    // completion tokens
  'gpt-4',
  { userId: 'user-123' }
);

console.log(`成功: ${result.success}, 成本: $${result.cost.totalCost.toFixed(4)}`);
```

### 3. 实时预警

```javascript
controller.on('threshold_warning', (data) => {
  console.log(`⚠️ 警告: ${data.name} 使用已达 ${data.percent.toFixed(1)}%`);
  // 发送通知
});

controller.on('threshold_critical', (data) => {
  console.log(`🚨 严重: ${data.name} 使用已达 ${data.percent.toFixed(1)}%`);
  // 立即通知
});

controller.on('budget_exceeded', (data) => {
  console.log(`❌ 超出: ${data.category} 请求 $${data.requested} 但只有 $${data.available}`);
  // 拒绝请求或切换到低成本选项
});
```

### 4. 获取状态和报告

```javascript
// 获取所有状态
const status = controller.getAllStatus();
console.log(`
全局: $${status.global.used} / $${status.global.limit} (${status.global.usagePercent.toFixed(1)}%)

分类:
${Object.entries(status.allocations).map(([name, a]) => 
  `${name}: $${a.used} / $${a.limit} [${a.status}]`
).join('\n')}
`);

// 生成报告
const report = controller.generateReport({ period: 'day' });
console.log(JSON.stringify(report, null, 2));
```

### 5. Token成本计算

```javascript
// 配置成本费率
controller.costPerToken = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'claude-3': { input: 0.015, output: 0.075 }
};

// 计算成本
const cost = controller.calculateTokenCost(2000, 1000, 'gpt-4');
console.log(`
输入成本: $${cost.inputCost.toFixed(4)}
输出成本: $${cost.outputCost.toFixed(4)}
总成本: $${cost.totalCost.toFixed(4)}
`);
```

## 集成到主系统

```javascript
// LLM调用拦截
async function callWithBudgetControl(model, prompt, context) {
  const estimatedTokens = estimateTokens(prompt) + 500;
  
  // 检查预算
  if (!controller.spendTokens(model, estimatedTokens, 0, model)) {
    throw new Error('Budget exceeded for model: ' + model);
  }
  
  try {
    const response = await callModel(model, prompt);
    
    // 确认实际token使用
    controller.spendTokens(model, 
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      model
    );
    
    return response;
  } catch (error) {
    // 如果失败，释放预算
    controller.release(model, estimatedTokens / 1000 * 0.001);
    throw error;
  }
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
