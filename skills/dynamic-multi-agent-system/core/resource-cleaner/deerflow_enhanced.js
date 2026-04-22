/**
 * DeerFlow增强版资源清理器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 自动资源追踪
 * 2. 定时清理
 * 3. 条件清理
 * 4. 资源使用报告
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// ============== 资源项 ==============
class ResourceItem {
  constructor(id, type, cleanupFn, metadata = {}) {
    this.id = id;
    this.type = type;
    this.cleanupFn = cleanupFn;
    this.metadata = metadata;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.size = metadata.size || 0;
  }

  touch() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  async cleanup() {
    if (typeof this.cleanupFn === 'function') {
      return await this.cleanupFn();
    }
  }
}

// ============== ResourceCleaner 主类 ==============
class ResourceCleaner extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxAge: config.maxAge || 3600000, // 1小时
      maxSize: config.maxSize || 1024 * 1024 * 1024, // 1GB
      checkInterval: config.checkInterval || 60000, // 1分钟
      autoCleanup: config.autoCleanup !== false,
      ...config
    };

    this.resources = new Map();
    this.stats = {
      cleaned: 0,
      totalCleanedSize: 0,
      lastCleanup: null
    };

    if (this.config.autoCleanup) {
      this._startAutoCleanup();
    }
  }

  /**
   * 注册资源
   */
  register(id, type, cleanupFn, metadata = {}) {
    if (this.resources.has(id)) {
      this.emit('resource_updated', { id, type });
    } else {
      this.emit('resource_registered', { id, type });
    }

    const item = new ResourceItem(id, type, cleanupFn, metadata);
    this.resources.set(id, item);
    
    return this;
  }

  /**
   * 获取资源
   */
  get(id) {
    const item = this.resources.get(id);
    if (item) {
      item.touch();
    }
    return item || null;
  }

  /**
   * 检查资源存在
   */
  has(id) {
    return this.resources.has(id);
  }

  /**
   * 释放资源
   */
  async release(id) {
    const item = this.resources.get(id);
    if (!item) return false;

    try {
      await item.cleanup();
      this.resources.delete(id);
      
      this.stats.cleaned++;
      this.stats.totalCleanedSize += item.size;
      
      this.emit('resource_released', { 
        id, 
        type: item.type,
        size: item.size,
        age: Date.now() - item.createdAt 
      });
      
      return true;
    } catch (error) {
      this.emit('resource_release_failed', { id, error: error.message });
      return false;
    }
  }

  /**
   * 释放所有类型资源
   */
  async releaseByType(type) {
    const toRelease = [];
    
    for (const [id, item] of this.resources) {
      if (item.type === type) {
        toRelease.push(id);
      }
    }

    const results = [];
    for (const id of toRelease) {
      results.push(await this.release(id));
    }

    return results;
  }

  /**
   * 清理过期资源
   */
  async cleanupExpired() {
    const now = Date.now();
    const expired = [];
    const maxAge = this.config.maxAge;

    for (const [id, item] of this.resources) {
      if (now - item.lastAccessed > maxAge) {
        expired.push(id);
      }
    }

    const results = [];
    for (const id of expired) {
      results.push(await this.release(id));
    }

    if (expired.length > 0) {
      this.stats.lastCleanup = Date.now();
      this.emit('cleanup_completed', { 
        count: expired.length,
        totalSize: results.filter(r => r).length * 1000 // 估算
      });
    }

    return { cleaned: expired.length, results };
  }

  /**
   * 清理超过大小的资源
   */
  async cleanupBySize() {
    const toClean = [];
    let totalSize = 0;

    for (const item of this.resources.values()) {
      totalSize += item.size;
    }

    if (totalSize <= this.config.maxSize) {
      return { cleaned: 0 };
    }

    // 按最后访问时间排序，最老的先清理
    const sorted = Array.from(this.resources.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    const toCleanSize = totalSize - this.config.maxSize;
    let cleanedSize = 0;

    for (const item of sorted) {
      if (cleanedSize >= toCleanSize) break;
      toClean.push(item.id);
      cleanedSize += item.size;
    }

    const results = [];
    for (const id of toClean) {
      results.push(await this.release(id));
    }

    return { cleaned: toClean.length, size: cleanedSize, results };
  }

  /**
   * 执行完整清理
   */
  async fullCleanup() {
    const expired = await this.cleanupExpired();
    const bySize = await this.cleanupBySize();

    return {
      expired,
      bySize,
      totalCleaned: this.stats.cleaned,
      totalCleanedSize: this.stats.totalCleanedSize
    };
  }

  /**
   * 获取资源统计
   */
  getStats() {
    const byType = {};
    let totalSize = 0;
    let oldest = null;
    let newest = null;

    for (const item of this.resources.values()) {
      totalSize += item.size;
      
      if (!byType[item.type]) {
        byType[item.type] = { count: 0, size: 0 };
      }
      byType[item.type].count++;
      byType[item.type].size += item.size;

      if (!oldest || item.lastAccessed < oldest) {
        oldest = item.lastAccessed;
      }
      if (!newest || item.lastAccessed > newest) {
        newest = item.lastAccessed;
      }
    }

    return {
      totalResources: this.resources.size,
      totalSize,
      byType,
      oldest: oldest ? Date.now() - oldest : null,
      newest: newest ? Date.now() - newest : null,
      cleaned: this.stats.cleaned,
      totalCleanedSize: this.stats.totalCleanedSize,
      lastCleanup: this.stats.lastCleanup
    };
  }

  /**
   * 获取资源列表
   */
  listResources(options = {}) {
    let resources = Array.from(this.resources.values());

    if (options.type) {
      resources = resources.filter(r => r.type === options.type);
    }

    if (options.sortBy === 'age') {
      resources.sort((a, b) => a.lastAccessed - b.lastAccessed);
    } else if (options.sortBy === 'size') {
      resources.sort((a, b) => b.size - a.size);
    }

    if (options.limit) {
      resources = resources.slice(0, options.limit);
    }

    return resources.map(r => ({
      id: r.id,
      type: r.type,
      size: r.size,
      age: Date.now() - r.createdAt,
      lastAccessed: Date.now() - r.lastAccessed,
      accessCount: r.accessCount,
      metadata: r.metadata
    }));
  }

  /**
   * 开始自动清理
   */
  _startAutoCleanup() {
    this._cleanupTimer = setInterval(() => {
      this.cleanupExpired();
      this.cleanupBySize();
    }, this.config.checkInterval);
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * 关闭
   */
  shutdown() {
    this.stopAutoCleanup();
    this.fullCleanup();
    this.emit('shutdown');
  }
}

// ============== 导出 ==============
module.exports = {
  ResourceCleaner,
  ResourceItem
};
