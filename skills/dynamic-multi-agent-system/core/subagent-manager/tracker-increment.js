/**
 * Tracker Increment - 任务执行追踪器
 * 
 * 功能：
 * - 追踪任务执行
 * - 记录到 category-validation-tracker.json
 * - 每个子任务完成时调用
 * - 记录：taskId, category, agentName, success, duration
 * 
 * 使用方式：
 * const tracker = require('./tracker-increment');
 * tracker.increment({ taskId, category, agentName, success, duration });
 * tracker.recordError({ taskId, category, error });
 * tracker.getStats();
 * tracker.validateCategory(category);
 */

const fs = require('fs');
const path = require('path');

// 追踪器数据文件路径
const TRACKER_PATH = path.join(__dirname, 'category-validation-tracker.json');

// 有效分类列表（用于验证）
const VALID_CATEGORIES = [
  'simple',        // 简单任务（直接处理）
  'standard',     // 标准任务（spawn 1-2个子Agent）
  'complex',      // 复杂任务（spawn 3+个子Agent）
  'innovative',    // 创新任务（需要研究）
  'batch',        // 批量任务
  'research',     // 研究任务
  'analysis',     // 分析任务
  'creative',     // 创意任务
  'hybrid'        // 混合任务
];

/**
 * 加载追踪数据 - 兼容旧格式
 */
