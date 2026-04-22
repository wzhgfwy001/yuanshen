/**
 * Memory Manager v2.0 - 记忆管理器
 * 基于DeerFlow架构优化：记忆管道 + 重要性评分 + 记忆整合
 * 
 * DeerFlow借鉴：
 * 1. Memory Pipeline - before_write/after_write, before_read/after_read钩子
 * 2. Importance Scoring - 自动计算记忆重要性
 * 3. Memory Consolidation - 定期清理整合
 * 4. Structured State - 记忆分类与优先级
 */

const fs = require('fs');
const path = require('path');

// 记忆存储文件路径
const MEMORY_DIR = path.join(__dirname);
const MEMORY_FILE = path.join(MEMORY_DIR, 'memories.json');
const METADATA_FILE = path.join(MEMORY_DIR, 'memory-metadata.json');

// 默认配置
const DEFAULT_TTL_DAYS = 30;
const DEFAULT_IMPORTANCE = 0.5;
const CONSOLIDATION_THRESHOLD = 100; // 超过100条时触发整合

// ==================== DeerFlow借鉴1: Memory Pipeline ====================

/**
 * 记忆管道中间件 - 借鉴DeerFlow的before_agent/after_agent模式
 */
class MemoryMiddleware {
  before_write(memory) { return memory; }
  after_write(memory, stored) { return stored; }
  before_read(query) { return query; }
  after_read(results) { return results; }
  on_error(error) { return error; }
}

class MemoryPipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  execute_write(memory) {
    let mem = memory;
    for (const mw of this.middlewares) {
      try {
        mem = mw.before_write(mem) || mem;
      } catch (e) {
        mw.on_error(e);
      }
    }
    
    let stored = mem;
    for (const mw of this.middlewares) {
      try {
        stored = mw.after_write(mem, stored) || stored;
      } catch (e) {
        mw.on_error(e);
      }
    }
    return stored;
  }

  execute_read(query) {
    let q = query;
    for (const mw of this.middlewares) {
      try {
        q = mw.before_read(q) || q;
      } catch (e) {
        mw.on_error(e);
      }
    }
    return q;
  }
}

// ==================== DeerFlow借鉴2: 具体中间件实现 ====================

class ImportanceScoringMiddleware extends MemoryMiddleware {
  /**
   * 自动计算记忆重要性
   * - 用户明确标记的高置信度 → 高重要性
   * - 来源于错误/失败的 → 高重要性（教训）
   * - 多次访问的记忆 → 提升重要性
   * - 长时间未访问的记忆 → 降低重要性
   */
  after_write(memory, stored) {
    // 基于来源和置信度计算初始重要性
    let importance = memory.confidence || DEFAULT_IMPORTANCE;
    
    // 教训类记忆通常更重要
    if (memory.type === 'failure_lesson') {
      importance = Math.min(1.0, importance + 0.2);
    }
    
    // 用户偏好通常很重要
    if (memory.type === 'user_preference') {
      importance = Math.min(1.0, importance + 0.15);
    }
    
    stored.importance = importance;
    stored.access_count = 0;
    stored.last_decay_check = new Date().toISOString();
    
    return stored;
  }

  after_read(results) {
    // 提升访问过记忆的重要性
    if (Array.isArray(results)) {
      results.forEach(m => {
        m.access_count = (m.access_count || 0) + 1;
        m.importance = Math.min(1.0, m.importance + 0.02 * Math.log(m.access_count + 1));
      });
    }
    return results;
  }
}

class NoiseFilteringMiddleware extends MemoryMiddleware {
  /**
   * 过滤噪音 - 去除低质量记忆
   */
  before_write(memory) {
    // 过滤过短的记忆（可能是噪音）
    if (memory.content && memory.content.length < 10) {
      return null; // 返回null表示不存储
    }
    
    // 过滤过低置信度的记忆
    if (memory.confidence !== undefined && memory.confidence < 0.1) {
      return null;
    }
    
    return memory;
  }
}

class MetadataEnrichmentMiddleware extends MemoryMiddleware {
  /**
   * 元数据丰富化 - 添加额外信息
   */
  after_write(memory, stored) {
    stored.metadata = stored.metadata || {};
    stored.metadata.word_count = (stored.content || '').length;
    stored.metadata.char_count = JSON.stringify(stored.content || '').length;
    stored.metadata.pipeline_version = '2.0';
    return stored;
  }
}

// ==================== DeerFlow借鉴3: 记忆整合 ====================

class MemoryConsolidator {
  /**
   * 记忆整合器 - 定期清理和整合记忆
   * 
   * 功能：
   * 1. 合并相似记忆
   * 2. 删除过时记忆
   * 3. 更新重要性评分
   */
  
