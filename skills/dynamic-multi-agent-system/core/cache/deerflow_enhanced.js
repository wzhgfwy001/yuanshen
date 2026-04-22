/**
 * DeerFlow增强版缓存系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多级缓存 - L1/L2/L3
 * 2. TTL过期 - 自动清理
 * 3. 淘汰策略 - LRU/LFU/FIFO
 * 4. 命中率统计
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============== 常量定义 ==============
const EVICTION_POLICIES = {
  LRU: 'lru',   // Least Recently Used
  LFU: 'lfu',   // Least Frequently Used
  FIFO: 'fifo',  // First In First Out
  TTL: 'ttl'     // Time To Live (自动过期)
};

const CACHE_EVENTS = {
  HIT: 'cache_hit',
  MISS: 'cache_miss',
  EVICTED: 'evicted',
  EXPIRED: 'expired',
  CLEARED: 'cleared'
};

// ============== CacheEntry 类 ==============
class CacheEntry {
  constructor(value, options = {}) {
    this.value = value;
    this.createdAt = Date.now();
    this.accessedAt = Date.now();
    this.accessCount = 0;
    this.ttl = options.ttl || null;
    this.key = null; // 会被CacheManager设置
  }

  isExpired() {
    if (!this.ttl) return false;
    return Date.now() > this.createdAt + this.ttl;
  }

  touch() {
    this.accessedAt = Date.now();
    this.accessCount++;
  }
}

// ============== CacheManager 类 ==============
class CacheManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 3600000, // 1小时
      evictionPolicy: config.evictionPolicy || EVICTION_POLICIES.LRU,
      enableStats: config.enableStats !== false,
      ...config
    };
    
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * 生成缓存键
   */
  generateKey(...args) {
    const data = JSON.stringify(args);
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * 设置缓存
   */
  set(key, value, options = {}) {
    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this._evict();
    }

    const entry = new CacheEntry(value, {
      ttl: options.ttl || this.config.defaultTTL,
      ...options
    });
    entry.key = key;
    
    const previous = this.cache.get(key);
    this.cache.set(key, entry);
    
    return previous ? previous.value : null;
  }

  /**
   * 获取缓存
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this._recordMiss();
      return null;
    }
    
    // 检查过期
    if (entry.isExpired()) {
      this.cache.delete(key);
      this._recordExpiration();
      this._recordMiss();
      return null;
    }
    
    // 更新访问信息
    entry.touch();
    this._recordHit();
    
    return entry.value;
  }

  /**
   * 检查键存在
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.isExpired()) {
      this.cache.delete(key);
      this._recordExpiration();
      return false;
    }
    return true;
  }

  /**
   * 删除缓存
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.emit(CACHE_EVENTS.CLEARED, { size });
  }

  /**
   * 获取缓存项
   */
  getEntry(key) {
    return this.cache.get(key) || null;
  }

  /**
   * 获取所有键
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   */
  size() {
    return this.cache.size;
  }

  /**
   * 获取统计数据
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests: total
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  // ============== 私有方法 ==============

  _evict() {
    let keyToEvict = null;
    
    switch (this.config.evictionPolicy) {
      case EVICTION_POLICIES.LRU:
        keyToEvict = this._findLRU();
        break;
      case EVICTION_POLICIES.LFU:
        keyToEvict = this._findLFU();
        break;
      case EVICTION_POLICIES.FIFO:
        keyToEvict = this._findFIFO();
        break;
      default:
        keyToEvict = this._findLRU();
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      this.emit(CACHE_EVENTS.EVICTED, { key: keyToEvict });
    }
  }

  _findLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  _findLFU() {
    let leastUsedKey = null;
    let leastCount = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }

  _findFIFO() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  _recordHit() {
    this.stats.hits++;
    this.emit(CACHE_EVENTS.HIT, { 
      hits: this.stats.hits,
      total: this.stats.hits + this.stats.misses 
    });
  }

  _recordMiss() {
    this.stats.misses++;
    this.emit(CACHE_EVENTS.MISS, { 
      misses: this.stats.misses,
      total: this.stats.hits + this.stats.misses 
    });
  }

  _recordExpiration() {
    this.stats.expirations++;
    this.emit(CACHE_EVENTS.EXPIRED, { expirations: this.stats.expirations });
  }
}

// ============== MultiLevelCache 类 ==============
class MultiLevelCache extends EventEmitter {
  /**
   * 多级缓存管理器
   * L1: 内存缓存 (快速, 小容量)
   * L2: 进程缓存 (中等速度, 中等容量)
   * L3: 持久化缓存 (慢速, 大容量)
   */
  constructor(config = {}) {
    super();
    
    this.l1 = new CacheManager({
      maxSize: config.l1Size || 100,
      defaultTTL: config.l1TTL || 60000, // 1分钟
      evictionPolicy: EVICTION_POLICIES.LRU
    });
    
    this.l2 = new CacheManager({
      maxSize: config.l2Size || 1000,
      defaultTTL: config.l2TTL || 300000, // 5分钟
      evictionPolicy: EVICTION_POLICIES.LRU
    });
    
    this.l3 = new CacheManager({
      maxSize: config.l3Size || 10000,
      defaultTTL: config.l3TTL || 3600000, // 1小时
      evictionPolicy: EVICTION_POLICIES.LRU
    });
    
    // L1事件传播
    this.l1.on(CACHE_EVENTS.MISS, (data) => this.emit(CACHE_EVENTS.MISS, data));
    this.l2.on(CACHE_EVENTS.MISS, (data) => this.emit(CACHE_EVENTS.MISS, data));
  }

  /**
   * 获取缓存 (自动从L1->L2->L3逐级查找)
   */
  get(key) {
    // L1
    let value = this.l1.get(key);
    if (value !== null) {
      return { value, level: 1, source: 'l1' };
    }
    
    // L2
    value = this.l2.get(key);
    if (value !== null) {
      // 提升到L1
      this.l1.set(key, value);
      return { value, level: 2, source: 'l2' };
    }
    
    // L3
    value = this.l3.get(key);
    if (value !== null) {
      // 提升到L2和L1
      this.l2.set(key, value);
      this.l1.set(key, value);
      return { value, level: 3, source: 'l3' };
    }
    
    return { value: null, level: null, source: null };
  }

  /**
   * 设置缓存 (写入所有级别)
   */
  set(key, value, options = {}) {
    const results = {
      l1: this.l1.set(key, value, { ttl: options.l1TTL }),
      l2: this.l2.set(key, value, { ttl: options.l2TTL }),
      l3: this.l3.set(key, value, { ttl: options.l3TTL })
    };
    
    return results;
  }

  /**
   * 删除缓存 (所有级别)
   */
  delete(key) {
    return {
      l1: this.l1.delete(key),
      l2: this.l2.delete(key),
      l3: this.l3.delete(key)
    };
  }

  /**
   * 清空所有级别
   */
  clear() {
    this.l1.clear();
    this.l2.clear();
    this.l3.clear();
  }

  /**
   * 获取所有级别统计
   */
  getStats() {
    return {
      l1: this.l1.getStats(),
      l2: this.l2.getStats(),
      l3: this.l3.getStats()
    };
  }

  /**
   * 获取总大小
   */
  size() {
    return this.l1.size() + this.l2.size() + this.l3.size();
  }
}

// ============== 导出 ==============
module.exports = {
  CacheManager,
  MultiLevelCache,
  CacheEntry,
  EVICTION_POLICIES,
  CACHE_EVENTS
};
