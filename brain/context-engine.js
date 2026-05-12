/**
 * Context Engine - 上下文工程
 * 基于 Anthropic Session/Harness 分离理念
 * 存储层和策略层分离
 */

const fs = require('fs');
const path = require('path');

// 上下文策略类型
const CONTEXT_STRATEGY = {
  FULL: 'full',        // 全部保留
  COMPACT: 'compact',  // 压缩摘要
  EXTERNAL: 'external', // 外部存储
  HYBRID: 'hybrid'    // 混合模式
};

/**
 * 上下文 Chunk
 */
class ContextChunk {
  constructor(type, content, metadata = {}) {
    this.id = `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;  // system | user | assistant | tool | memory
    this.content = content;
    this.metadata = metadata;
    this.createdAt = Date.now();
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }
  
  access() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
}

/**
 * Context Engine
 */
class ContextEngine {
  constructor(maxTokens = 100000) {
    this.maxTokens = maxTokens;
    this.chunks = [];
    this.externalMemory = new Map();  // 外部记忆存储
    this.strategy = CONTEXT_STRATEGY.HYBRID;
  }
  
  /**
   * 添加上下文片段
   */
  add(type, content, metadata = {}) {
    const chunk = new ContextChunk(type, content, metadata);
    this.chunks.push(chunk);
    return chunk.id;
  }
  
  /**
   * 获取当前上下文
   */
  getContext(options = {}) {
    const { maxTokens } = options;
    const limit = maxTokens || this.maxTokens;
    
    switch (this.strategy) {
      case CONTEXT_STRATEGY.FULL:
        return this.getFull();
        
      case CONTEXT_STRATEGY.COMPACT:
        return this.getCompacted(limit);
        
      case CONTEXT_STRATEGY.EXTERNAL:
        return this.getExternal(limit);
        
      case CONTEXT_STRATEGY.HYBRID:
      default:
        return this.getHybrid(limit);
    }
  }
  
  /**
   * 完整上下文
   */
  getFull() {
    return this.chunks.map(c => c.content).join('\n');
  }
  
  /**
   * 压缩上下文（摘要）
   */
  getCompacted(maxTokens) {
    // 按重要性排序
    const sorted = [...this.chunks].sort((a, b) => {
      // 系统 > 助手 > 用户 > 工具
      const priority = { system: 4, assistant: 3, user: 2, tool: 1 };
      return (priority[b.type] || 0) - (priority[a.type] || 0);
    });
    
    let result = [];
    let tokens = 0;
    
    for (const chunk of sorted) {
      const size = chunk.content.length;
      if (tokens + size > maxTokens) break;
      result.push(chunk);
      tokens += size;
    }
    
    return result.map(c => c.content).join('\n');
  }
  
  /**
   * 外部记忆（按需加载）
   */
  getExternal(maxTokens) {
    // 只加载最近/重要的
    const important = this.chunks.filter(c => 
      c.type === 'system' || c.accessCount > 0
    );
    return important.map(c => c.content).join('\n');
  }
  
  /**
   * 混合模式：最近 + 重要 + 摘要
   */
  getHybrid(maxTokens) {
    const now = Date.now();
    const recent = this.chunks.filter(c => now - c.createdAt < 3600000); // 1小时内
    const important = this.chunks.filter(c => c.accessCount > 2);
    const system = this.chunks.filter(c => c.type === 'system');
    
    const combined = [...new Set([...system, ...important, ...recent])];
    combined.sort((a, b) => b.createdAt - a.createdAt);
    
    return combined.map(c => c.content).join('\n');
  }
  
  /**
   * 保存到外部记忆
   */
  saveToExternal(key, value) {
    this.externalMemory.set(key, {
      value,
      savedAt: new Date().toISOString()
    });
  }
  
  /**
   * 从外部记忆加载
   */
  loadFromExternal(key) {
    const entry = this.externalMemory.get(key);
    return entry ? entry.value : null;
  }
  
  /**
   * 清理旧上下文
   */
  prune(keepCount = 100) {
    if (this.chunks.length > keepCount) {
      const removed = this.chunks.splice(0, this.chunks.length - keepCount);
      console.log(`[Context] Pruned ${removed.length} chunks`);
      return removed.length;
    }
    return 0;
  }
  
  /**
   * 获取统计
   */
  stats() {
    const typeCount = {};
    for (const c of this.chunks) {
      typeCount[c.type] = (typeCount[c.type] || 0) + 1;
    }
    return {
      totalChunks: this.chunks.length,
      typeCount,
      strategy: this.strategy,
      maxTokens: this.maxTokens,
      externalMemory: this.externalMemory.size
    };
  }
  
  /**
   * 设置策略
   */
  setStrategy(strategy) {
    if (Object.values(CONTEXT_STRATEGY).includes(strategy)) {
      this.strategy = strategy;
      console.log(`[Context] Strategy: ${strategy}`);
    }
  }
}

const contextEngine = new ContextEngine();

module.exports = { contextEngine, ContextEngine, CONTEXT_STRATEGY };

// 使用示例
if (require.main === module) {
  contextEngine.add('system', 'You are a helpful AI');
  contextEngine.add('user', 'Hello, how are you?');
  console.log('Stats:', contextEngine.stats());
  console.log('Context:', contextEngine.getContext());
}
