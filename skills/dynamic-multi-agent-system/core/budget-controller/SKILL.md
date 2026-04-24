---
name: budget-controller
description: Token 预算控制器，为每个任务/子任务设置预算，超预算自动告警或切换模型
parent: dynamic-multi-agent-system
version: 1.0.0
---

# Token 预算控制器 (Budget Controller)

## 功能

为每个任务和子任务设置 Token 预算，实时监控消耗，超预算时自动告警、切换轻量模型或终止任务。

## 核心优势

| 优势 | 说明 | 效果 |
|------|------|------|
| **成本可控** | 预先设置预算上限 | 避免 Token 爆炸 |
| **自动告警** | 达到阈值时提醒 | 及时干预 |
| **智能降级** | 超预算切换轻量模型 | 保证任务完成 |
| **历史学习** | 根据历史调整预算 | 越来越精准 |

---

## 预算设置

### 基于任务类型

```typescript
interface BudgetTemplate {
  taskType: string;
  baseBudget: number;
  perWordBudget: number;
  complexityMultiplier: Record<string, number>;
}

const BUDGET_TEMPLATES: Record<string, BudgetTemplate> = {
  'translation': {
    baseBudget: 500,
    perWordBudget: 3,  // 每字 3 Token
    complexityMultiplier: { simple: 0.8, normal: 1, technical: 1.5 },
  },
  
  'summarization': {
    baseBudget: 1000,
    perWordBudget: 2,
    complexityMultiplier: { short: 0.7, medium: 1, long: 1.3 },
  },
  
  'creative_writing': {
    baseBudget: 2000,
    perWordBudget: 4,
    complexityMultiplier: { simple: 0.8, normal: 1, complex: 1.5 },
  },
  
  'code_generation': {
    baseBudget: 3000,
    perWordBudget: 5,
    complexityMultiplier: { function: 0.5, module: 1, system: 2 },
  },
  
  'analysis': {
    baseBudget: 2500,
    perWordBudget: 3,
    complexityMultiplier: { basic: 0.7, detailed: 1, comprehensive: 1.5 },
  },
};
```

### 基于历史数据

```typescript
interface HistoricalBudget {
  taskType: string;
  avgTokens: number;
  p50Tokens: number;
  p90Tokens: number;
  p99Tokens: number;
  successRate: number;
}

function calculateBudgetFromHistory(taskType: string): number {
  const history = getHistory(taskType);
  
  if (history.length < 5) {
    // 历史数据不足，使用模板
    return getTemplateBudget(taskType);
  }
  
  // 使用 P90 分位数（90% 的任务不超过此值）
  const p90 = percentile(history.map(h => h.tokensUsed), 90);
  
  // 增加 20% 缓冲
  return Math.round(p90 * 1.2);
}
```

### 用户自定义

```typescript
interface UserBudget {
  taskId: string;
  hardLimit: number;      // 硬限制（不可超）
  softLimit: number;      // 软限制（超了告警）
  warningThreshold: number; // 告警阈值（如 80%）
}

function setUserBudget(taskId: string, budget: UserBudget): void {
  budgetStore.set(taskId, budget);
}
```

---

## 监控策略

### 实时追踪

```typescript
interface TokenTracker {
  taskId: string;
  budget: number;
  used: number;
  remaining: number;
  percentageUsed: number;
  estimatedFinal: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
}

class TokenTracker {
  track(tokenUsage: number) {
    this.used += tokenUsage;
    this.remaining = this.budget - this.used;
    this.percentageUsed = (this.used / this.budget) * 100;
    
    // 更新状态
    if (this.percentageUsed >= 100) {
      this.status = 'exceeded';
    } else if (this.percentageUsed >= 90) {
      this.status = 'critical';
    } else if (this.percentageUsed >= 80) {
      this.status = 'warning';
    } else {
      this.status = 'safe';
    }
    
    // 触发回调
    this.onStatusChange(this.status);
  }
}
```

### 预测最终消耗

```typescript
function estimateFinalUsage(progress: number, currentUsage: number): number {
  if (progress === 0) return 0;
  
  // 线性预测
  const estimated = currentUsage / progress;
  
  // 增加置信区间
  return {
    optimistic: estimated * 0.9,
    likely: estimated,
    pessimistic: estimated * 1.2,
  };
}
```

---

## 超预算处理

### 分级响应

```typescript
interface BudgetExceededHandler {
  warningThreshold: number;   // 80% - 告警
  criticalThreshold: number;  // 90% - 严重告警
  hardLimit: number;          // 100% - 终止或降级
  
  onWarning: () => void;
  onCritical: () => void;
  onExceeded: () => 'continue' | 'downgrade' | 'abort';
}
```

### 处理策略

```typescript
async function handleBudgetExceeded(
  tracker: TokenTracker,
  task: Task
): Promise<'continue' | 'downgrade' | 'abort'> {
  // 策略 1：询问用户
  if (task.userPreference === 'ask') {
    const choice = await askUser(tracker);
    return choice;
  }
  
  // 策略 2：自动降级
  if (task.userPreference === 'auto_downgrade') {
    const lighterModel = getLighterModel(task.currentModel);
    if (lighterModel) {
      task.model = lighterModel;
      console.log(`预算不足，切换到 ${lighterModel}`);
      return 'continue';
    }
  }
  
  // 策略 3：直接终止
  if (task.userPreference === 'strict') {
    console.log('预算已用尽，任务终止');
    return 'abort';
  }
  
  // 默认：降级
  return 'downgrade';
}
```

---

## 使用示例

### 基础用法

