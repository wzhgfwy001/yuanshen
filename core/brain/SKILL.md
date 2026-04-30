---
name: brain
description: |
  大脑/记忆核心模块，为混合动态多Agent系统提供记忆存储、上下文管理、
  模式识别和知识图谱功能。模拟人类大脑的记忆分区机制，
  支持短期记忆(Working Memory)、长期记忆(Long-term Memory)和情景记忆(Episodic Memory)。
  触发条件：记忆存取、上下文管理、知识检索、模式识别、学习新知识。
parent: core
version: 1.0.0
triggers:
  - "记忆"
  - "大脑"
  - "上下文"
  - "知识库"
  - "brain"
  - "memory"
  - "context"
  - "knowledge"
  - "pattern"
  - "记忆存储"
  - "知识检索"
usage:
  activate: |
    当用户提到需要存储记忆、检索知识、管理对话上下文、
    识别模式、学习新概念时激活此模块。
  steps:
    1. 加载 brain.ts 初始化大脑核心
    2. 使用 memory-store.ts 进行记忆存取
    3. 使用 context-manager.ts 管理上下文
    4. 使用 pattern-recognizer.ts 识别模式
    5. 提供统一的记忆接口
  examples:
    - "存储这段对话"
    - "检索相关记忆"
    - "管理当前上下文"
    - "识别用户意图模式"
    - "学习新概念"
integration:
  main_file: brain.ts
  dependencies:
    - memory-store.ts
    - context-manager.ts
    - pattern-recognizer.ts
  events:
    - memory:stored
    - memory:retrieved
    - memory:forgotten
    - context:switched
    - context:updated
    - pattern:recognized
    - pattern:new
    - learning:complete
    - knowledge:updated
---

# Brain Module - 大脑/记忆核心

## 概述

Brain模块是混合动态多Agent系统的智能核心，模拟人类大脑的记忆分区机制：

| 记忆类型 | 说明 | 存储时长 | 容量 | 类比 |
|----------|------|----------|------|------|
| **工作记忆** | 当前任务相关 | 秒-分钟 | 7±2项 | 短时记忆 |
| **情景记忆** | 近期交互 | 小时-天 | 1000+ | Episodic |
| **长期记忆** | 持久知识 | 永久 | 无限 | Semantic |
| **程序记忆** | 技能/流程 | 永久 | 无限 | Procedural |

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          Brain Core (brain.ts)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Working    │  │  Episodic    │  │   Long      │             │
│  │  Memory     │  │  Memory      │  │   Term      │             │
│  │  Manager    │  │  Store       │  │   Store     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐               │
│  │              Memory Store (memory-store.ts)    │               │
│  └──────────────────────┬─────────────────────────┘               │
│                         │                                         │
│  ┌──────────────────────┴─────────────────────────┐               │
│  │         Context Manager (context-manager.ts)    │               │
│  │         - Context Window                        │               │
│  │         - Attention Filter                      │               │
│  │         - Relevance Scoring                     │               │
│  └──────────────────────┬─────────────────────────┘               │
│                         │                                         │
│  ┌──────────────────────┴─────────────────────────┐               │
│  │    Pattern Recognizer (pattern-recognizer.ts)  │               │
│  │    - Intent Detection                           │               │
│  │    - Topic Tracking                             │               │
│  │    - Sentiment Analysis                         │               │
│  └─────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. Brain Core (brain.ts)

主控制器，协调各子系统：

```typescript
interface BrainConfig {
  workingMemorySize: number;      // 工作记忆容量 (默认7)
  episodicRetention: number;      // 情景记忆保留时间 (小时)
  longTermCapacity: number;       // 长期记忆容量
  patternThreshold: number;       // 模式识别阈值
  contextWindow: number;          // 上下文窗口大小
}
```

核心方法：

- `remember(content: MemoryContent)` - 存储记忆
- `recall(query: MemoryQuery)` - 检索记忆
- `forget(memoryId: string)` - 遗忘记忆
- `updateContext(messages: Message[])` - 更新上下文
- `recognizePattern(input: any)` - 模式识别
- `learn(concept: Concept)` - 学习新概念

### 2. Memory Store (memory-store.ts)

分层记忆存储：

```typescript
interface MemoryItem {
  id: string;
  type: 'working' | 'episodic' | 'longterm' | 'procedural';
  content: any;
  importance: number;       // 0-1 重要性
  relevance: number;         // 0-1 相关性
  timestamp: number;
  expiresAt?: number;       // 过期时间
  tags: string[];
  embedding?: number[];     // 向量嵌入
  metadata: Record<string, any>;
}
```

### 3. Context Manager (context-manager.ts)

上下文窗口管理：

- **窗口维护** - 保持当前对话的上下文
- **注意力过滤** - 选择最相关的信息
- **相关性评分** - 基于多种因子评分
- **摘要生成** - 自动压缩旧上下文

```typescript
interface ContextWindow {
  messages: Message[];
  summary: string;
  focus: string[];         // 当前焦点话题
  entities: Entity[];      // 提到的实体
  intent: string;          // 当前意图
  relevanceScores: Map<string, number>;
}
```

### 4. Pattern Recognizer (pattern-recognizer.ts)

模式识别引擎：

- **意图检测** - 识别用户意图
- **话题跟踪** - 跟踪讨论话题
- **情感分析** - 分析情感倾向
- **行为预测** - 预测用户行为

