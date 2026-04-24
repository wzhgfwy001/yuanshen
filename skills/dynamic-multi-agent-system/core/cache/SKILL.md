---
name: token-cache
description: Token 缓存管理器，缓存 API 响应，避免重复调用，节省 Token
parent: dynamic-multi-agent-system
version: 1.0.0
---

# Token 缓存管理器 (Token Cache)

## 功能

缓存 API 响应，识别相似查询，返回缓存结果，避免重复 API 调用，显著节省 Token。

## 核心优势

| 优势 | 说明 | 节省效果 |
|------|------|----------|
| **零延迟** | 缓存命中即时返回 | 100% 时间节省 |
| **零 Token** | 无需调用 API | 100% Token 节省 |
| **智能匹配** | 语义相似度匹配 | 扩大缓存命中 |
| **持久化** | 重启后保留缓存 | 长期受益 |

---

## 缓存策略

### 1. 精确匹配缓存

```typescript
interface ExactMatchCache {
  // 键：Prompt 的 SHA256 哈希
  // 值：API 响应 + 元数据
  store: Map<string, CacheEntry>;
  
  get(prompt: string): string | null;
  set(prompt: string, response: string, ttl?: number): void;
}
```

**适用场景：**
- 完全相同的 Prompt
- 标准化查询
- 模板化任务

**命中率：** 15-25%

---

### 2. 语义匹配缓存

```typescript
interface SemanticMatchCache {
  // 使用嵌入向量相似度
  similarityThreshold: number;  // 0.85
  
  get(prompt: string): string | null;
  set(prompt: string, response: string, embedding: number[]): void;
}
```

**适用场景：**
- 语义相似的查询
- 不同表述的相同问题
- 变体任务

**命中率：** 25-40%

---

### 3. 模板缓存

```typescript
interface TemplateCache {
  // 提取 Prompt 模板
  // "把{content}翻译成{lang}" → 模板
  templates: Map<string, TemplateEntry>;
  
  match(prompt: string): TemplateMatch | null;
  fill(template: string, slots: Record<string, string>): string;
}
```

**适用场景：**
- 翻译任务
- 格式化任务
- 结构化输出

**命中率：** 20-35%

---

## 缓存生命周期

### TTL（Time To Live）

```typescript
interface CacheEntry {
  response: string;
  createdAt: number;
  ttl: number;          // 生存时间（秒）
  hits: number;         // 命中次数
  prompt: string;
  embedding?: number[];
}

// 默认 TTL
const DEFAULT_TTL = {
  exact: 3600 * 24,      // 精确匹配：24 小时
  semantic: 3600 * 12,   // 语义匹配：12 小时
  template: 3600 * 6,    // 模板：6 小时
};
```

### 清理策略

```typescript
// LRU（最近最少使用）清理
function cleanupLRU(maxSize: number = 10000) {
  if (cache.size > maxSize) {
    // 删除最老的 20%
    const toDelete = Array.from(cache.entries())
      .sort((a, b) => a[1].lastHit - b[1].lastHit)
      .slice(0, maxSize * 0.2)
      .map(entry => entry[0]);
    
    toDelete.forEach(key => cache.delete(key));
  }
}

// 过期清理
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > entry.ttl) {
      cache.delete(key);
    }
  }
}
```

---

## 使用示例

### 基础用法

```typescript
import { TokenCache } from './cache';

const cache = new TokenCache({
  maxSize: 10000,
  defaultTTL: 3600 * 24,
  persist: true,
});

// 检查缓存
const cached = cache.get(prompt);
if (cached) {
  console.log('缓存命中！节省 Token');
  return cached;
}

// 调用 API
const response = await callAPI(prompt);

// 存入缓存
cache.set(prompt, response);

return response;
```

### 语义缓存

```typescript
import { SemanticCache } from './semantic-cache';

const semanticCache = new SemanticCache({
  threshold: 0.85,
  model: 'bge-small',  // 本地嵌入模型
});

// 获取（自动计算嵌入）
const result = await semanticCache.get(prompt);
if (result) {
  // 相似度 > 0.85，返回缓存
  return result.response;
}

// 调用 API
const response = await callAPI(prompt);

// 存入缓存（计算并存储嵌入）
await semanticCache.set(prompt, response);
```

