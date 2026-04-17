# 批量处理策略完整参考

## 批量识别

### 可批量任务特征

```typescript
interface BatchableFeatures {
  sameTaskType: boolean;      // 相同任务类型
  similarStructure: boolean;  // 相似结构
  sharedContext: boolean;     // 共享上下文
  independentResults: boolean; // 结果独立
  compatibleFormats: boolean; // 格式兼容
}

function isBatchable(tasks: Task[]): boolean {
  if (tasks.length < 2) return false;
  
  const features: BatchableFeatures = {
    sameTaskType: tasks.every(t => t.type === tasks[0].type),
    similarStructure: tasks.every(t => t.structure === tasks[0].structure),
    sharedContext: tasks.every(t => t.context === tasks[0].context),
    independentResults: tasks.every(t => !t.dependsOnOtherTasks),
    compatibleFormats: tasks.every(t => t.outputFormat === tasks[0].outputFormat),
  };
  
  // 至少满足 4 个特征
  return Object.values(features).filter(v => v).length >= 4;
}
```

## 批量策略

### 1. 简单批量（共享提示）

```typescript
interface SimpleBatch {
  type: 'simple';
  commonPrompt: string;
  items: string[];
}

// 示例
const batch: SimpleBatch = {
  type: 'simple',
  commonPrompt: '请将以下内容翻译成英文：',
  items: ['你好', '谢谢', '再见', '早上好', '晚上好'],
};

// 生成的 Prompt
const prompt = `${batch.commonPrompt}
1. ${batch.items[0]}
2. ${batch.items[1]}
3. ${batch.items[2]}
4. ${batch.items[3]}
5. ${batch.items[4]}

请依次翻译以上内容。`;
```

### 2. 结构化批量（JSON 格式）

```typescript
interface StructuredBatch {
  type: 'structured';
  schema: object;
  items: object[];
}

// 示例
const batch: StructuredBatch = {
  type: 'structured',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        output: { type: 'string' },
      },
    },
  },
  items: [
    { input: '你好', output: '' },
    { input: '谢谢', output: '' },
    { input: '再见', output: '' },
  ],
};

// 生成的 Prompt
const prompt = `请完成以下 JSON 数据的 output 字段：
${JSON.stringify(batch.items, null, 2)}`;
```

### 3. 模板批量（槽位填充）

```typescript
interface TemplateBatch {
  type: 'template';
  template: string;
  slots: Record<string, string[]>;
}

// 示例
const batch: TemplateBatch = {
  type: 'template',
  template: '请分析"{content}"的情感倾向（正面/负面/中性）',
  slots: {
    content: ['产品很好用', '物流太慢了', '客服态度不错'],
  },
};

// 生成的 Prompt
const prompt = `请批量分析以下内容的情感倾向：

1. "产品很好用"
2. "物流太慢了"
3. "客服态度不错"

请按顺序输出分析结果（正面/负面/中性）。`;
```

## 批量大小优化

### 最优批量计算

```typescript
function calculateOptimalBatchSize(
  tasks: Task[],
  modelContextLimit: number = 32000,
  avgTokensPerTask: number = 1000
): number {
  // 考虑模型上下文限制
  const maxByContext = Math.floor(modelContextLimit / avgTokensPerTask);
  
  // 考虑成本效益（太大可能降低质量）
  const maxByQuality = 20;  // 经验值
  
  // 考虑超时限制（大批量可能超时）
  const maxByTimeout = 15;  // 经验值
  
  return Math.min(maxByContext, maxByQuality, maxByTimeout, tasks.length);
}
```

### 动态分批

```typescript
function splitIntoBatches(tasks: Task[], batchSize: number): Task[][] {
  const batches: Task[][] = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    batches.push(tasks.slice(i, i + batchSize));
  }
  
  return batches;
}

// 使用示例
const tasks = [/* 50 个任务 */];
const optimalBatchSize = calculateOptimalBatchSize(tasks);
const batches = splitIntoBatches(tasks, optimalBatchSize);

// 并行处理批次
const results = await Promise.all(
  batches.map(batch => processBatch(batch))
);
```

