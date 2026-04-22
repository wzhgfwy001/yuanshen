/**
 * DeerFlow增强版内存管理器 (ThreadState)
 * 
 * 借鉴DeerFlow的设计：
 * 1. ThreadState - 线程状态管理
 * 2. 对话上下文管理 - 历史消息、状态持久化
 * 3. 内存分层 - L1/L2/L3缓存
 * 4. 自动压缩和清理
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============== 常量定义 ==============
const MEMORY_TIERS = {
  L1: 'l1',   // 热内存 - 当前活跃数据
  L2: 'l2',   // 温内存 - 最近使用
  L3: 'l3'    // 冷内存 - 历史归档
};

const MEMORY_EVENTS = {
  TIER_UPDATED: 'tier_updated',
  MEMORY_PRESSURE: 'memory_pressure',
  COMPACTION_TRIGGERED: 'compaction_triggered',
  MEMORY_CLEARED: 'memory_cleared',
  STATE_SAVED: 'state_saved',
  STATE_RESTORED: 'state_restored'
};

const MEMORY_CONFIG = {
  L1_MAX_ITEMS: 100,        // L1最多100项
  L2_MAX_ITEMS: 500,       // L2最多500项
  L3_MAX_ITEMS: 2000,      // L3最多2000项
  L1_TTL_MS: 3600000,      // L1: 1小时
  L2_TTL_MS: 86400000,     // L2: 24小时
  L3_TTL_MS: 604800000,    // L3: 7天
  COMPACTION_THRESHOLD: 0.8, // 80%时触发压缩
  AUTO_SAVE_INTERVAL: 300000  // 5分钟自动保存
};

// ============== ThreadState 类 ==============
class ThreadState extends EventEmitter {
  constructor(config = {}) {
    super();
    this.threadId = config.threadId || this._generateId();
    this.messages = [];
    this.context = {};
    this.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      totalTokens: 0
    };
    
    this.tiers = {
      [MEMORY_TIERS.L1]: new Map(),  // 热内存
      [MEMORY_TIERS.L2]: new Map(),  // 温内存
      [MEMORY_TIERS.L3]: new Map()   // 冷内存
    };
    
    this.accessLog = [];  // 访问记录
    this.listeners = new Map();  // 事件监听器追踪
    
    this.config = { ...MEMORY_CONFIG, ...config };
    
    // 初始化自动保存
    if (this.config.autoSave) {
      this._initAutoSave();
    }
  }

  _generateId() {
    return `thread-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * 添加消息到线程
   */
  addMessage(role, content, metadata = {}) {
    const message = {
      id: `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      role,
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    
    this.messages.push(message);
    this.metadata.messageCount++;
    this.metadata.updatedAt = new Date().toISOString();
    
    // 更新L1缓存
    this._updateTier(MEMORY_TIERS.L1, message.id, message);
    
    // 记录访问
    this._logAccess(message.id);
    
    this.emit('message_added', message);
    
    return message;
  }

  /**
   * 获取消息历史
   */
  getMessages(options = {}) {
    let result = [...this.messages];
    
    if (options.limit) {
      result = result.slice(-options.limit);
    }
    
    if (options.since) {
      const sinceTime = new Date(options.since).getTime();
      result = result.filter(m => 
        new Date(m.metadata.timestamp).getTime() >= sinceTime
      );
    }
    
    if (options.roles) {
      result = result.filter(m => options.roles.includes(m.role));
    }
    
    return result;
  }

  /**
   * 设置上下文
   */
  setContext(key, value) {
    this.context[key] = value;
    this.metadata.updatedAt = new Date().toISOString();
    this._updateTier(MEMORY_TIERS.L1, `ctx:${key}`, { key, value });
    this.emit('context_updated', { key, value });
  }

  /**
   * 获取上下文
   */
  getContext(key) {
    const item = this._getFromAnyTier(`ctx:${key}`);
    return item ? item.value : undefined;
  }

  /**
   * 获取所有上下文
   */
  getAllContext() {
    return { ...this.context };
  }

  /**
   * 清除上下文
   */
  clearContext(key = null) {
    if (key) {
      delete this.context[key];
      this._removeFromAllTiers(`ctx:${key}`);
    } else {
      this.context = {};
      for (const tier of Object.values(this.tiers)) {
        tier.forEach((value, k) => {
          if (k.startsWith('ctx:')) {
            tier.delete(k);
          }
        });
      }
    }
    this.emit('context_cleared', { key });
  }

  /**
   * 更新元数据
   */
  updateMetadata(updates) {
    this.metadata = {
      ...this.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.emit('metadata_updated', this.metadata);
  }

  /**
   * 保存状态到文件
   */
  async save(filePath = null) {
    const savePath = filePath || this._getDefaultSavePath();
    
    const state = {
      threadId: this.threadId,
      messages: this.messages,
      context: this.context,
      metadata: this.metadata,
      tiers: {
        [MEMORY_TIERS.L1]: Array.from(this.tiers[MEMORY_TIERS.L1].entries()),
        [MEMORY_TIERS.L2]: Array.from(this.tiers[MEMORY_TIERS.L2].entries()),
        [MEMORY_TIERS.L3]: Array.from(this.tiers[MEMORY_TIERS.L3].entries())
      },
      savedAt: new Date().toISOString()
    };
    
    // 确保目录存在
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(savePath, JSON.stringify(state, null, 2), 'utf8');
    
    this.emit(MEMORY_EVENTS.STATE_SAVED, { path: savePath });
    return savePath;
  }

  /**
   * 从文件恢复状态
   */
  async restore(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`State file not found: ${filePath}`);
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    this.threadId = data.threadId;
    this.messages = data.messages || [];
    this.context = data.context || {};
    this.metadata = { ...this.metadata, ...data.metadata };
    
    // 恢复tiers
    if (data.tiers) {
      for (const [tierName, entries] of Object.entries(data.tiers)) {
        this.tiers[tierName] = new Map(entries);
      }
    }
    
    this.emit(MEMORY_EVENTS.STATE_RESTORED, { path: filePath });
    return this;
  }

  /**
   * 压缩历史消息
   */
  compress(options = {}) {
    const {
      keepLast = 50,           // 保留最后N条
      summarizeBefore = 100,   // 超过N条时总结前面的
      maxTokens = 4000         // 最大token数
    } = options;
    
    if (this.messages.length <= keepLast) {
      return { compressed: false, reason: 'not_enough_messages' };
    }
    
    // 分离需要压缩的消息
    const toCompress = this.messages.slice(0, -keepLast);
    const kept = this.messages.slice(-keepLast);
    
    // 生成摘要
    const summary = this._summarizeMessages(toCompress);
    
    // 创建压缩后的消息
    const compressedMessage = {
      id: `msg-compressed-${Date.now()}`,
      role: 'system',
      content: `[历史消息摘要 - ${toCompress.length}条消息]\n\n${summary}`,
      metadata: {
        timestamp: new Date().toISOString(),
        compressed: true,
        originalCount: toCompress.length,
        originalFirstTimestamp: toCompress[0]?.metadata?.timestamp,
        originalLastTimestamp: toCompress[toCompress.length - 1]?.metadata?.timestamp
      }
    };
    
    this.messages = [compressedMessage, ...kept];
    this.metadata.messageCount = this.messages.length;
    this.metadata.compressed = true;
    this.metadata.lastCompression = new Date().toISOString();
    
    this.emit(MEMORY_EVENTS.COMPACTION_TRIGGERED, {
      compressedCount: toCompress.length,
      keptCount: kept.length
    });
    
    return {
      compressed: true,
      originalCount: toCompress.length,
      keptCount: kept.length,
      summary
    };
  }

  /**
   * 清除所有数据
   */
  clear() {
    this.messages = [];
    this.context = {};
    this.metadata = {
      ...this.metadata,
      messageCount: 0,
      totalTokens: 0,
      updatedAt: new Date().toISOString()
    };
    
    for (const tier of Object.values(this.tiers)) {
      tier.clear();
    }
    
    this.accessLog = [];
    
    this.emit(MEMORY_EVENTS.MEMORY_CLEARED, { threadId: this.threadId });
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      threadId: this.threadId,
      messageCount: this.metadata.messageCount,
      totalTokens: this.metadata.totalTokens,
      tiers: {
        [MEMORY_TIERS.L1]: this.tiers[MEMORY_TIERS.L1].size,
        [MEMORY_TIERS.L2]: this.tiers[MEMORY_TIERS.L2].size,
        [MEMORY_TIERS.L3]: this.tiers[MEMORY_TIERS.L3].size
      },
      contextSize: Object.keys(this.context).length,
      createdAt: this.metadata.createdAt,
      updatedAt: this.metadata.updatedAt,
      lastCompression: this.metadata.lastCompression
    };
  }

  /**
   * 导出为DeerFlow格式
   */
  export() {
    return {
      thread_id: this.threadId,
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      context: this.context,
      metadata: this.metadata
    };
  }

  // ============== 私有方法 ==============

  _updateTier(tierName, key, value) {
    const tier = this.tiers[tierName];
    
    // 如果key已存在，先删除
    for (const t of Object.values(this.tiers)) {
      if (t.has(key)) {
        t.delete(key);
      }
    }
    
    // 添加到目标tier
    tier.set(key, {
      value,
      accessedAt: Date.now(),
      createdAt: Date.now()
    });
    
    // 检查tier容量
    this._checkTierCapacity(tierName);
  }

  _getFromAnyTier(key) {
    // 优先从L1查找
    for (const tierName of [MEMORY_TIERS.L1, MEMORY_TIERS.L2, MEMORY_TIERS.L3]) {
      const item = this.tiers[tierName].get(key);
      if (item) {
        // 更新访问时间
        item.accessedAt = Date.now();
        // 提升到更高层级（L1）
        if (tierName !== MEMORY_TIERS.L1) {
          this.tiers[MEMORY_TIERS.L1].set(key, item);
          this.tiers[tierName].delete(key);
        }
        return item.value;
      }
    }
    return null;
  }

  _removeFromAllTiers(key) {
    for (const tier of Object.values(this.tiers)) {
      tier.delete(key);
    }
  }

  _checkTierCapacity(tierName) {
    const tier = this.tiers[tierName];
    const maxItems = this.config[`${tierName.toUpperCase()}_MAX_ITEMS`];
    
    if (tier.size > maxItems) {
      // 需要降级到下一层
      this._demoteOldest(tierName);
    }
  }

  _demoteOldest(fromTier) {
    const tier = this.tiers[fromTier];
    const nextTier = this._getNextTier(fromTier);
    
    if (!nextTier) return;  // L3没有下一层
    
    // 找到最老的项
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of tier) {
      if (item.accessedAt < oldestTime) {
        oldestTime = item.accessedAt;
        oldest = key;
      }
    }
    
    if (oldest) {
      const item = tier.get(oldest);
      tier.delete(oldest);
      nextTier.set(oldest, item);
      
      this.emit(MEMORY_EVENTS.TIER_UPDATED, {
        from: fromTier,
        to: this._getNextTierName(fromTier),
        key: oldest
      });
    }
  }

  _getNextTier(tierName) {
    const nextName = this._getNextTierName(tierName);
    return nextName ? this.tiers[nextName] : null;
  }

  _getNextTierName(tierName) {
    if (tierName === MEMORY_TIERS.L1) return MEMORY_TIERS.L2;
    if (tierName === MEMORY_TIERS.L2) return MEMORY_TIERS.L3;
    return null;
  }

  _logAccess(key) {
    this.accessLog.push({
      key,
      accessedAt: Date.now()
    });
    
    // 限制日志大小
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }
  }

  _summarizeMessages(messages) {
    if (messages.length === 0) return '';
    
    const roles = {};
    const topics = [];
    
    for (const msg of messages) {
      roles[msg.role] = (roles[msg.role] || 0) + 1;
      
      // 简单的主题提取
      if (msg.content && msg.content.length > 100) {
        const words = msg.content.split(/\s+/).slice(0, 20).join(' ');
        if (words) topics.push(words);
      }
    }
    
    return [
      `共${messages.length}条消息`,
      `角色分布: ${Object.entries(roles).map(([r, c]) => `${r}:${c}`).join(', ')}`,
      topics.length > 0 ? `涉及主题: ${topics.slice(0, 3).join(' | ')}` : ''
    ].filter(Boolean).join('\n');
  }

  _getDefaultSavePath() {
    const stateDir = path.join(process.cwd(), '.openclaw', 'thread-states');
    return path.join(stateDir, `${this.threadId}.json`);
  }

  _initAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.save().catch(err => {
        console.error('Auto-save failed:', err.message);
      });
    }, this.config.AUTO_SAVE_INTERVAL);
  }
}

// ============== MemoryManager 类 ==============
class MemoryManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...MEMORY_CONFIG, ...config };
    this.threads = new Map();
    this.currentThread = null;
  }

  /**
   * 创建新线程
   */
  createThread(options = {}) {
    const thread = new ThreadState({
      threadId: options.threadId,
      autoSave: this.config.autoSave,
      ...this.config
    });
    
    this.threads.set(thread.threadId, thread);
    
    thread.on('memory_pressure', (data) => {
      this.emit('memory_pressure', { threadId: thread.threadId, ...data });
    });
    
    this.emit('thread_created', { threadId: thread.threadId });
    
    return thread;
  }

  /**
   * 获取线程
   */
  getThread(threadId) {
    return this.threads.get(threadId) || null;
  }

  /**
   * 获取或创建线程
   */
  getOrCreateThread(threadId) {
    let thread = this.threads.get(threadId);
    if (!thread) {
      thread = this.createThread({ threadId });
    }
    return thread;
  }

  /**
   * 删除线程
   */
  deleteThread(threadId) {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.clear();
      this.threads.delete(threadId);
      this.emit('thread_deleted', { threadId });
      return true;
    }
    return false;
  }

  /**
   * 设置当前线程
   */
  setCurrentThread(threadId) {
    this.currentThread = this.getOrCreateThread(threadId);
    return this.currentThread;
  }

  /**
   * 获取当前线程
   */
  getCurrentThread() {
    return this.currentThread;
  }

  /**
   * 列出所有线程
   */
  listThreads(options = {}) {
    let threads = Array.from(this.threads.values());
    
    if (options.sortBy === 'updated') {
      threads.sort((a, b) => 
        new Date(b.metadata.updatedAt) - new Date(a.metadata.updatedAt)
      );
    }
    
    if (options.limit) {
      threads = threads.slice(0, options.limit);
    }
    
    return threads.map(t => t.getStats());
  }

  /**
   * 获取全局统计
   */
  getGlobalStats() {
    let totalMessages = 0;
    let totalTokens = 0;
    const tierCounts = {
      [MEMORY_TIERS.L1]: 0,
      [MEMORY_TIERS.L2]: 0,
      [MEMORY_TIERS.L3]: 0
    };
    
    for (const thread of this.threads.values()) {
      totalMessages += thread.metadata.messageCount;
      totalTokens += thread.metadata.totalTokens;
      
      for (const [tierName, tier] of Object.entries(thread.tiers)) {
        tierCounts[tierName] += tier.size;
      }
    }
    
    return {
      threadCount: this.threads.size,
      totalMessages,
      totalTokens,
      tierCounts
    };
  }

  /**
   * 清理所有线程的旧数据
   */
  cleanup(options = {}) {
    const { olderThan = Date.now() - 86400000 } = options; // 默认24小时
    
    let cleaned = 0;
    
    for (const thread of this.threads.values()) {
      const lastUpdate = new Date(thread.metadata.updatedAt).getTime();
      if (lastUpdate < olderThan) {
        // 移动到L3或清除
        if (options.deleteOld) {
          thread.clear();
        } else {
          thread.compress({ keepLast: 10 });
        }
        cleaned++;
      }
    }
    
    this.emit('cleanup_completed', { cleanedThreads: cleaned });
    return cleaned;
  }

  /**
   * 关闭并清理
   */
  shutdown() {
    // 保存所有线程
    const savePromises = [];
    for (const thread of this.threads.values()) {
      savePromises.push(thread.save().catch(err => {
        console.error(`Failed to save thread ${thread.threadId}:`, err.message);
      }));
    }
    
    return Promise.all(savePromises).then(() => {
      this.threads.clear();
      this.currentThread = null;
      this.emit('shutdown');
    });
  }
}

// ============== 导出 ==============
module.exports = {
  ThreadState,
  MemoryManager,
  MEMORY_TIERS,
  MEMORY_EVENTS,
  MEMORY_CONFIG
};