```typescript
interface RecognizedPattern {
  type: 'intent' | 'topic' | 'sentiment' | 'behavior';
  label: string;
  confidence: number;      // 0-1
  examples: string[];
  lastMatched: number;
}
```

## 记忆生命周期

```
存储 → 评估重要性 → 分配到适当记忆区
                          ↓
    ┌──────────────────────┼──────────────────────┐
    ↓                      ↓                      ↓
工作记忆              情景记忆               长期记忆
    ↓                      ↓                      ↓
 衰减/遗忘            巩固转移               永久保存
    ↓                      ↓                      ↓
 定期清理              整合优化               按需检索
```

## 使用示例

### 初始化大脑

```typescript
import { Brain } from './brain';

const brain = new Brain({
  workingMemorySize: 7,
  episodicRetention: 24,  // hours
  longTermCapacity: 100000,
  patternThreshold: 0.7,
  contextWindow: 20,
});

brain.on('memory:stored', (item) => {
  console.log('Memory stored:', item.id);
});
```

### 存储记忆

```typescript
await brain.remember({
  type: 'episodic',
  content: {
    event: 'user_asked_about_quantum',
    topic: 'quantum_computing',
    response: 'explanation_about_qubits',
  },
  importance: 0.8,
  tags: ['quantum', 'education', 'user-interest'],
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
  },
});
```

### 检索记忆

```typescript
const memories = await brain.recall({
  query: 'quantum computing',
  type: ['episodic', 'longterm'],
  limit: 5,
  minRelevance: 0.6,
  timeRange: {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000,  // last week
  },
});

memories.forEach(m => console.log(m.content));
```

### 更新上下文

```typescript
brain.updateContext([
  { role: 'user', content: '什么是量子计算？' },
  { role: 'assistant', content: '量子计算是一种...' },
  { role: 'user', content: '它和传统计算有什么区别？' },
]);

const context = brain.getCurrentContext();
console.log(context.summary);
console.log(context.focus);
console.log(context.intent);  // 'compare_technologies'
```

### 模式识别

```typescript
const pattern = brain.recognizePattern({
  type: 'intent',
  input: '帮我查一下天气',
});

console.log(pattern.label);  // 'weather_query'
console.log(pattern.confidence);  // 0.95
```

## 知识图谱集成

```typescript
// 添加知识
brain.learn({
  concept: 'quantum_entanglement',
  definition: '两个粒子之间的神秘关联',
  relations: [
    { type: 'related_to', target: 'quantum_mechanics' },
    { type: 'enables', target: 'quantum_computing' },
  ],
  examples: ['EPR_paradox', 'Bell_test'],
});

// 查询知识
const knowledge = brain.queryKnowledge('quantum_entanglement');
console.log(knowledge.definition);
console.log(knowledge.relations);
```

## 配置参数

```typescript
const brainConfig: BrainConfig = {
  // 工作记忆
  workingMemorySize: 7,           // Miller's Law
  workingMemoryTTL: 300000,       // 5 minutes

  // 情景记忆
  episodicRetention: 24,          // hours
  episodicConsolidation: 3600,   // 1 hour
  episodicMaxItems: 1000,

  // 长期记忆
  longTermCapacity: 100000,
  longTermEncoding: 'semantic',  // semantic or episodic

  // 上下文
  contextWindow: 20,             // messages
  contextSummaryThreshold: 10,   // summarize after N messages

  // 模式识别
  patternThreshold: 0.7,
  intentConfidence: 0.8,
  sentimentWindow: 5,            // messages for sentiment

  // 遗忘
  forgetThreshold: 0.2,           // importance below this → forget
  decayRate: 0.01,               // per hour decay
};
```

## 事件

| 事件 | 说明 | 负载 |
|------|------|------|
| `memory:stored` | 新记忆存储 | `{id, type, importance}` |
| `memory:retrieved` | 记忆被检索 | `{id, relevance}` |
| `memory:forgotten` | 记忆被遗忘 | `{id, reason}` |
| `memory:consolidated` | 记忆被巩固 | `{from, to}` |
| `context:updated` | 上下文更新 | `{windowSize, summary}` |
| `context:switched` | 上下文切换 | `{sessionId}` |
| `pattern:recognized` | 模式识别 | `{type, label, confidence}` |
| `pattern:new` | 新模式发现 | `{pattern}` |
| `learning:complete` | 学习完成 | `{concept}` |
| `knowledge:updated` | 知识更新 | `{concept, action}` |

## 集成到主系统

```typescript
import { Brain } from './core/brain/brain';

// 在Agent初始化时
const agentBrain = new Brain();
agentBrain.initialize();

// 在每次对话时
async function handleMessage(message: string) {
  // 更新上下文
  agentBrain.updateContext([{ role: 'user', content: message }]);
  
  // 识别意图
  const intent = agentBrain.recognizePattern({ type: 'intent', input: message });
  
  // 检索相关记忆
  const memories = await agentBrain.recall({ query: message });
  
  // 生成响应
  const response = await generateResponse(message, {
    context: agentBrain.getCurrentContext(),
    memories,
    intent,
  });
  
  // 存储这次交互
  await agentBrain.remember({
    type: 'episodic',
    content: { message, response, intent },
    importance: 0.7,
  });
  
  return response;
}
```

## 相关文件

- `brain.ts` - 大脑核心
- `memory-store.ts` - 记忆存储
- `context-manager.ts` - 上下文管理
- `pattern-recognizer.ts` - 模式识别
