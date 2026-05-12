---
name: result-cache
description: "结果缓存组件。为阳神系统提供请求缓存能力，相同任务直接返回缓存结果，避免重复执行节省Token。"
version: 1.0.0
parent: dynamic-multi-agent-system
author: 元神
date: 2026-04-15
---

# result-cache

**【纳影球】Shadow Orb** — 任务缓存

## 概述

result-cache 为阳神系统提供请求缓存能力，基于任务内容的语义哈希生成缓存Key，命中时直接返回缓存结果。

## 核心功能

### 1. 缓存存储
- 存储位置：`~/.openclaw/cache/result-cache/`
- 存储格式：JSON 文件（每个缓存一个文件）
- 索引文件：`cache-index.json`（Key → 文件名映射）

### 2. 缓存策略

| 参数 | 值 | 说明 |
|------|-----|------|
| TTL | 1小时 | 缓存有效期 |
| Max Size | 500条 | 最大缓存条目数 |
| Cleanup | 自动 | 超过Max Size时清理最旧条目 |

### 3. Key 生成
```
Hash = SHA256(任务类型 + 任务内容 + 关键参数)
```

### 4. 缓存命中条件
- 任务类型相同
- 任务内容相似度 > 90%
- 缓存未过期
- 用户ID匹配

## API

### `cache.get(taskDescriptor)`

检查缓存是否命中：

```typescript
interface TaskDescriptor {
  type: 'simple' | 'standard' | 'hybrid' | 'innovative';
  content: string;
  params?: Record<string, any>;
  userId?: string;
}

interface CacheResult {
  hit: boolean;
  cached?: any;
  key?: string;
  age?: number; // 秒
}
```

### `cache.set(key, result)`

存储缓存结果：

```typescript
interface CacheEntry {
  key: string;
  result: any;
  timestamp: number;
  taskType: string;
  userId?: string;
}
```

### `cache.clear()`

清空所有缓存。

### `cache.stats()`

获取缓存统计：

```typescript
interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number; // timestamp
}
```

## 集成到阳神系统

### 修改 task-classifier

在任务分类后、检查是否需要分解前，插入缓存检查：

```typescript
import { cache } from '../result-cache/cache';

async function classifyAndCheckCache(task: string) {
  const classification = await classifyTask(task);
  
  // 检查缓存
  const cached = await cache.get({
    type: classification.taskType,
    content: task,
    params: { ... }
  });
  
  if (cached.hit) {
    return {
      ...classification,
      cached: true,
      result: cached.result
    };
  }
  
  return classification;
}
```

### 修改执行协调器

任务完成后存储结果：

```typescript
async function executeWithCache(subtasks: SubTask[]) {
  const result = await execute(subtasks);
  
  // 存储缓存
  await cache.set(taskKey, result);
  
  return result;
}
```

## 配置

缓存目录可在环境变量中指定：

```bash
export RESULT_CACHE_DIR="~/.openclaw/cache/result-cache"
export RESULT_CACHE_TTL=3600  # 秒
export RESULT_CACHE_MAX=500
```

## 性能提升

| 场景 | 无缓存 | 有缓存 |
|------|--------|--------|
| 相同任务重复执行 | 100% Token | ~5% Token |
| 每日节省 | - | 20-40% |

---

## 标准交付物输出格式

本SKILL执行完毕后，必须输出以下格式的交付物：

```json
{
  "task": "缓存任务描述",
  "result": {
    "summary": "简要结果（1-2句话）",
    "details": "详细缓存结果",
    "data": {
      "hit": true,
      "key": "sha256:abc123...",
      "age": 10800,
      "cachedResult": {},
      "tokenSaved": 7500,
      "timeSavedSeconds": 120
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 100,
    "readability": 90
  },
  "issues": [],
  "suggestions": ["TTL可考虑根据任务类型调整"]
}
```

---

*为阳神系统 v2.0.0 提供缓存能力*
