/**
 * result-cache - 任务结果缓存 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化 (async/await)
 * 2. 中间件管道钩子
 * 3. LRU淘汰策略
 * 4. 缓存标签系统
 * 5. 结构化状态
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class CacheEntry {
  constructor(key, result, options = {}) {
    this.key = key;
    this.result = result;
    this.timestamp = Date.now();
    this.taskType = options.taskType || 'unknown';
    this.userId = options.userId || 'default';
    this.tags = options.tags || [];
    this.size = this.calculateSize();
    this.accessCount = 0;
    this.lastAccess = this.timestamp;
  }

  calculateSize() {
    const json = JSON.stringify(this.result);
    return Buffer.byteLength(json, 'utf8');
  }

  access() {
    this.accessCount++;
    this.lastAccess = Date.now();
    return this;
  }

  isExpired(ttlMs) {
    return (Date.now() - this.timestamp) > ttlMs;
  }

  toJSON() {
    return {
      key: this.key,
      result: this.result,
      timestamp: this.timestamp,
      taskType: this.taskType,
      userId: this.userId,
      tags: this.tags,
      size: this.size,
      accessCount: this.accessCount,
      lastAccess: this.lastAccess
    };
  }
}

class CacheStats {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.writes = 0;
    this.evictions = 0;
    this.errors = 0;
  }

  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }
  recordWrite() { this.writes++; }
  recordEviction() { this.evictions++; }
  recordError() { this.errors++; }

  get hitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%';
  }

  toJSON() {
    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      evictions: this.evictions,
      errors: this.errors,
      hitRate: this.hitRate
    };
  }
}

// ==================== DeerFlow借鉴: 中间件管道 ====================

class CacheMiddleware {
  beforeGet(key, context) { return { key, context }; }
  afterGet(result, context) { return result; }
  beforeSet(key, entry, context) { return { key, entry, context }; }
  afterSet(result, context) { return result; }
  onError(error, context) { return context; }
}

class CachePipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  async executeGet(key, context, getFn) {
    let ctx = { key, context, errors: [] };
    
    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeGet(ctx.key, ctx.context);
        ctx.key = result.key;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
        mw.onError(e, ctx);
      }
    }

    let result;
    try {
      result = await getFn(ctx.key, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      for (const mw of this.middlewares) mw.onError(e, ctx);
      result = { hit: false, error: e.message };
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterGet(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    if (ctx.errors.length > 0) result.errors = ctx.errors;
    return result;
  }

  async executeSet(key, entry, context, setFn) {
    let ctx = { key, entry, context, errors: [] };
    
    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeSet(ctx.key, ctx.entry, ctx.context);
        ctx.key = result.key;
        ctx.entry = result.entry;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
        mw.onError(e, ctx);
      }
    }

    let result;
    try {
      result = await setFn(ctx.key, ctx.entry, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      for (const mw of this.middlewares) mw.onError(e, ctx);
      result = { success: false, error: e.message };
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterSet(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    if (ctx.errors.length > 0) result.errors = ctx.errors;
    return result;
  }
}

// 具体中间件
class LoggingMiddleware extends CacheMiddleware {
  beforeGet(key, context) {
    console.log(`[Cache] GET ${key}`);
    return { key, context };
  }
  afterGet(result, context) {
    console.log(`[Cache] ${result.hit ? 'HIT' : 'MISS'}`);
    return result;
  }
  beforeSet(key, entry, context) {
    console.log(`[Cache] SET ${key} (${entry.size} bytes)`);
    return { key, entry, context };
  }
}

class CompressionMiddleware extends CacheMiddleware {
  constructor(thresholdBytes = 10240) {
    super();
    this.thresholdBytes = thresholdBytes;
  }
  
  beforeSet(key, entry, context) {
    if (entry.size > this.thresholdBytes) {
      entry.tags.push('compressed');
    }
    return { key, entry, context };
  }
}

// ==================== 缓存实现 ====================

class ResultCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(
      process.env.APPDATA || process.env.HOME, 
      '.openclaw', 'cache', 'result-cache'
    );
    this.ttl = parseInt(options.ttl || process.env.RESULT_CACHE_TTL || '3600000'); // 默认1小时(ms)
    this.maxSize = options.maxSize || parseInt(process.env.RESULT_CACHE_MAX || '500');
    this.indexFile = options.indexFile || 'cache-index.json';
    
    this.pipeline = new CachePipeline();
    this.pipeline.use(new LoggingMiddleware());
    this.pipeline.use(new CompressionMiddleware());
    
    this.stats = new CacheStats();
    this.lruOrder = []; // LRU跟踪
  }

  // 确保目录存在
  async ensureCacheDir() {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  // 获取索引
  async getIndex() {
    await this.ensureCacheDir();
    const indexPath = path.join(this.cacheDir, this.indexFile);
    try {
      const content = await fs.readFile(indexPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { entries: {}, stats: this.stats.toJSON(), lruOrder: [] };
    }
  }

  // 保存索引
  async saveIndex(index) {
    const indexPath = path.join(this.cacheDir, this.indexFile);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  // 生成缓存Key
  generateKey(taskDescriptor) {
    const input = JSON.stringify({
      type: taskDescriptor.type,
      content: taskDescriptor.content,
      params: taskDescriptor.params || {},
      userId: taskDescriptor.userId || 'default'
    });
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  // 更新LRU
  updateLRU(key) {
    const idx = this.lruOrder.indexOf(key);
    if (idx > -1) {
      this.lruOrder.splice(idx, 1);
    }
    this.lruOrder.push(key);
  }

  // 获取缓存
  async get(taskDescriptor) {
    return this.pipeline.executeGet(
      this.generateKey(taskDescriptor),
      { taskDescriptor },
      async (key, ctx) => {
        const index = await this.getIndex();
        
        if (index.entries[key]) {
          const cacheFile = path.join(this.cacheDir, `${key}.json`);
          
          try {
            const content = await fs.readFile(cacheFile, 'utf8');
            const entry = JSON.parse(content);
            const age = Date.now() - entry.timestamp;
            
            if (age < this.ttl) {
              this.stats.recordHit();
              this.updateLRU(key);
              
              // 更新索引访问
              index.entries[key].accessCount = (index.entries[key].accessCount || 0) + 1;
              index.entries[key].lastAccess = Date.now();
              await this.saveIndex(index);
              
              return {
                hit: true,
                cached: entry.result,
                key,
                age: Math.floor(age / 1000),
                accessCount: entry.accessCount
              };
            } else {
              // 过期删除
              await this.evict(key);
              this.stats.recordMiss();
            }
          } catch (e) {
            this.stats.recordError();
            console.error('Cache read error:', e);
          }
        }
        
        this.stats.recordMiss();
        return { hit: false, key };
      }
    );
  }

  // 设置缓存
  async set(taskDescriptor, result, options = {}) {
    const key = this.generateKey(taskDescriptor);
    const entry = new CacheEntry(key, result, {
      taskType: options.taskType || taskDescriptor.type || 'unknown',
      userId: options.userId || taskDescriptor.userId || 'default',
      tags: options.tags || []
    });

    return this.pipeline.executeSet(
      key, entry, { taskDescriptor, options },
      async (k, e, ctx) => {
        const index = await this.getIndex();
        
        // 检查容量
        if (Object.keys(index.entries).length >= this.maxSize) {
          await this.cleanup(index);
        }
        
        const cacheFile = path.join(this.cacheDir, `${k}.json`);
        await fs.writeFile(cacheFile, JSON.stringify(e.toJSON()), 'utf8');
        
        index.entries[k] = {
          taskType: e.taskType,
          userId: e.userId,
          tags: e.tags,
          created: e.timestamp,
          accessCount: 0,
          lastAccess: e.lastAccess
        };
        
        this.updateLRU(k);
        this.stats.recordWrite();
        await this.saveIndex(index);
        
        return { success: true, key: k, size: e.size };
      }
    );
  }

  // 驱逐单个条目
  async evict(key) {
    const index = await this.getIndex();
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    
    try {
      await fs.unlink(cacheFile);
    } catch {}
    
    delete index.entries[key];
    const idx = this.lruOrder.indexOf(key);
    if (idx > -1) this.lruOrder.splice(idx, 1);
    
    this.stats.recordEviction();
    await this.saveIndex(index);
  }

  // 清理过期和LRU条目
  async cleanup(index) {
    const now = Date.now();
    const toEvict = [];
    
    // 1. 驱逐所有过期条目
    for (const [key, info] of Object.entries(index.entries)) {
      if (now - info.created > this.ttl) {
        toEvict.push({ key, priority: 0 }); // 过期优先
      }
    }
    
    // 2. LRU驱逐 - 直到容量低于80%
    const targetSize = Math.floor(this.maxSize * 0.8);
    if (Object.keys(index.entries).length - toEvict.length > targetSize) {
      // 按LRU顺序驱逐最旧的
      for (const key of this.lruOrder) {
        if (!toEvict.find(e => e.key === key)) {
          toEvict.push({ key, priority: 1 });
          if (Object.keys(index.entries).length - toEvict.length <= targetSize) break;
        }
      }
    }
    
    // 执行驱逐
    for (const { key } of toEvict) {
      await this.evict(key);
    }
  }

  // 按标签删除
  async invalidateByTag(tag) {
    const index = await this.getIndex();
    const toEvict = [];
    
    for (const [key, info] of Object.entries(index.entries)) {
      if (info.tags && info.tags.includes(tag)) {
        toEvict.push(key);
      }
    }
    
    for (const key of toEvict) {
      await this.evict(key);
    }
    
    return { invalidated: toEvict.length };
  }

  // 清空所有缓存
  async clear() {
    const index = await this.getIndex();
    
    for (const key of Object.keys(index.entries)) {
      const cacheFile = path.join(this.cacheDir, `${key}.json`);
      try {
        await fs.unlink(cacheFile);
      } catch {}
    }
    
    this.lruOrder = [];
    this.stats = new CacheStats();
    await this.saveIndex({ 
      entries: {}, 
      stats: this.stats.toJSON(), 
      lruOrder: [] 
    });
    
    return true;
  }

  // 获取统计
  async stats() {
    const index = await this.getIndex();
    const size = Object.keys(index.entries).length;
    
    let oldestEntry = null;
    let newestEntry = null;
    
    if (size > 0) {
      const timestamps = Object.values(index.entries).map(e => e.created);
      oldestEntry = Math.min(...timestamps);
      newestEntry = Math.max(...timestamps);
    }
    
    return {
      size,
      maxSize: this.maxSize,
      ttlSeconds: this.ttl / 1000,
      ...this.stats.toJSON(),
      oldestEntry,
      newestEntry
    };
  }
}

// 导出单例
const cache = new ResultCache();

module.exports = {
  ResultCache,
  CacheEntry,
  CacheStats,
  CachePipeline,
  CacheMiddleware,
  cache,
  
  // 快捷方法
  get: (taskDescriptor) => cache.get(taskDescriptor),
  set: (taskDescriptor, result, options) => cache.set(taskDescriptor, result, options),
  clear: () => cache.clear(),
  stats: () => cache.stats(),
  invalidateByTag: (tag) => cache.invalidateByTag(tag),
  
  // 创建新实例
  createCache: (options) => new ResultCache(options)
};
