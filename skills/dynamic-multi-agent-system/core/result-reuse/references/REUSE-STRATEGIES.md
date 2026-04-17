# 结果复用策略完整参考

## 相似度计算

### 语义相似度

```typescript
interface SemanticSimilarity {
  threshold: number;  // 0.85
  model: string;      // 本地嵌入模型
}

async function calculateSemanticSimilarity(
  task1: string,
  task2: string
): Promise<number> {
  // 使用本地嵌入模型（如 BGE-Small）
  const embedding1 = await embed(task1);
  const embedding2 = await embed(task2);
  
  // 余弦相似度
  const similarity = cosineSimilarity(embedding1, embedding2);
  
  return similarity;
}

// 相似度阈值
const SIMILARITY_THRESHOLDS = {
  exact: 0.95,      // 几乎相同 → 直接复用
  high: 0.85,       // 高度相似 → 微调复用
  medium: 0.70,     // 中度相似 → 部分复用
  low: 0.50,        // 低度相似 → 参考结构
};
```

### 结构相似度

```typescript
interface StructuralSimilarity {
  sameTaskType: boolean;
  sameOutputFormat: boolean;
  sameComplexity: boolean;
  sameDomain: boolean;
}

function calculateStructuralSimilarity(
  task1: Task,
  task2: Task
): StructuralSimilarity {
  return {
    sameTaskType: task1.type === task2.type,
    sameOutputFormat: task1.outputFormat === task2.outputFormat,
    sameComplexity: Math.abs(task1.complexity - task2.complexity) < 2,
    sameDomain: task1.domain === task2.domain,
  };
}

// 结构相似度得分
function structuralScore(sim: StructuralSimilarity): number {
  const weights = {
    sameTaskType: 0.4,
    sameOutputFormat: 0.3,
    sameComplexity: 0.2,
    sameDomain: 0.1,
  };
  
  return (
    (sim.sameTaskType ? weights.sameTaskType : 0) +
    (sim.sameOutputFormat ? weights.sameOutputFormat : 0) +
    (sim.sameComplexity ? weights.sameComplexity : 0) +
    (sim.sameDomain ? weights.sameDomain : 0)
  );
}
```

### 综合相似度

```typescript
interface OverallSimilarity {
  semantic: number;
  structural: number;
  combined: number;
  recommendation: 'reuse' | 'tweak' | 'partial' | 'reference';
}

function calculateOverallSimilarity(
  task1: Task,
  task2: Task,
  historicalResult: HistoricalResult
): OverallSimilarity {
  const semantic = await calculateSemanticSimilarity(
    task1.description,
    task2.description
  );
  
  const structural = structuralScore(
    calculateStructuralSimilarity(task1, task2)
  );
  
  // 综合得分（语义 70% + 结构 30%）
  const combined = semantic * 0.7 + structural * 0.3;
  
  // 推荐策略
  let recommendation: OverallSimilarity['recommendation'];
  if (combined >= 0.95) {
    recommendation = 'reuse';      // 直接复用
  } else if (combined >= 0.85) {
    recommendation = 'tweak';      // 微调复用
  } else if (combined >= 0.70) {
    recommendation = 'partial';    // 部分复用
  } else {
    recommendation = 'reference';  // 仅供参考
  }
  
  return { semantic, structural, combined, recommendation };
}
```

## 复用策略

### 策略 1：直接复用

```typescript
interface DirectReuse {
  condition: similarity >= 0.95;
  action: return historicalResult;
  tokenSaved: 100%;
}

async function directReuse(
  currentTask: Task,
  historicalResult: HistoricalResult
): Promise<Result> {
  console.log('✅ 直接复用历史结果');
  
  return {
    content: historicalResult.content,
    metadata: {
      ...historicalResult.metadata,
      reusedFrom: historicalResult.taskId,
      reusedAt: new Date().toISOString(),
      similarity: historicalResult.similarity,
    },
  };
}
```

**适用场景：**
- 完全相同的任务
- 标准化查询
- 模板化输出

### 策略 2：微调复用

```typescript
interface TweakReuse {
  condition: similarity >= 0.85;
  action: modify based on differences;
  tokenSaved: 70-80%;
}

async function tweakReuse(
  currentTask: Task,
  historicalResult: HistoricalResult
): Promise<Result> {
  // 识别差异
  const differences = identifyDifferences(currentTask, historicalResult.task);
  
  // 生成微调 Prompt
  const prompt = `请基于以下历史结果，根据新需求进行调整：

历史结果：
${historicalResult.content}

新需求差异：
${differences.map(d => `- ${d}`).join('\n')}

