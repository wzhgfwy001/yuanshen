---
name: brain-core
description: 元神系统核心大脑模块，负责记忆存储、检索、三层记忆分层（L1/L2/L3）、会话状态管理
parent: dynamic-multi-agent-system
version: 2.0.0
triggers:
  - "memory_store"
  - "memory_search"
  - "memory_consolidate"
  - "session_update"
  - "context_compact"
---

# brain-core

**【核心记忆】Brain Core — 元神系统的三层记忆引擎**

## 功能定位

brain-core是元神系统的**核心记忆管理模块**，负责：
1. 三层记忆分层（L1/L2/L3）
2. 长期记忆存储与检索
3. 会话状态管理（SESSION-STATE.md）
4. 上下文压缩与整理
5. 记忆固化与遗忘机制

## 记忆分层架构

### L1 - 即时记忆（Active Memory）

**定义**：当前会话的活跃上下文

**特征**：
- 存储位置：工作内存
- 生命周期：当前会话
- 容量：约50KB
- 淘汰：会话结束时清除或压缩

**内容**：
- 当前对话内容
- 正在执行的任务
- 临时计算结果

### L2 - 场景记忆（Session Memory）

**定义**：近期重要会话的摘要

**特征**：
- 存储位置：memory/YYYY-MM-DD.md
- 生命周期：最近7天
- 容量：每日约5-10KB
- 淘汰：7天后归档或删除

**内容**：
- 每日活动摘要
- 任务完成记录
- 重要决策记录

### L3 - 长期记忆（Long-term Memory）

**定义**：持久化的知识与经验

**特征**：
- 存储位置：brain/
- 生命周期：永久或手动删除
- 容量：无限制
- 淘汰：通过遗忘机制选择性删除

**内容**：
- MEMORY.md（长期记忆）
- brain/decisions/（决策归档）
- brain/lessons/（错误教训）
- brain/patterns/（成功模式）
- brain/knowledge_reserve/（知识储备）

## 核心功能

### 1. 记忆存储

**方法**：`storeMemory(type, content, metadata)`

```typescript
interface MemoryEntry {
  id: string;
  type: 'active' | 'session' | 'longterm';
  content: string;
  timestamp: number;
  tags: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
  source: 'user' | 'system' | 'agent';
  expires?: number;
}

async function storeMemory(
  type: 'active' | 'session' | 'longterm',
  content: string,
  metadata?: Partial<MemoryEntry>
): Promise<string> {
  const entry: MemoryEntry = {
    id: generateId(),
    type,
    content,
    timestamp: Date.now(),
    tags: metadata?.tags || [],
    importance: metadata?.importance || 'medium',
    source: metadata?.source || 'system',
    expires: metadata?.expires
  };
  
  // 存储到对应层级
  if (type === 'active') {
    await storeToActiveMemory(entry);
  } else if (type === 'session') {
    await storeToSessionMemory(entry);
  } else {
    await storeToLongTermMemory(entry);
  }
  
  return entry.id;
}
```

### 2. 记忆检索

**方法**：`searchMemory(query, options)`

```typescript
interface SearchOptions {
  types?: ('active' | 'session' | 'longterm')[];
  tags?: string[];
  since?: number;
  until?: number;
  limit?: number;
  minImportance?: 'low' | 'medium' | 'high' | 'critical';
}

async function searchMemory(
  query: string,
  options?: SearchOptions
): Promise<MemoryEntry[]> {
  // 1. 纯文本搜索（已降级，原向量搜索已卸载）
  const results = await plainTextSearch(query, options);
  
  // 2. 按时间排序
  results.sort((a, b) => b.timestamp - a.timestamp);
  
  // 3. 限制返回数量
  return results.slice(0, options?.limit || 50);
}
```

### 3. 三层记忆分层存储