## 结果解析

### 批量结果分离

```typescript
interface BatchResult {
  success: boolean;
  results: any[];
  errors?: Error[];
}

function parseBatchResponse(response: string, itemCount: number): any[] {
  // 尝试 JSON 解析
  try {
    const json = JSON.parse(response);
    if (Array.isArray(json) && json.length === itemCount) {
      return json;
    }
  } catch (e) {
    // 不是 JSON，尝试其他解析方式
  }
  
  // 尝试按序号解析
  const items: any[] = [];
  const lines = response.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.+)$/);
    if (match) {
      items.push({ index: parseInt(match[1]), content: match[2] });
    }
  }
  
  // 按序号排序
  return items.sort((a, b) => a.index - b.index).map(i => i.content);
}
```

### 错误处理

```typescript
interface BatchError {
  itemIndex: number;
  error: Error;
  recoverable: boolean;
}

function handleBatchErrors(results: BatchResult): HandleResult {
  const successfulItems = results.results.filter((_, i) => !results.errors?.[i]);
  const failedItems = results.errors || [];
  
  // 可恢复错误 → 重试单个项目
  const recoverableErrors = failedItems.filter(e => e.recoverable);
  const unrecoverableErrors = failedItems.filter(e => !e.recoverable);
  
  return {
    successful: successfulItems,
    retry: recoverableErrors.map(e => e.itemIndex),
    failed: unrecoverableErrors,
  };
}
```

## 场景示例

### 场景 1：多语言翻译

**优化前（逐个处理）：**
```
翻译任务 1: "你好" → 英文
翻译任务 2: "谢谢" → 英文
翻译任务 3: "再见" → 英文
...
5 次 API 调用，5000 Token
```

**优化后（批量处理）：**
```
批量翻译：
1. "你好" → 英文
2. "谢谢" → 英文
3. "再见" → 英文
...
1 次 API 调用，2000 Token（节省 60%）
```

### 场景 2：数据清洗

**优化前：**
```
清洗记录 1
清洗记录 2
清洗记录 3
...
10 次 API 调用，10000 Token
```

**优化后：**
```
批量清洗 10 条记录：
[记录 1, 记录 2, ..., 记录 10]
1 次 API 调用，3000 Token（节省 70%）
```

### 场景 3：代码审查

**优化前：**
```
审查函数 1
审查函数 2
审查函数 3
...
5 次 API 调用，8000 Token
```

**优化后：**
```
批量审查 5 个函数：
[函数 1, 函数 2, ..., 函数 5]
1 次 API 调用，3500 Token（节省 56%）
```

## 性能监控

### 批量统计

```typescript
interface BatchStats {
  totalBatches: number;
  totalItems: number;
  avgBatchSize: number;
  tokenSaved: number;
  timeSaved: number;
  successRate: number;
}

function getBatchStats(): BatchStats {
  return {
    totalBatches: stats.batches,
    totalItems: stats.items,
    avgBatchSize: stats.items / stats.batches,
    tokenSaved: stats.individualTokens - stats.batchTokens,
    timeSaved: stats.individualTime - stats.batchTime,
    successRate: stats.successful / stats.total,
  };
}
```

### 示例输出

```
批量处理统计
├─ 总批次：45
├─ 总任务数：523
├─ 平均批量大小：11.6
├─ 节省 Token: 156,000 (62%)
├─ 节省时间：125 秒 (58%)
└─ 成功率：97.3%
```

## 预期效果

### Token 节省

| 批量大小 | 单个调用 Token | 批量调用 Token | 节省 |
|----------|----------------|----------------|------|
| 5 个任务 | 5000 | 2000 | 60% |
| 10 个任务 | 10000 | 3500 | 65% |
| 20 个任务 | 20000 | 6000 | 70% |

### 时间节省

| 批量大小 | 逐个处理时间 | 批量处理时间 | 提升 |
|----------|--------------|--------------|------|
| 5 个任务 | 12.5s | 4.2s | 3x |
| 10 个任务 | 25s | 7.5s | 3.3x |
| 20 个任务 | 50s | 14s | 3.6x |
