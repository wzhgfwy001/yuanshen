/**
 * DeerFlow增强版结果缓存
 * 
 * 借鉴DeerFlow的设计：
 * 1. 任务结果缓存
 * 2. 相似结果匹配
 * 3. 缓存失效策略
 * 4. 缓存命中分析
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============== 缓存条目 ==============
class ResultCacheEntry {
  constructor(key, result, options = {}) {
    this.key = key;
    this.result = result;
    this.metadata = options.metadata || {};
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.hitCount = 0;
    this.size = options.size || this._estimateSize(result);
    this.tags = options.tags || [];
    this.score = options.score || 0;
  }

  touch() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  recordHit() {
    this.hitCount++;
    this.touch();
  }

  _estimateSize(result) {
    const str = JSON.stringify(result);
    return str ? str.length : 0;
  }
}

// ============== ResultCache 主类 ==============
class ResultCache extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxSize: config.maxSize || 1000,
      maxMemoryMB: config.maxMemoryMB || 100,
      ttl: config.ttl || 3600000, // 1小时
      similarityThreshold: config.similarityThreshold || 0.8,
      enableSimilarity: config.enableSimilarity !== false,
      ...config
    };

    this.cache = new Map();
    this.similarityIndex = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      stored: 0,
      evicted: 0,
      totalMemory: 0
    };
  }

  /**
   * 生成缓存键
   */
  generateKey(taskData) {
    const normalized = this._normalize(taskData);
    const hash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    return `cache:${hash}`;
  }

  /**
   * 规范化数据
   */
  _normalize(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    // 排序键以确保一致性
    if (Array.isArray(data)) {
      return data.map(item => this._normalize(item));
    }
    
    const sorted = {};
    const keys = Object.keys(data).sort();
    
    for (const key of keys) {
      sorted[key] = this._normalize(data[key]);
    }
    
    return sorted;
  }

  /**
   * 存储结果
   */
  set(key, result, options = {}) {
    // 检查大小
    if (this.cache.size >= this.config.maxSize) {
      this._evictLRU();
    }

    // 检查内存
    const entrySize = options.size || new ResultCacheEntry(key, result).size;
    while (this.stats.totalMemory + entrySize > this.config.maxMemoryMB * 1024 * 1024) {
      if (!this._evictLRU()) break;
    }

    const entry = new ResultCacheEntry(key, result, {
      metadata: options.metadata,
      tags: options.tags,
      score: options.score
    });

    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.totalMemory -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.stats.totalMemory += entrySize;
    this.stats.stored++;

    // 更新相似性索引
    if (this.config.enableSimilarity) {
      this._updateSimilarityIndex(key, result);
    }

    this.emit('stored', { key, size: entrySize });
    return true;
  }

  /**
   * 获取结果
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查TTL
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this._remove(key);
      this.stats.misses++;
      return null;
    }

    entry.recordHit();
    this.stats.hits++;

    this.emit('hit', { key, hitCount: entry.hitCount });
    return entry.result;
  }

  /**
   * 查找相似结果
   */
  findSimilar(query, limit = 5) {
    if (!this.config.enableSimilarity) {
      return [];
    }

    const queryKey = this.generateKey(query);
    const queryNorm = this._normalize(query);
    const queryStr = JSON.stringify(queryNorm);

    const candidates = this.similarityIndex.get(queryStr) || [];

    // 计算实际相似度
    const scored = [];
    for (const key of candidates) {
      const entry = this.cache.get(key);
      if (!entry) continue;

      const similarity = this._calculateSimilarity(queryNorm, entry.result);
      
      if (similarity >= this.config.similarityThreshold) {
        scored.push({ key, entry, similarity });
      }
    }

    // 排序并返回
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  /**
   * 计算相似度
   */
  _calculateSimilarity(a, b) {
    if (a === b) return 1;
    if (typeof a !== typeof b) return 0;
    
    if (typeof a !== 'object') {
      return a == b ? 1 : 0;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return 0;
      let matches = 0;
      for (let i = 0; i < a.length; i++) {
        matches += this._calculateSimilarity(a[i], b[i]);
      }
      return matches / a.length;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return 0;
      
      let matches = 0;
      for (const key of keysA) {
        if (keysB.includes(key)) {
          matches += this._calculateSimilarity(a[key], b[key]);
        }
      }
      
      return matches / keysA.length;
    }

    return 0;
  }

  /**
   * 更新相似性索引
   */
  _updateSimilarityIndex(key, result) {
    const norm = this._normalize(result);
    const normStr = JSON.stringify(norm);
    
    if (!this.similarityIndex.has(normStr)) {
      this.similarityIndex.set(normStr, []);
    }
    this.similarityIndex.get(normStr).push(key);
  }

  /**
   * 检查存在
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this._remove(key);
      return false;
    }
    return true;
  }

  /**
   * 删除
   */
  _remove(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalMemory -= entry.size;
      this.cache.delete(key);
      this.stats.evicted++;
      return true;
    }
    return false;
  }

  /**
   * 删除
   */
  delete(key) {
    return this._remove(key);
  }

  /**
   * LRU淘汰
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._remove(oldestKey);
      this.emit('evicted', { key: oldestKey });
      return true;
    }
    return false;
  }

  /**
   * 清空
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.similarityIndex.clear();
    this.stats.totalMemory = 0;
    this.emit('cleared', { count: size });
  }

  /**
   * 获取统计
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalMemory: this.stats.totalMemory,
      maxMemory: this.config.maxMemoryMB * 1024 * 1024,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }

  /**
   * 获取命中率最高的条目
   */
  getTopHits(limit = 10) {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit)
      .map(e => ({
        key: e.key,
        hitCount: e.hitCount,
        accessCount: e.accessCount,
        size: e.size
      }));
  }
}

// ============== 导出 ==============
module.exports = {
  ResultCache,
  ResultCacheEntry
};