```typescript
// L1: Active Memory
async function storeToActiveMemory(entry: MemoryEntry): Promise<void> {
  // 存储到工作缓冲区
  workingBuffer.push(entry);
  
  // 检查容量，超过则压缩
  if (workingBuffer.size > ACTIVE_MEMORY_LIMIT) {
    await compressActiveMemory();
  }
}

// L2: Session Memory
async function storeToSessionMemory(entry: MemoryEntry): Promise<void> {
  // 存储到每日文件
  const date = new Date().toISOString().split('T')[0];
  const file = `memory/${date}.md`;
  
  const existing = await readFile(file);
  const updated = existing + formatMemoryEntry(entry);
  await writeFile(file, updated);
}

// L3: Long-term Memory  
async function storeToLongTermMemory(entry: MemoryEntry): Promise<void> {
  // 存储到brain/目录
  const category = getCategoryForEntry(entry);
  const file = `brain/${category}/${entry.id}.md`;
  
  await writeFile(file, formatMemoryEntry(entry));
  
  // 更新索引
  await updateMemoryIndex(entry);
}
```

### 4. 记忆压缩（Context Compaction）

**触发条件**：
- L1内存使用>60%
- 会话上下文即将超出限制
- 定期整理（每小时）

**压缩流程**：
```
1. 识别当前会话关键信息
2. 生成压缩摘要
3. 保留高重要性条目
4. 清除低价值临时数据
5. 更新L1容量
```

**压缩算法**：
```typescript
async function compressActiveMemory(): Promise<string> {
  // 1. 评估每条记忆的重要性
  const scored = await scoreMemoryImportance(workingBuffer);
  
  // 2. 保留最高分的条目
  const preserved = scored
    .filter(s => s.score >= IMPORTANCE_THRESHOLD)
    .map(s => s.entry);
  
  // 3. 生成摘要
  const summary = await generateMemorySummary(workingBuffer);
  
  // 4. 替换为摘要+重要条目
  workingBuffer = {
    type: 'compacted',
    summary,
    entries: preserved,
    timestamp: Date.now()
  };
  
  return summary;
}
```

### 5. 记忆固化（Memory Consolidation）

**触发条件**：
- L2记忆超过7天
- 特定重要性标记（high/critical）
- 用户明确要求固化

**固化流程**：
```
L2记忆 → 分析重要性 → 提取关键信息 → 存入L3 → 标记为已固化
```

### 6. 遗忘机制（Forgetting）

**触发条件**：
- L3容量超过阈值
- 记忆超过保留期限
- 重要性持续降低

**遗忘策略**：
```typescript
const FORGETTING_POLICY = {
  maxEntries: 10000,      // L3最大条目数
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1年
  minImportance: 'low',   // 最低可遗忘级别
  decayRate: 0.1,         // 重要性衰减率
  
  // 遗忘时优先删除
  priority: [
    'low_importance_old',    // 1. 低重要性+旧
    'medium_importance_old', // 2. 中重要性+很旧
    'any_low_recency'       // 3. 任何低访问频率
  ]
};
```

## 文件结构

### brain/ 目录

```
brain/
├── decisions/           # 决策归档
│   ├── YYYY-MM-DD-*.md
│   └── ...
├── lessons/            # 错误教训
│   ├── YYYY-MM-DD-*.md
│   └── ...
├── patterns/           # 成功模式
│   └── ...
├── knowledge_reserve/  # 知识储备
│   └── ...
├── projects/          # 项目记忆
│   └── ...
├── agents/            # Agent记忆
│   └── ...
├── me/                # 自我认知
│   ├── identity.md
│   └── ...
├── user_preferences/  # 用户偏好
│   └── ...
├── tasks/             # 任务状态
│   └── ...
├── standing-orders/    # 持久化指令
│   └── ...
├── common_knowledge/   # 通用知识
│   └── ...
└── inbox.md          # 待处理事项
```

### memory/ 目录

```
memory/
├── YYYY-MM-DD.md      # 每日记忆
├── YYYY-MM-DD.md
└── ...
```

## 会话状态管理

### SESSION-STATE.md

**位置**：工作区根目录

