---
name: deerflow-cache
description: DeerFlow增强版缓存系统 - 多级缓存、LRU/LFU淘汰策略、TTL过期、命中率统计
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | caching=true | cache_enabled=true | multi_level_cache=true
---

# DeerFlow增强版缓存系统

**【附魔·改】Cache Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 缓存启用 | `caching=true` | 启用缓存 |
| 多级缓存 | `multi_level_cache=true` | 使用L1/L2/L3多级缓存 |

## 核心功能

### 1. 基础缓存操作

```javascript
const { CacheManager, EVICTION_POLICIES } = require('./deerflow_enhanced.js');

const cache = new CacheManager({
  maxSize: 1000,
  defaultTTL: 3600000,  // 1小时
  evictionPolicy: EVICTION_POLICIES.LRU
});

// 设置缓存
cache.set('user:123', { name: 'John', email: 'john@example.com' });

// 获取缓存
const user = cache.get('user:123');
if (user) {
  console.log('缓存命中:', user);
} else {
  console.log('缓存未命中');
}

// 检查存在
if (cache.has('user:123')) {
  console.log('键存在');
}

// 删除
cache.delete('user:123');

// 清空
cache.clear();
```

### 2. TTL过期

```javascript
// 设置带TTL的缓存
cache.set('session:token', tokenData, {
  ttl: 1800000  // 30分钟
});

// 检查是否过期
const entry = cache.getEntry('session:token');
if (entry && entry.isExpired()) {
  console.log('已过期');
}
```

### 3. 自动生成键

```javascript
// 自动生成缓存键
const key = cache.generateKey('user', 'profile', userId);
cache.set(key, userProfile);

// 使用相同参数获取
const profile = cache.get(key);
```

### 4. 多级缓存

```javascript
const { MultiLevelCache } = require('./deerflow_enhanced.js');

const multiCache = new MultiLevelCache({
  l1Size: 100,    // L1: 100项
  l1TTL: 60000,   // L1: 1分钟
  l2Size: 1000,   // L2: 1000项
  l2TTL: 300000,  // L2: 5分钟
  l3Size: 10000,   // L3: 10000项
  l3TTL: 3600000  // L3: 1小时
});

// 获取 - 自动从L1->L2->L3逐级查找
const result = multiCache.get('my-key');
if (result.value) {
  console.log(`命中L${result.level} (来源: ${result.source})`);
}

// 设置 - 写入所有级别
multiCache.set('my-key', myData);

// 删除 - 删除所有级别
multiCache.delete('my-key');
```

### 5. 淘汰策略

```javascript
// LRU - 最近最少使用 (默认)
const lruCache = new CacheManager({
  evictionPolicy: EVICTION_POLICIES.LRU
});

// LFU - 最不经常使用
const lfuCache = new CacheManager({
  evictionPolicy: EVICTION_POLICIES.LFU
});

// FIFO - 先进先出
const fifoCache = new CacheManager({
  evictionPolicy: EVICTION_POLICIES.FIFO
});
```

### 6. 命中统计

```javascript
// 获取统计
const stats = cache.getStats();
console.log(`
缓存大小: ${stats.size} / ${stats.maxSize}
命中率: ${stats.hitRate}
命中: ${stats.hits}
未命中: ${stats.misses}
淘汰: ${stats.evictions}
过期: ${stats.expirations}
`);

// 事件监听
cache.on('hit', (data) => {
  console.log(`命中! 总命中: ${data.hits}`);
});

cache.on('miss', (data) => {
  console.log(`未命中! 总未命中: ${data.misses}`);
});

cache.on('evicted', ({ key }) => {
  console.log(`淘汰键: ${key}`);
});
```

## 集成示例

### LLM响应缓存

```javascript
const llmCache = new CacheManager({
  maxSize: 500,
  defaultTTL: 1800000  // 30分钟
});

async function callLLMWithCache(prompt, model) {
  const cacheKey = llmCache.generateKey(prompt, model);
  
  // 检查缓存
  const cached = llmCache.get(cacheKey);
  if (cached) {
    console.log('使用缓存响应');
    return cached;
  }
  
  // 调用API
  const response = await callModelAPI(model, prompt);
  
  // 存入缓存
  llmCache.set(cacheKey, response);
  
  return response;
}
```

### 用户会话缓存

```javascript
const sessionCache = new MultiLevelCache({
  l1Size: 50,
  l1TTL: 60000,     // 1分钟本地
  l2Size: 500,
  l2TTL: 300000,    // 5分钟进程级
  l3Size: 5000,
  l3TTL: 1800000    // 30分钟持久化
});

async function getSession(sessionId) {
  const result = sessionCache.get(sessionId);
  if (result.value) return result.value;
  
  // 从数据库加载
  const session = await db.sessions.findById(sessionId);
  sessionCache.set(sessionId, session);
  return session;
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