  constructor() {
    this.last_consolidation = null;
  }

  consolidate(memories) {
    const now = new Date();
    const consolidated = [];
    const seen = new Map(); // content_hash -> memory
    
    // 按内容去重，保留最高重要性的
    for (const mem of memories) {
      const key = this._hashContent(mem.content);
      
      if (seen.has(key)) {
        const existing = seen.get(key);
        // 保留重要性更高的
        if ((mem.importance || 0.5) > (existing.importance || 0.5)) {
          seen.set(key, mem);
        }
      } else {
        seen.set(key, mem);
      }
    }
    
    // 应用时间衰减
    for (const mem of seen.values()) {
      const decayed = this._applyTimeDecay(mem);
      if (decayed.importance > 0.05) { // 重要性太低的删除
        consolidated.push(decayed);
      }
    }
    
    this.last_consolidation = now.toISOString();
    
    return {
      memories: consolidated,
      stats: {
        original_count: memories.length,
        consolidated_count: consolidated.length,
        removed: memories.length - consolidated.length,
        last_consolidation: this.last_consolidation
      }
    };
  }

  _hashContent(content) {
    // 简单哈希，基于内容
    const str = String(content || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  _applyTimeDecay(memory) {
    const now = new Date();
    const lastDecay = new Date(memory.last_decay_check || memory.created_at);
    const daysSinceCheck = (now - lastDecay) / (1000 * 60 * 60 * 24);
    
    // 每30天降低10%重要性
    if (daysSinceCheck > 30) {
      memory.importance = Math.max(0.05, (memory.importance || 0.5) * Math.pow(0.9, daysSinceCheck / 30));
      memory.last_decay_check = now.toISOString();
    }
    
    return memory;
  }
}

// ==================== 核心记忆类 ====================

/**
 * 记忆类 - 结构化状态
 */
class Memory {
  constructor(type, content, source, confidence = 0.5) {
    this.type = type;
    this.content = content;
    this.source = source;
    this.confidence = confidence;
    this.created_at = new Date().toISOString();
    this.last_accessed = new Date().toISOString();
    this.importance = confidence; // DeerFlow: 重要性评分
    this.access_count = 0;
    this.metadata = {};
  }

  toJSON() {
    return {
      type: this.type,
      content: this.content,
      source: this.source,
      confidence: this.confidence,
      created_at: this.created_at,
      last_accessed: this.last_accessed,
      importance: this.importance,
      access_count: this.access_count,
      metadata: this.metadata
    };
  }
}

// ==================== 记忆管理器 ====================

class MemoryManager {
  constructor() {
    // 初始化记忆管道
    this.pipeline = new MemoryPipeline();
    this.pipeline.use(new NoiseFilteringMiddleware());
    this.pipeline.use(new ImportanceScoringMiddleware());
    this.pipeline.use(new MetadataEnrichmentMiddleware());
    
    // 初始化整合器
    this.consolidator = new MemoryConsolidator();
    
    // 加载元数据
    this.metadata = this._loadMetadata();
  }

  _loadMetadata() {
    try {
      if (fs.existsSync(METADATA_FILE)) {
        return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[memory] Failed to load metadata:', e);
    }
    return {
      version: '2.0',
      created_at: new Date().toISOString(),
      last_consolidation: null,
      total_writes: 0,
      total_reads: 0
    };
  }

  _saveMetadata() {
    try {
      fs.writeFileSync(METADATA_FILE, JSON.stringify(this.metadata, null, 2), 'utf8');
    } catch (e) {
      console.error('[memory] Failed to save metadata:', e);
    }
  }

  /**
   * 写入记忆 - 使用管道
   */
  write(type, content, source, confidence = 0.5) {
    const memory = new Memory(type, content, source, confidence);
    
    // 通过管道处理
    const stored = this.pipeline.execute_write(memory);
    
    if (!stored) {
      return { success: false, reason: 'filtered_by_pipeline' };
    }
    
    const memories = this._loadMemories();
    memories.push(stored.toJSON ? stored.toJSON() : stored);
    
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
      this.metadata.total_writes++;
      this._saveMetadata();
      
      // 检查是否需要整合
      if (memories.length > CONSOLIDATION_THRESHOLD) {
        this._autoConsolidate();
      }
      
      return { success: true, memory: stored };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 读取记忆 - 使用管道处理查询
   */
  read(query, limit = 5) {
    const processedQuery = this.pipeline.execute_read(query);
    const memories = this._loadMemories();
    
    // 应用时间衰减
    const now = new Date();
    const updatedMemories = memories.map(m => {
      const lastAccess = new Date(m.last_accessed);
      const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
      
      if (daysSinceAccess > DEFAULT_TTL_DAYS) {
        const decay = Math.max(0.1, (m.importance || 0.5) - (daysSinceAccess - DEFAULT_TTL_DAYS) * 0.01);
        return { ...m, importance: decay };
      }
      return m;
    });
    
    const queryLower = processedQuery.toLowerCase();
    
    // 过滤和排序 - 使用重要性而非置信度
    const relevant = updatedMemories
      .filter(m => 
        (m.content || '').toLowerCase().includes(queryLower) ||
        (m.type || '').toLowerCase().includes(queryLower) ||
        (m.source || '').toLowerCase().includes(queryLower)
      )
      .sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5))
      .slice(0, limit);
    
    // 更新访问时间
    relevant.forEach(m => {
      m.last_accessed = new Date().toISOString();
      m.access_count = (m.access_count || 0) + 1;
    });
    
    this.metadata.total_reads++;
    this._saveMetadata();
    
    return relevant;
  }

  /**
   * 按类型搜索
   */
  search(type, limit = 10) {
    const memories = this._loadMemories();
    
    return memories
      .filter(m => m.type === type)
      .sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5))
      .slice(0, limit);
  }