```typescript
import { BudgetController } from './budget-controller';

const controller = new BudgetController({
  defaultBudget: 10000,
  warningThreshold: 0.8,
  criticalThreshold: 0.9,
  onWarning: (tracker) => console.warn(`⚠️ 预算已达 ${tracker.percentageUsed}%`),
  onCritical: (tracker) => console.error(`🔴 预算严重不足 ${tracker.percentageUsed}%`),
  onExceeded: (tracker) => 'downgrade',
});

// 设置任务预算
const budget = controller.setBudget(task, {
  type: 'creative_writing',
  expectedLength: 5000,
  complexity: 'normal',
});

// 追踪消耗
controller.track(taskId, 1500);  // 用了 1500 Token
controller.track(taskId, 2000);  // 又用了 2000 Token

// 检查状态
const status = controller.getStatus(taskId);
console.log(`预算状态：${status.status}`);
console.log(`已用：${status.used} / ${status.budget}`);
```

### 子任务预算分配

```typescript
// 父任务预算 10000 Token
// 分解为 5 个子任务

const parentBudget = 10000;
const subtasks = [
  { id: 's1', complexity: 'high', weight: 0.3 },
  { id: 's2', complexity: 'medium', weight: 0.2 },
  { id: 's3', complexity: 'medium', weight: 0.2 },
  { id: 's4', complexity: 'low', weight: 0.15 },
  { id: 's5', complexity: 'low', weight: 0.15 },
];

// 按权重分配
const subtaskBudgets = subtasks.map(st => ({
  ...st,
  budget: Math.round(parentBudget * st.weight),
}));

// 结果：
// s1: 3000 Token
// s2: 2000 Token
// s3: 2000 Token
// s4: 1500 Token
// s5: 1500 Token
```

---

## 预算优化

### 学习历史

```typescript
interface BudgetLearning {
  taskType: string;
  initialBudget: number;
  actualUsage: number;
  success: boolean;
  learnings: string[];
}

function learnFromHistory(learnings: BudgetLearning[]): void {
  for (const learning of learnings) {
    const ratio = learning.actualUsage / learning.initialBudget;
    
    if (ratio > 1.5) {
      // 预算严重不足，下次增加
      adjustBudget(learning.taskType, 1.5);
    } else if (ratio < 0.5) {
      // 预算过剩，下次减少
      adjustBudget(learning.taskType, 0.7);
    }
  }
}
```

### 动态调整

```typescript
// 根据任务特征动态调整
function dynamicBudgetAdjustment(
  baseBudget: number,
  factors: Record<string, number>
): number {
  let adjusted = baseBudget;
  
  // 时间压力（紧急任务可能浪费更多 Token）
  if (factors.urgency === 'high') {
    adjusted *= 1.2;
  }
  
  // 用户要求（完美主义需要更多 Token）
  if (factors.perfectionism > 7) {
    adjusted *= 1.3;
  }
  
  // 历史表现（该用户通常超预算）
  if (factors.userHistory === 'over_budget') {
    adjusted *= 1.2;
  }
  
  return Math.round(adjusted);
}
```

---

## 报告与分析

### 预算执行报告

```typescript
interface BudgetReport {
  period: string;
  totalBudget: number;
  totalUsed: number;
  utilizationRate: number;
  tasksOverBudget: number;
  tasksUnderBudget: number;
  avgOverage: number;
  topConsumers: TaskSummary[];
}

function generateBudgetReport(period: string): BudgetReport {
  const tasks = getTasksInPeriod(period);
  
  return {
    period,
    totalBudget: tasks.reduce((sum, t) => sum + t.budget, 0),
    totalUsed: tasks.reduce((sum, t) => sum + t.used, 0),
    utilizationRate: tasks.reduce((sum, t) => sum + t.used, 0) / 
                     tasks.reduce((sum, t) => sum + t.budget, 0),
    tasksOverBudget: tasks.filter(t => t.used > t.budget).length,
    tasksUnderBudget: tasks.filter(t => t.used < t.budget).length,
    avgOverage: calculateAverageOverage(tasks),
    topConsumers: tasks.sort((a, b) => b.used - a.used).slice(0, 10),
  };
}
```

### 示例输出

```
预算执行报告（2026-04-01 ~ 2026-04-05）
├─ 总预算：500,000 Token
├─ 总消耗：387,500 Token
├─ 执行率：77.5%
├─ 超预算任务：12 (8%)
├─ 预算剩余：67 (42%)
├─ 平均超支：23%
└─ 消耗 Top5:
   1. 长篇小说创作 - 45,000 Token
   2. 技术方案设计 - 38,000 Token
   3. 数据分析报告 - 32,000 Token
   4. 代码重构 - 28,000 Token
   5. 市场调研 - 25,000 Token
```

---

## 最佳实践

### ✅ 推荐

1. **设置合理预算** - 基于历史数据
2. **分级告警** - 80%/90%/100%
3. **自动降级** - 避免任务中断
4. **定期复盘** - 优化预算设置
5. **子任务分配** - 按权重分配

### ❌ 避免

1. **预算过低** - 导致频繁降级
2. **预算过高** - 失去控制意义
3. **无告警** - 超支才知道
4. **一刀切** - 不同任务不同预算

---

## 预期效果

### 成本控制

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 平均超支率 | 35% | 8% | -77% |
| 预算执行率 | 125% | 95% | -24% |
| 意外超支任务 | 45% | 8% | -82% |

### Token 节省

| 场景 | 无预算控制 | 有预算控制 | 节省 |
|------|------------|------------|------|
| 创意写作 | 25000 | 15000 | 40% |
| 方案设计 | 40000 | 22000 | 45% |
| 代码开发 | 35000 | 20000 | 43% |

---

*Token 预算控制器 v1.0*  
*创建时间：2026-04-05*  
*预期节省：40-50% Token + 80% 超支减少*