**内容**：
```markdown
# SESSION-STATE.md - 当前会话关键状态

## 当前会话
- 会话开始时间
- 当前任务
- 用户目标

## 用户偏好
- Dreaming模式
- 其他偏好

## 开发规范
- 多Agent使用规则
- 并行处理规则
- 审查机制
```

### progress.json

**位置**：brain/progress.json

**内容**：
```json
{
  "meta": {
    "created": "2026-04-16T00:23:00+08:00",
    "last_updated": "2026-04-23T01:16:00+08:00",
    "version": 8
  },
  "goal": {
    "description": "帮助主人实现财富自由",
    "stability": "high"
  },
  "user_context": {},
  "dev_rules": {},
  "vector_sync": {},
  "memory_rules": {}
}
```

## 上下文守卫（Context Guardian）

### 阈值配置

```typescript
const CONTEXT_GUARDIAN = {
  thresholds: {
    level1: 0.6,  // 60% - 记录，不行动
    level2: 0.8,  // 80% - 清理working-buffer + 保存记忆
    level3: 0.9   // 90% - 强制压缩 + 通知用户
  },
  checkInterval: 30 * 60 * 1000, // 30分钟检查一次
  actionInterval: 60 * 60 * 1000  // 60分钟执行一次整理
};
```

### 触发行为

| 层级 | 阈值 | 行为 |
|------|------|------|
| L1 | 60% | 记录到working-buffer.md，继续 |
| L2 | 80% | 清理working-buffer + 保存记忆 |
| L3 | 90% | 强制压缩 + 通知用户暂停 |

## 集成接口

### 与其他模块的集成

```typescript
// subagent-manager → brain
subagentManager.on('taskCompleted', async (task) => {
  await storeMemory('session', `任务完成: ${task.id}`, {
    tags: ['task', 'completed'],
    importance: 'high'
  });
});

// task-decomposer → brain
taskDecomposer.on('taskDecomposed', async (result) => {
  await storeMemory('active', `分解任务: ${result.subtasks.length}个子任务`, {
    tags: ['task', 'decomposition']
  });
});

// quality-checker → brain
qualityChecker.on('qualityIssue', async (issue) => {
  await storeMemory('longterm', `质量问题: ${issue.description}`, {
    tags: ['quality', 'issue'],
    importance: 'high',
    source: 'system'
  });
});
```

## 使用示例

### 存储记忆

```typescript
import { storeMemory, searchMemory } from './brain';

// 存储用户偏好
await storeMemory('longterm', '用户偏好高端UI设计', {
  tags: ['preference', 'ui'],
  importance: 'high',
  source: 'user'
});

// 存储任务完成
await storeMemory('session', '完成高考志愿系统v1.6开发', {
  tags: ['task', 'completed', 'gaokao'],
  importance: 'high',
  source: 'system'
});
```

### 检索记忆

```typescript
// 搜索与"高考"相关的记忆
const results = await searchMemory('高考', {
  types: ['session', 'longterm'],
  limit: 10
});

results.forEach(r => console.log(r.content));
```

### 检查上下文使用

```typescript
import { getContextUsage } from './brain';

const usage = await getContextUsage();
if (usage > 0.8) {
  console.log('上下文使用率过高，触发清理');
  await compressActiveMemory();
}
```

## 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 检索速度 | <100ms | 纯文本搜索 |
| 存储速度 | <50ms | 单条记忆 |
| 压缩速度 | <500ms | 上下文压缩 |
| L1容量控制 | <60% | 常态 |

## 向量搜索降级说明

**2026-04-22**：由于内存压力，LM Studio + ChromaDB已卸载

**当前状态**：
- ✅ 纯文本搜索正常工作
- ❌ 向量语义搜索已禁用
- ❌ writeAndVectorize() 已失效
- ❌ deleteAndRemoveVector() 已失效

**替代方案**：
- 使用关键词匹配
- 使用正则表达式
- 定期手动整理记忆

---

*版本：v2.0.0*  
*创建时间：2026-04-24*  
*基于阴神系统v1.3架构*
