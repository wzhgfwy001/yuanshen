/**
 * DeerFlow增强版共享内存系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多进程共享内存
 * 2. 内存同步
 * 3. 访问控制
 * 4. 事件通知
 */

const { EventEmitter } = require('events');

// ============== 内存段类 ==============
class MemorySegment {
  constructor(key, value, options = {}) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.accessCount = 0;
    this.lastAccessed = null;
    this.owner = options.owner || null;
    this.ttl = options.ttl || null;
    this.readonly = options.readonly || false;
    this.subscribers = new Set();
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
    this.updatedAt = Date.now();
  }

  isExpired() {
    if (!this.ttl) return false;
    return Date.now() > this.createdAt + this.ttl;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(newValue, oldValue) {
    for (const callback of this.subscribers) {
      try {
        callback({ key: this.key, newValue, oldValue });
      } catch (e) {
        // 忽略订阅错误
      }
    }
  }
}

// ============== SharedMemory 主类 ==============
class SharedMemory extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 3600000,
      enableEvents: config.enableEvents !== false,
      ...config
    };

    this.segments = new Map();
    this.namespaces = new Map();
    this.accessLog = [];
  }

  /**
   * 设置值
   */
  set(key, value, options = {}) {
    const oldValue = this.segments.get(key)?.value;
    
    const segment = new MemorySegment(key, value, {
      owner: options.owner,
      ttl: options.ttl || this.config.defaultTTL,
      readonly: options.readonly,
      ...options
    });

    this.segments.set(key, segment);
    
    // 命名空间管理
    if (options.namespace) {
      this._addToNamespace(options.namespace, key);
    }

    // 访问日志
    this._logAccess(key, 'set');

    // 事件通知
    if (this.config.enableEvents) {
      this.emit('segment_updated', { key, value, oldValue });
      segment.notify(value, oldValue);
    }

    return oldValue !== undefined;
  }

  /**
   * 获取值
   */
  get(key, options = {}) {
    const segment = this.segments.get(key);
    
    if (!segment) {
      this._logAccess(key, 'get_miss');
      return null;
    }

    if (segment.isExpired()) {
      this.delete(key);
      this._logAccess(key, 'get_expired');
      return null;
    }

    segment.touch();
    this._logAccess(key, 'get_hit');

    if (this.config.enableEvents) {
      this.emit('segment_accessed', { key });
    }

    return segment.value;
  }

  /**
   * 检查存在
   */
  has(key) {
    const segment = this.segments.get(key);
    if (!segment) return false;
    if (segment.isExpired()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 删除
   */
  delete(key) {
    const segment = this.segments.get(key);
    if (!segment) return false;

    if (segment.readonly) {
      return false;
    }

    const oldValue = segment.value;
    this.segments.delete(key);

    if (this.config.enableEvents) {
      this.emit('segment_deleted', { key, oldValue });
    }

    return true;
  }

  /**
   * 批量设置
   */
  setMany(entries, options = {}) {
    const results = [];
    for (const [key, value] of entries) {
      results.push(this.set(key, value, options));
    }
    return results;
  }

  /**
   * 批量获取
   */
  getMany(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = this.get(key);
    }
    return results;
  }

  /**
   * 清空命名空间
   */
  clearNamespace(namespace) {
    const keys = this.namespaces.get(namespace) || [];
    const deleted = [];
    
    for (const key of keys) {
      if (this.delete(key)) {
        deleted.push(key);
      }
    }
    
    this.namespaces.delete(namespace);
    return deleted;
  }

  /**
   * 获取所有键
   */
  keys(options = {}) {
    let keys = Array.from(this.segments.keys());

    if (options.namespace) {
      const namespaceKeys = this.namespaces.get(options.namespace) || [];
      keys = keys.filter(k => namespaceKeys.includes(k));
    }

    if (options.includeExpired) {
      return keys;
    }

    return keys.filter(k => {
      const segment = this.segments.get(k);
      return !segment.isExpired();
    });
  }

  /**
   * 获取段信息
   */
  getSegment(key) {
    const segment = this.segments.get(key);
    if (!segment) return null;

    return {
      key: segment.key,
      value: segment.value,
      createdAt: segment.createdAt,
      updatedAt: segment.updatedAt,
      accessCount: segment.accessCount,
      lastAccessed: segment.lastAccessed,
      owner: segment.owner,
      ttl: segment.ttl,
      readonly: segment.readonly,
      expired: segment.isExpired()
    };
  }

  /**
   * 获取统计
   */
  getStats() {
    let totalSize = 0;
    let expired = 0;
    let readonly = 0;
    let byOwner = {};

    for (const segment of this.segments.values()) {
      if (segment.isExpired()) expired++;
      if (segment.readonly) readonly++;
      if (segment.owner) {
        byOwner[segment.owner] = (byOwner[segment.owner] || 0) + 1;
      }
      
      const valueStr = typeof segment.value === 'string' 
        ? segment.value 
        : JSON.stringify(segment.value);
      totalSize += valueStr.length;
    }

    return {
      totalSegments: this.segments.size,
      totalSize,
      expired,
      readonly,
      namespaces: this.namespaces.size,
      byOwner,
      accessLogSize: this.accessLog.length
    };
  }

  /**
   * 订阅变化
   */
  watch(key, callback) {
    const segment = this.segments.get(key);
    if (segment) {
      return segment.subscribe(callback);
    }
    return () => {};
  }

  /**
   * 清理过期
   */
  cleanup() {
    const expired = [];
    
    for (const [key, segment] of this.segments) {
      if (segment.isExpired()) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.delete(key);
    }

    return expired.length;
  }

  // ============== 私有方法 ==============

  _addToNamespace(namespace, key) {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace).add(key);
  }

  _logAccess(key, type) {
    this.accessLog.push({
      key,
      type,
      timestamp: Date.now()
    });

    if (this.accessLog.length > 10000) {
      this.accessLog.shift();
    }
  }
}

// ============== 导出 ==============
module.exports = {
  SharedMemory,
  MemorySegment
};
