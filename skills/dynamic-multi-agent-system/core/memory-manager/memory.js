/**
 * Memory Manager - 记忆管理器
 * 核心功能：记忆的写入、读取、检索和衰减
 */

const fs = require('fs');
const path = require('path');

// 记忆存储文件路径
const MEMORY_DIR = path.join(__dirname);
const MEMORY_FILE = path.join(MEMORY_DIR, 'memories.json');

// 默认记忆TTL：30天
const DEFAULT_TTL_DAYS = 30;

/**
 * 记忆类
 */
class Memory {
  constructor(type, content, source, confidence = 0.5) {
    this.type = type;
    this.content = content;
    this.source = source;
    this.confidence = confidence;
    this.created_at = new Date().toISOString();
    this.last_accessed = new Date().toISOString();
  }
}

/**
 * 加载记忆库
 */
function loadMemories() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载记忆失败:', e);
  }
  return [];
}

/**
 * 保存记忆库
 */
function saveMemories(memories) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('保存记忆失败:', e);
    return false;
  }
}

/**
 * 写入记忆
 * @param {string} type - 记忆类型: user_preference, success_pattern, failure_lesson, context
 * @param {string} content - 记忆内容
 * @param {string} source - 来源
 * @param {number} confidence - 置信度 0.0-1.0
 */
function write(type, content, source, confidence = 0.5) {
  const memories = loadMemories();
  
  // 检查是否已存在相同内容
  const existing = memories.find(m => m.content === content && m.type === type);
  if (existing) {
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.last_accessed = new Date().toISOString();
  } else {
    memories.push(new Memory(type, content, source, confidence));
  }
  
  return saveMemories(memories);
}

/**
 * 读取相关记忆
 * @param {string} query - 查询关键词
 * @param {number} limit - 返回数量限制
 */
function read(query, limit = 5) {
  const memories = loadMemories();
  const queryLower = query.toLowerCase();
  
  // 应用时间衰减
  const now = new Date();
  const updatedMemories = memories.map(m => {
    const lastAccess = new Date(m.last_accessed);
    const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAccess > DEFAULT_TTL_DAYS) {
      // 30天后每天降低1%置信度
      const decay = Math.max(0.1, m.confidence - (daysSinceAccess - DEFAULT_TTL_DAYS) * 0.01);
      return { ...m, confidence: decay };
    }
    return m;
  });
  
  // 过滤和排序
  const relevant = updatedMemories
    .filter(m => 
      m.content.toLowerCase().includes(queryLower) ||
      m.type.toLowerCase().includes(queryLower) ||
      m.source.toLowerCase().includes(queryLower)
    )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
  
  // 更新访问时间
  relevant.forEach(m => {
    m.last_accessed = new Date().toISOString();
  });
  
  return relevant;
}

/**
 * 按类型搜索记忆
 * @param {string} type - 记忆类型
 * @param {number} limit - 返回数量限制
 */
function search(type, limit = 10) {
  const memories = loadMemories();
  
  return memories
    .filter(m => m.type === type)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * 获取任务相关记忆
 * @param {object} task - 任务对象
 */
function getRelevant(task) {
  const memories = loadMemories();
  const result = {
    user_preference: [],
    success_pattern: [],
    failure_lesson: [],
    context: []
  };
  
  // 简单关键词匹配
  const taskText = JSON.stringify(task).toLowerCase();
  
  memories.forEach(m => {
    if (m.content.toLowerCase().includes(taskText)) {
      result[m.type].push(m);
    }
  });
  
  return result;
}

/**
 * 获取所有记忆
 */
function getAll() {
  return loadMemories();
}

/**
 * 清除所有记忆
 */
function clear() {
  return saveMemories([]);
}

/**
 * 获取统计信息
 */
function getStats() {
  const memories = loadMemories();
  const stats = {
    total: memories.length,
    byType: {}
  };
  
  memories.forEach(m => {
    stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
  });
  
  return stats;
}

// 导出模块
module.exports = {
  write,
  read,
  search,
  getRelevant,
  getAll,
  clear,
  getStats,
  Memory
};