function loadTrackerData() {
  try {
    if (fs.existsSync(TRACKER_PATH)) {
      const data = fs.readFileSync(TRACKER_PATH, 'utf8');
      const parsed = JSON.parse(data);
      
      // 如果是旧格式（只有history没有executions），迁移到新格式
      if (parsed.history && !parsed.executions) {
        return {
          _legacy: parsed,
          executions: parsed.history.map(h => ({
            id: `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            taskId: h.taskId,
            category: h.category,
            agentName: h.agentName,
            success: h.action !== 'classification_error',
            duration: null,
            timestamp: h.timestamp,
            migrated: true
          })),
          errors: parsed.errors || [],
          stats: { totalTasks: 0, successfulTasks: 0, failedTasks: 0, byCategory: {}, byAgent: {}, totalDuration: 0, avgDuration: 0 },
          lastUpdated: parsed._internal?.lastUpdated || null
        };
      }
      
      // 新格式：确保有executions数组
      if (!parsed.executions) {
        parsed.executions = [];
      }
      if (!parsed.errors) {
        parsed.errors = [];
      }
      if (!parsed.stats) {
        parsed.stats = { totalTasks: 0, successfulTasks: 0, failedTasks: 0, byCategory: {}, byAgent: {}, totalDuration: 0, avgDuration: 0 };
      }
      
      return parsed;
    }
  } catch (e) {
    console.error('[TrackerIncrement] Failed to load tracker data:', e.message);
  }
  
  return {
    executions: [],
    errors: [],
    stats: {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      byCategory: {},
      byAgent: {},
      totalDuration: 0,
      avgDuration: 0
    },
    lastUpdated: null
  };
}

/**
 * 保存追踪数据
 */
function saveTrackerData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TRACKER_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[TrackerIncrement] Failed to save tracker data:', e.message);
  }
}

/**
 * 记录任务完成
 * @param {Object} taskContext - 任务上下文
 * @param {string} taskContext.taskId - 任务ID
 * @param {string} taskContext.category - 任务分类
 * @param {string} taskContext.agentName - 执行Agent名称
 * @param {boolean} [taskContext.success=true] - 是否成功
 * @param {number} [taskContext.duration=null] - 执行时长（毫秒）
 * @param {Object} [taskContext.metadata={}] - 额外元数据
 */
function increment(taskContext) {
  const { taskId, category, agentName, success = true, duration = null, metadata = {} } = taskContext;
  
  if (!taskId) {
    throw new Error('taskId is required');
  }
  
  const data = loadTrackerData();
  
  const entry = {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    taskId,
    category: validateCategory(category),
    agentName: agentName || 'unknown',
    success,
    duration,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  data.executions.push(entry);
  
  // 确保stats结构完整
  if (!data.stats.byCategory) data.stats.byCategory = {};
  if (!data.stats.byAgent) data.stats.byAgent = {};
  if (typeof data.stats.totalTasks !== 'number') data.stats.totalTasks = 0;
  if (typeof data.stats.successfulTasks !== 'number') data.stats.successfulTasks = 0;
  if (typeof data.stats.failedTasks !== 'number') data.stats.failedTasks = 0;
  if (typeof data.stats.totalDuration !== 'number') data.stats.totalDuration = 0;
  if (typeof data.stats.avgDuration !== 'number') data.stats.avgDuration = 0;
  
  // 更新统计
  data.stats.totalTasks++;
  if (success) {
    data.stats.successfulTasks++;
  } else {
    data.stats.failedTasks++;
  }
  
  // 按分类统计
  if (!data.stats.byCategory[entry.category]) {
    data.stats.byCategory[entry.category] = {
      total: 0,
      successful: 0,
      failed: 0,
      avgDuration: 0
    };
  }
  data.stats.byCategory[entry.category].total++;
  if (success) {
    data.stats.byCategory[entry.category].successful++;
  } else {
    data.stats.byCategory[entry.category].failed++;
  }
  
  // 按Agent统计
  if (!data.stats.byAgent[entry.agentName]) {
    data.stats.byAgent[entry.agentName] = {
      total: 0,
      successful: 0,
      failed: 0
    };
  }
  data.stats.byAgent[entry.agentName].total++;
  if (success) {
    data.stats.byAgent[entry.agentName].successful++;
  } else {
    data.stats.byAgent[entry.agentName].failed++;
  }
  
  // 更新时长统计
  if (duration !== null) {
    const prevTotal = data.stats.avgDuration * (data.stats.successfulTasks - (success ? 1 : 0));
    const currentTotal = prevTotal + duration;
    data.stats.totalDuration += duration;
    data.stats.avgDuration = data.stats.successfulTasks > 0 
      ? currentTotal / data.stats.successfulTasks 
      : 0;
    
    // 更新分类的平均时长
    if (data.stats.byCategory[entry.category]) {
      const catStats = data.stats.byCategory[entry.category];
      const catPrevTotal = catStats.avgDuration * (catStats.successful - (success ? 1 : 0));
      catStats.avgDuration = catStats.successful > 0 
        ? (catPrevTotal + duration) / catStats.successful 
        : 0;
    }
  }
  
  saveTrackerData(data);
  
  console.log(`[TrackerIncrement] Task completed: ${taskId} | ${entry.category} | ${agentName} | ${success ? 'SUCCESS' : 'FAIL'} | ${duration ? duration + 'ms' : 'N/A'}`);
  
  return {
    id: entry.id,
    taskId,
    category: entry.category,
    success
  };
}

/**
 * 记录错误
 * @param {Object} errorContext - 错误上下文
 * @param {string} errorContext.taskId - 任务ID
 * @param {string} [errorContext.category] - 任务分类
 * @param {string} errorContext.error - 错误信息
 * @param {string} [errorContext.agentName] - Agent名称
 * @param {Object} [errorContext.metadata] - 额外信息
 */
function recordError(errorContext) {
  const { taskId, category, error, agentName, metadata = {} } = errorContext;
  
  if (!taskId || !error) {
    throw new Error('taskId and error are required');
  }
  
  const data = loadTrackerData();
  
  const entry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    taskId,
    category: category ? validateCategory(category) : 'unknown',
    agentName: agentName || 'unknown',
    error: typeof error === 'string' ? error : error.message || String(error),
    errorStack: error && error.stack ? error.stack : null,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  data.errors.push(entry);
  
  // 确保stats结构完整
  if (!data.stats.byCategory) data.stats.byCategory = {};
  if (!data.stats.byAgent) data.stats.byAgent = {};
  if (typeof data.stats.totalTasks !== 'number') data.stats.totalTasks = 0;
  if (typeof data.stats.successfulTasks !== 'number') data.stats.successfulTasks = 0;
  if (typeof data.stats.failedTasks !== 'number') data.stats.failedTasks = 0;
  
  // 同时更新统计
  data.stats.totalTasks++;
  data.stats.failedTasks++;
  
  // 按分类统计
  if (category) {
    const cat = validateCategory(category);
    if (!data.stats.byCategory[cat]) {
      data.stats.byCategory[cat] = { total: 0, successful: 0, failed: 0, avgDuration: 0 };
    }
    data.stats.byCategory[cat].total++;
    data.stats.byCategory[cat].failed++;
  }
  
  // 按Agent统计
  const agent = agentName || 'unknown';
  if (!data.stats.byAgent[agent]) {
    data.stats.byAgent[agent] = { total: 0, successful: 0, failed: 0 };
  }
  data.stats.byAgent[agent].total++;
  data.stats.byAgent[agent].failed++;
  
  saveTrackerData(data);
  
  console.log(`[TrackerIncrement] Error recorded: ${taskId} | ${entry.category} | ${agentName} | ${entry.error}`);
  
  return {
    id: entry.id,
    taskId,
    error: entry.error
  };
}

/**
 * 获取统计信息
 * @param {Object} options - 查询选项
 * @returns {Object} - 统计信息
 */
function getStats(options = {}) {
  const data = loadTrackerData();
  
  const stats = {
    summary: {
      totalTasks: data.stats.totalTasks,
      successfulTasks: data.stats.successfulTasks,
      failedTasks: data.stats.failedTasks,
      successRate: data.stats.totalTasks > 0 
        ? (data.stats.successfulTasks / data.stats.totalTasks * 100).toFixed(1) + '%' 
        : '0%',
      totalDuration: data.stats.totalDuration,
      avgDuration: data.stats.avgDuration ? Math.round(data.stats.avgDuration) + 'ms' : 'N/A',
      lastUpdated: data.lastUpdated
    },
    byCategory: {},
    byAgent: {},
    recentTrend: getRecentTrend(data)
  };
  
  // 按分类统计详情
  if (options.includeCategory) {
    for (const [cat, catStats] of Object.entries(data.stats.byCategory)) {
      stats.byCategory[cat] = {
        ...catStats,
        successRate: catStats.total > 0 
          ? (catStats.successful / catStats.total * 100).toFixed(1) + '%' 
          : '0%',
        avgDuration: catStats.avgDuration ? Math.round(catStats.avgDuration) + 'ms' : 'N/A'
      };
    }
  }
  
  // 按Agent统计详情
  if (options.includeAgent) {
    for (const [agent, agentStats] of Object.entries(data.stats.byAgent)) {
      stats.byAgent[agent] = {
        ...agentStats,
        successRate: agentStats.total > 0 
          ? (agentStats.successful / agentStats.total * 100).toFixed(1) + '%' 
          : '0%'
      };
    }
  }
  
  return stats;
}

/**
 * 获取最近趋势
 */
function getRecentTrend(data) {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const dayAgo = now - 86400000;
  
  const lastHour = data.executions.filter(e => new Date(e.timestamp).getTime() > hourAgo);
  const lastDay = data.executions.filter(e => new Date(e.timestamp).getTime() > dayAgo);
  
  return {
    lastHour: {
      total: lastHour.length,
      successful: lastHour.filter(e => e.success).length,
      failed: lastHour.filter(e => !e.success).length
    },
    lastDay: {
      total: lastDay.length,
      successful: lastDay.filter(e => e.success).length,
      failed: lastDay.filter(e => !e.success).length
    }
  };
}

/**
 * 验证分类
 * @param {string} category - 分类名称
 * @returns {string} - 验证后的分类（如果是未知分类，会返回'unknown'）
 */
function validateCategory(category) {
  if (!category) return 'unknown';
  
  const normalized = category.toLowerCase().trim();
  
  if (VALID_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  
  // 尝试模糊匹配
  const categoryMapping = {
    'simple': 'simple',
    'std': 'standard',
    'normal': 'standard',
    'complex': 'complex',
    'comp': 'complex',
    'innovate': 'innovative',
    'innovation': 'innovative',
    'novel': 'innovative',
    'batch': 'batch',
    'bulk': 'batch',
    'research': 'research',
    'analyze': 'analysis',
    'analytics': 'analysis',
    'creative': 'creative',
    'create': 'creative',
    'hybrid': 'hybrid',
    'mix': 'hybrid',
    'mixed': 'hybrid'
  };
  
  if (categoryMapping[normalized]) {
    return categoryMapping[normalized];
  }
  
  console.warn(`[TrackerIncrement] Unknown category: ${category}, defaulting to 'unknown'`);
  return 'unknown';
}

/**
 * 获取所有有效分类
 */
function getValidCategories() {
  return [...VALID_CATEGORIES];
}

/**
 * 获取执行历史
 * @param {Object} options - 查询选项
 * @returns {Array} - 执行记录
 */
function getHistory(options = {}) {
  const data = loadTrackerData();
  
  let executions = data.executions;
  
  if (options.taskId) {
    executions = executions.filter(e => e.taskId === options.taskId);
  }
  
  if (options.category) {
    executions = executions.filter(e => e.category === options.category);
  }
  
  if (options.agentName) {
    executions = executions.filter(e => e.agentName === options.agentName);
  }
  
  if (options.success !== undefined) {
    executions = executions.filter(e => e.success === options.success);
  }
  
  if (options.since) {
    executions = executions.filter(e => e.timestamp >= options.since);
  }
  
  if (options.limit) {
    executions = executions.slice(-options.limit);
  }
  
  return executions.reverse();
}

/**
 * 获取错误历史
 * @param {Object} options - 查询选项
 * @returns {Array} - 错误记录
 */
function getErrors(options = {}) {
  const data = loadTrackerData();
  
  let errors = data.errors;
  
  if (options.taskId) {
    errors = errors.filter(e => e.taskId === options.taskId);
  }
  
  if (options.category) {
    errors = errors.filter(e => e.category === options.category);
  }
  
  if (options.limit) {
    errors = errors.slice(-options.limit);
  }
  
  return errors.reverse();
}

/**
 * 清除旧记录
 * @param {number} daysToKeep - 保留天数
 */
function clearOldRecords(daysToKeep = 30) {
  const data = loadTrackerData();
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  
  const originalExecCount = data.executions.length;
  const originalErrCount = data.errors.length;
  
  data.executions = data.executions.filter(e => e.timestamp >= cutoff);
  data.errors = data.errors.filter(e => e.timestamp >= cutoff);
  
  saveTrackerData(data);
  
  return {
    executionsRemoved: originalExecCount - data.executions.length,
    errorsRemoved: originalErrCount - data.errors.length,
    kept: {
      executions: data.executions.length,
      errors: data.errors.length
    }
  };
}

/**
 * 重置追踪器
 */
function reset() {
  const freshData = {
    executions: [],
    errors: [],
    stats: {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      byCategory: {},
      byAgent: {},
      totalDuration: 0,
      avgDuration: 0
    },
    lastUpdated: new Date().toISOString()
  };
  
  saveTrackerData(freshData);
  
  console.log('[TrackerIncrement] Tracker reset');
  
  return { success: true };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 核心函数
  increment,
  recordError,
  getStats,
  validateCategory,
  
  // 查询
  getHistory,
  getErrors,
  getValidCategories,
  
  // 维护
  clearOldRecords,
  reset,
  
  // 常量
  VALID_CATEGORIES,
  
  // 路径
  TRACKER_PATH
};
