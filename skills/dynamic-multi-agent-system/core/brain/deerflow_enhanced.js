/**
 * DeerFlow增强版大脑系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 长期记忆存储
 * 2. 记忆检索
 * 3. 上下文管理
 * 4. 知识图谱
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// ============== 记忆项类 ==============
class MemoryItem {
  constructor(key, content, options = {}) {
    this.key = key;
    this.content = content;
    this.type = options.type || 'fact'; // fact, experience, preference, skill
    this.importance = options.importance || 0.5;
    this.tags = options.tags || [];
    this.metadata = options.metadata || {};
    this.createdAt = Date.now();
    this.accessedAt = Date.now();
    this.accessCount = 0;
    this.strength = options.strength || 1.0; // 记忆强度
  }

  touch() {
    this.accessedAt = Date.now();
    this.accessCount++;
    // 强化记忆
    this.strength = Math.min(1.0, this.strength + 0.01);
  }

  decay(factor = 0.01) {
    this.strength = Math.max(0.1, this.strength - factor);
  }
}

// ============== Brain 主类 ==============
class Brain extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      storagePath: config.storagePath || './brain-data',
      maxItems: config.maxItems || 10000,
      decayInterval: config.decayInterval || 86400000, // 1天
      ...config
    };

    this.memories = new Map();
    this.context = {};
    this.conversationHistory = [];
    
    // 确保存储目录存在
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, { recursive: true });
    }

    // 开始衰减
    this._startDecay();
  }

  /**
   * 存储记忆
   */
  remember(key, content, options = {}) {
    const item = new MemoryItem(key, content, options);
    this.memories.set(key, item);
    
    this.emit('remembered', { key, type: item.type });
    
    return item;
  }

  /**
   * 检索记忆
   */
  recall(key) {
    const item = this.memories.get(key);
    
    if (!item) {
      return null;
    }
    
    item.touch();
    
    this.emit('recalled', { key, accessCount: item.accessCount });
    
    return item.content;
  }

  /**
   * 搜索记忆
   */
  search(query, options = {}) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [key, item] of this.memories) {
      // 检查标签
      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some(tag => item.tags.includes(tag));
        if (!hasTag) continue;
      }
      
      // 检查类型
      if (options.type && item.type !== options.type) {
        continue;
      }
      
      // 关键词匹配
      const contentStr = typeof item.content === 'string' 
        ? item.content.toLowerCase() 
        : JSON.stringify(item.content).toLowerCase();
      
      if (contentStr.includes(queryLower) || key.toLowerCase().includes(queryLower)) {
        results.push({
          key,
          content: item.content,
          relevance: this._calculateRelevance(queryLower, contentStr),
          strength: item.strength,
          accessCount: item.accessCount,
          lastAccessed: item.accessedAt
        });
      }
    }
    
    // 排序
    results.sort((a, b) => {
      const scoreA = a.relevance * a.strength;
      const scoreB = b.relevance * b.strength;
      return scoreB - scoreA;
    });
    
    if (options.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }

  /**
   * 计算相关性
   */
  _calculateRelevance(query, content) {
    const queryWords = query.split(/\s+/);
    let matches = 0;
    
    for (const word of queryWords) {
      if (content.includes(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  /**
   * 设置上下文
   */
  setContext(key, value) {
    this.context[key] = value;
    this.emit('context_changed', { key, value });
  }

  /**
   * 获取上下文
   */
  getContext(key) {
    return this.context[key];
  }

  /**
   * 获取所有上下文
   */
  getAllContext() {
    return { ...this.context };
  }

  /**
   * 清空上下文
   */
  clearContext() {
    this.context = {};
    this.emit('context_cleared');
  }

  /**
   * 添加对话历史
   */
  addToHistory(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now()
    });
    
    // 限制历史长度
    if (this.conversationHistory.length > 1000) {
      this.conversationHistory = this.conversationHistory.slice(-500);
    }
  }

  /**
   * 获取对话历史
   */
  getHistory(limit = 100) {
    return this.conversationHistory.slice(-limit);
  }

  /**
   * 获取相关记忆
   */
  getRelatedMemories(key, limit = 5) {
    const item = this.memories.get(key);
    if (!item) return [];
    
    const related = [];
    
    for (const [otherKey, otherItem] of this.memories) {
      if (otherKey === key) continue;
      
      // 检查共享标签
      const sharedTags = item.tags.filter(tag => otherItem.tags.includes(tag));
      
      if (sharedTags.length > 0) {
        related.push({
          key: otherKey,
          content: otherItem.content,
          sharedTags,
          strength: otherItem.strength
        });
      }
    }
    
    related.sort((a, b) => b.sharedTags.length - a.sharedTags.length);
    
    return related.slice(0, limit);
  }

  /**
   * 强化记忆
   */
  strengthen(key, factor = 0.1) {
    const item = this.memories.get(key);
    if (item) {
      item.strength = Math.min(1.0, item.strength + factor);
      this.emit('strengthened', { key, strength: item.strength });
    }
  }

  /**
   * 遗忘记忆
   */
  forget(key) {
    const deleted = this.memories.delete(key);
    if (deleted) {
      this.emit('forgotten', { key });
    }
    return deleted;
  }

  /**
   * 衰减所有记忆
   */
  decayAll(factor = 0.01) {
    for (const item of this.memories.values()) {
      item.decay(factor);
    }
    
    this.emit('decayed', { factor });
  }

  /**
   * 开始衰减定时器
   */
  _startDecay() {
    if (this.config.decayInterval > 0) {
      this._decayTimer = setInterval(() => {
        this.decayAll();
      }, this.config.decayInterval);
    }
  }

  /**
   * 获取统计
   */
  getStats() {
    let totalStrength = 0;
    const byType = {};

    for (const item of this.memories.values()) {
      totalStrength += item.strength;
      
      if (!byType[item.type]) {
        byType[item.type] = { count: 0, strength: 0 };
      }
      byType[item.type].count++;
      byType[item.type].strength += item.strength;
    }

    return {
      totalMemories: this.memories.size,
      avgStrength: this.memories.size > 0 ? totalStrength / this.memories.size : 0,
      byType,
      contextKeys: Object.keys(this.context).length,
      historyLength: this.conversationHistory.length
    };
  }

  /**
   * 保存到文件
   */
  save(filename = 'brain-state.json') {
    const filepath = path.join(this.config.storagePath, filename);
    
    const data = {
      memories: Array.from(this.memories.entries()).map(([key, item]) => ({
        key,
        content: item.content,
        type: item.type,
        importance: item.importance,
        tags: item.tags,
        metadata: item.metadata,
        createdAt: item.createdAt,
        accessedAt: item.accessedAt,
        accessCount: item.accessCount,
        strength: item.strength
      })),
      context: this.context,
      conversationHistory: this.conversationHistory,
      savedAt: Date.now()
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    this.emit('saved', { filepath });
    
    return filepath;
  }

  /**
   * 从文件加载
   */
  load(filename = 'brain-state.json') {
    const filepath = path.join(this.config.storagePath, filename);
    
    if (!fs.existsSync(filepath)) {
      return false;
    }
    
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    this.memories.clear();
    for (const item of data.memories) {
      const memoryItem = new MemoryItem(item.key, item.content, {
        type: item.type,
        importance: item.importance,
        tags: item.tags,
        metadata: item.metadata
      });
      memoryItem.createdAt = item.createdAt;
      memoryItem.accessedAt = item.accessedAt;
      memoryItem.accessCount = item.accessCount;
      memoryItem.strength = item.strength;
      this.memories.set(item.key, memoryItem);
    }
    
    this.context = data.context || {};
    this.conversationHistory = data.conversationHistory || [];
    
    this.emit('loaded', { filepath });
    
    return true;
  }

  /**
   * 关闭
   */
  shutdown() {
    if (this._decayTimer) {
      clearInterval(this._decayTimer);
    }
    this.save();
  }
}

// ============== 导出 ==============
module.exports = {
  Brain,
  MemoryItem
};