请在历史结果基础上，仅修改需要调整的部分，保持其他内容不变。`;

  // 使用轻量模型微调
  const tweakedResult = await callAPI('minimax-m2.5', prompt);
  
  return {
    content: tweakedResult,
    metadata: {
      tweakedFrom: historicalResult.taskId,
      tokenSaved: 0.75,  // 节省 75%
    },
  };
}
```

**适用场景：**
- 高度相似但有细微差别
- 参数变化（如语言、风格）
- 内容扩展或缩减

### 策略 3：部分复用

```typescript
interface PartialReuse {
  condition: similarity >= 0.70;
  action: reuse relevant sections;
  tokenSaved: 40-60%;
}

async function partialReuse(
  currentTask: Task,
  historicalResult: HistoricalResult
): Promise<Result> {
  // 识别可复用部分
  const reusableSections = identifyReusableSections(
    currentTask,
    historicalResult.content
  );
  
  // 生成部分复用 Prompt
  const prompt = `请参考以下相关内容，生成新内容：

可参考内容：
${reusableSections.map(s => `## ${s.title}\n${s.content}`).join('\n\n')}

新任务要求：
${currentTask.description}

请借鉴参考内容的结构和风格，生成符合新要求的完整内容。`;

  const result = await callAPI(selectModel(currentTask), prompt);
  
  return {
    content: result,
    metadata: {
      partiallyReusedFrom: historicalResult.taskId,
      reusedSections: reusableSections.length,
      tokenSaved: 0.5,  // 节省 50%
    },
  };
}
```

**适用场景：**
- 部分章节相似
- 结构可借鉴
- 风格需保持一致

## 历史结果管理

### 存储结构

```typescript
interface HistoricalResult {
  taskId: string;
  task: Task;
  content: string;
  embedding: number[];  // 语义嵌入
  metadata: {
    createdAt: string;
    tokensUsed: number;
    model: string;
    quality: number;
    reuseCount: number;  // 被复用次数
  };
}

// 存储
const historicalResults = new Map<string, HistoricalResult>();

// 索引（用于快速检索）
const semanticIndex = new SemanticIndex({
  dimension: 384,  // BGE-Small 维度
  metric: 'cosine',
});
```

### 检索优化

```typescript
async function findSimilarResults(
  task: Task,
  limit: number = 5
): Promise<HistoricalResult[]> {
  // 计算当前任务嵌入
  const embedding = await embed(task.description);
  
  // 语义检索
  const similar = await semanticIndex.search(embedding, limit);
  
  // 过滤（至少结构相似）
  const filtered = similar.filter(result => {
    const structuralSim = structuralScore(
      calculateStructuralSimilarity(task, result.task)
    );
    return structuralSim >= 0.5;
  });
  
  return filtered;
}
```

## 性能监控

### 复用统计

```typescript
interface ReuseStats {
  totalTasks: number;
  reusedTasks: number;
  reuseRate: number;
  tokenSaved: number;
  avgSimilarity: number;
  topReusedResults: HistoricalResult[];
}

function getReuseStats(): ReuseStats {
  return {
    totalTasks: stats.total,
    reusedTasks: stats.reused,
    reuseRate: stats.reused / stats.total,
    tokenSaved: stats.savedTokens,
    avgSimilarity: stats.avgSimilarity,
    topReusedResults: getMostReusedResults(10),
  };
}
```

### 示例输出

```
结果复用统计（最近 1000 个任务）
├─ 总任务数：1000
├─ 复用任务：350 (35%)
│  ├─ 直接复用：50 (5%)
│  ├─ 微调复用：150 (15%)
│  └─ 部分复用：150 (15%)
├─ 节省 Token: 525,000 (52%)
├─ 平均相似度：0.87
└─ 最常被复用 Top5:
   1. 公司简介模板 - 复用 45 次
   2. 产品描述模板 - 复用 38 次
   3. 邮件回复模板 - 复用 32 次
   4. 会议纪要模板 - 复用 28 次
   5. 项目计划模板 - 复用 25 次
```

## 预期效果

### Token 节省

| 复用类型 | 节省比例 | 适用场景 |
|----------|----------|----------|
| 直接复用 | 100% | 相同任务 |
| 微调复用 | 70-80% | 高度相似 |
| 部分复用 | 40-60% | 中度相似 |
| 平均 | 50-60% | 混合场景 |

### 复用率

| 场景 | 复用率 | 平均相似度 |
|------|--------|------------|
| 模板任务 | 80% | 0.92 |
| 标准化任务 | 60% | 0.88 |
| 创意任务 | 20% | 0.75 |
| 平均 | 35-45% | 0.85 |