  /**
   * 获取相关记忆 - 改进版
   */
  getRelevant(task, limit = 10) {
    const memories = this._loadMemories();
    const taskText = JSON.stringify(task).toLowerCase();
    
    // 分类收集
    const result = {
      user_preference: [],
      success_pattern: [],
      failure_lesson: [],
      context: [],
      other: []
    };
    
    memories.forEach(m => {
      const relevance = this._calculateRelevance(m, taskText);
      if (relevance > 0) {
        m.relevance = relevance;
        if (result[m.type]) {
          result[m.type].push(m);
        } else {
          result.other.push(m);
        }
      }
    });
    
    // 每类取top N
    const final = {};
    for (const [type, mems] of Object.entries(result)) {
      final[type] = mems
        .sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5))
        .slice(0, Math.ceil(limit / 4));
    }
    
    return final;
  }

  _calculateRelevance(memory, taskText) {
    // 简单的相关性计算
    const content = (memory.content || '').toLowerCase();
    let score = 0;
    
    // 关键词匹配
    const keywords = taskText.split(/\s+/).filter(w => w.length > 2);
    for (const kw of keywords) {
      if (content.includes(kw)) score += 0.2;
    }
    
    // 类型相关性
    if (memory.type === 'failure_lesson') score += 0.3; // 教训通常更相关
    if (memory.type === 'user_preference') score += 0.2;
    
    // 重要性加成
    score += (memory.importance || 0.5) * 0.3;
    
    return Math.min(1.0, score);
  }

  /**
   * 手动触发整合
   */
  consolidate() {
    const memories = this._loadMemories();
    const result = this.consolidator.consolidate(memories);
    
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(result.memories, null, 2), 'utf8');
      this.metadata.last_consolidation = result.stats.last_consolidation;
      this._saveMetadata();
      
      return {
        success: true,
        ...result.stats
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  _autoConsolidate() {
    console.log('[memory] Auto-consolidation triggered');
    return this.consolidate();
  }

  getAll() {
    return this._loadMemories();
  }

  clear() {
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify([], null, 2), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  }

  getStats() {
    const memories = this._loadMemories();
    const stats = {
      total: memories.length,
      byType: {},
      avg_importance: 0,
      metadata: this.metadata
    };
    
    let totalImportance = 0;
    memories.forEach(m => {
      stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
      totalImportance += (m.importance || 0.5);
    });
    
    if (memories.length > 0) {
      stats.avg_importance = totalImportance / memories.length;
    }
    
    return stats;
  }

  _loadMemories() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = fs.readFileSync(MEMORY_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[memory] Failed to load memories:', e);
    }
    return [];
  }
}

// 导出单例
const manager = new MemoryManager();

module.exports = {
  // 旧API兼容
  write: (type, content, source, confidence) => manager.write(type, content, source, confidence),
  read: (query, limit) => manager.read(query, limit),
  search: (type, limit) => manager.search(type, limit),
  getRelevant: (task, limit) => manager.getRelevant(task, limit),
  getAll: () => manager.getAll(),
  clear: () => manager.clear(),
  getStats: () => manager.getStats(),
  consolidate: () => manager.consolidate(),
  
  // 新API
  MemoryManager: MemoryManager,
  MemoryPipeline: MemoryPipeline,
  MemoryConsolidator: MemoryConsolidator
};