### 模板缓存

```typescript
import { TemplateCache } from './template-cache';

const templateCache = new TemplateCache();

// 提取模板
const template = templateCache.extractTemplate(prompt);
// "把这段文字翻译成英文" → "把{content}翻译成{lang}"

// 匹配模板
const match = templateCache.match(prompt);
if (match) {
  // 填充槽位
  const filled = templateCache.fill(match.template, {
    content: userContent,
    lang: '英文'
  });
  return filled;
}
```

---

## 缓存统计

### 实时统计

```typescript
interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  tokenSaved: number;
  avgResponseTime: number;
  memoryUsage: number;
}

function getStats(): CacheStats {
  return {
    totalEntries: cache.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses),
    tokenSaved: stats.hits * avgTokenPerCall,
    avgResponseTime: stats.totalTime / stats.totalCalls,
    memoryUsage: calculateMemoryUsage(),
  };
}
```

### 示例输出

```
Token 缓存统计
├─ 总条目：3,245
├─ 命中：1,523 (32%)
├─ 未命中：3,245
├─ 节省 Token: 761,500
├─ 平均响应：45ms (vs 2500ms API)
└─ 内存占用：12.5MB
```

---

## 持久化

### 保存到文件

```typescript
async function saveToFile(filePath: string) {
  const data = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    response: entry.response,
    createdAt: entry.createdAt,
    ttl: entry.ttl,
    hits: entry.hits,
    embedding: entry.embedding,
  }));
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
```

### 从文件加载

```typescript
async function loadFromFile(filePath: string) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
  
  for (const item of data) {
    // 检查是否过期
    if (Date.now() - item.createdAt < item.ttl) {
      cache.set(item.key, item.response, item.ttl);
    }
  }
}
```

---

## 性能优化

### 1. 内存限制

```typescript
interface MemoryLimit {
  maxEntries: number;      // 最大条目数
  maxMemoryMB: number;     // 最大内存（MB）
  
  checkLimit(): boolean;
  evict(): void;
}
```

### 2. 分片缓存

```typescript
// 按任务类型分片
const caches = {
  translation: new TokenCache({ maxSize: 2000 }),
  summarization: new TokenCache({ maxSize: 3000 }),
  analysis: new TokenCache({ maxSize: 5000 }),
  writing: new TokenCache({ maxSize: 10000 }),
};
```

### 3. 预热点

```typescript
// 启动时预热点数据
async function warmup() {
  const commonPrompts = [
    '翻译以下内容为英文',
    '总结这篇文章',
    '分析这个数据',
    // ...
  ];
  
  for (const prompt of commonPrompts) {
    // 预加载常用缓存
    await cache.preload(prompt);
  }
}
```

---

## 最佳实践

### ✅ 推荐

1. **启用持久化** - 重启后保留缓存
2. **设置合理 TTL** - 避免过期数据
3. **定期清理** - 保持缓存新鲜
4. **监控命中率** - 优化缓存策略
5. **语义 + 精确结合** - 最大化命中

### ❌ 避免

1. **缓存敏感数据** - 隐私/安全问题
2. **无限增长** - 内存泄漏风险
3. **永久 TTL** - 数据可能过时
4. **忽略统计** - 无法优化

---

## 预期效果

### Token 节省

| 场景 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| 重复查询 | 10000 Token | 0 Token | 100% |
| 相似查询 | 10000 Token | 0 Token | 100% |
| 模板任务 | 10000 Token | 500 Token | 95% |
| 平均场景 | 10000 Token | 4000 Token | 60% |

### 响应时间

| 场景 | API 调用 | 缓存命中 | 提升 |
|------|----------|----------|------|
| 精确匹配 | 2500ms | 5ms | 500x |
| 语义匹配 | 2500ms | 50ms | 50x |
| 模板填充 | 2500ms | 10ms | 250x |

---

*Token 缓存管理器 v1.0*  
*创建时间：2026-04-05*  
*预期节省：30-60% Token*
