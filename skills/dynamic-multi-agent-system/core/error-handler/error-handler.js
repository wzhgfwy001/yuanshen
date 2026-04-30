/**
 * Error Handler - 统一错误处理机制
 * 
 * 功能：
 * - 统一的错误处理机制
 * - 错误分类（recoverable/unrecoverable）
 * - 错误恢复策略
 * - 错误日志记录
 * - 错误追踪
 * - 重试机制
 * 
 * 使用方式：
 * const { handleError, isRecoverable, getRecoveryStrategy, logError, retry } = require('./error-handler');
 */

const fs = require('fs');
const path = require('path');

// 错误日志路径
const ERROR_LOG_DIR = path.join(__dirname, 'logs');
const ERROR_LOG_PATH = path.join(ERROR_LOG_DIR, 'error-handler.json');

// 确保日志目录存在
if (!fs.existsSync(ERROR_LOG_DIR)) {
  fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
}

// ============================================================
// 错误类型定义
// ============================================================

/**
 * 可恢复错误类型
 */
const RECOVERABLE_ERROR_TYPES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMIT',
  'TEMPORARY_UNAVAILABLE',
  'CONNECTION_REFUSED',
  'SERVICE_UNAVAILABLE',
  'TOO_MANY_REQUESTS',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND'
];

/**
 * 不可恢复错误类型
 */
const UNRECOVERABLE_ERROR_TYPES = [
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'FORBIDDEN',
  'BAD_REQUEST',
  'INTERNAL_ERROR',
  'SYNTAX_ERROR',
  'TYPE_ERROR',
  'REFERENCE_ERROR'
];

// ============================================================
// 错误分类
// ============================================================

/**
 * 判断错误是否可恢复
 * @param {Error|string} error - 错误对象或错误类型字符串
 * @returns {boolean}
 */
function isRecoverable(error) {
  if (!error) return false;
  
  const errorType = typeof error === 'string' 
    ? error 
    : (error.type || error.code || error.name || '');
  
  const errorMessage = typeof error === 'string' 
    ? error.toLowerCase() 
    : (error.message || '').toLowerCase();
  
  // 检查类型
  if (RECOVERABLE_ERROR_TYPES.some(type => errorType.includes(type))) {
    return true;
  }
  
  // 检查错误消息中的关键字
  const recoverableKeywords = [
    'network', 'timeout', 'rate limit', 'temporarily', 
    'connection', 'refused', 'unavailable', 'reset',
    'econnreset', 'econnrefused', 'etimedout', 'enotfound',
    'socket', 'hang up', 'broken pipe'
  ];
  
  return recoverableKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * 获取错误的分类
 * @param {Error} error - 错误对象
 * @returns {string} - 'recoverable' | 'unrecoverable' | 'unknown'
 */
function getErrorCategory(error) {
  if (!error) return 'unknown';
  
  const errorType = error.type || error.code || error.name || '';
  const errorMessage = (error.message || '').toLowerCase();
  
  if (RECOVERABLE_ERROR_TYPES.some(type => errorType.includes(type))) {
    return 'recoverable';
  }
  
  if (UNRECOVERABLE_ERROR_TYPES.some(type => errorType.includes(type))) {
    return 'unrecoverable';
  }
  
  // 通过错误消息判断
  const unrecoverableKeywords = [
    'authentication', 'authorization', 'validation', 
    'not found', 'forbidden', 'bad request', 
    'invalid', 'malformed', 'unauthorized'
  ];
  
  if (unrecoverableKeywords.some(keyword => errorMessage.includes(keyword))) {
    return 'unrecoverable';
  }
  
  const recoverableKeywords = [
    'network', 'timeout', 'rate limit', 'connection',
    'temporarily', 'unavailable', 'service'
  ];
  
  if (recoverableKeywords.some(keyword => errorMessage.includes(keyword))) {
    return 'recoverable';
  }
  
  return 'unknown';
}

// ============================================================
// 恢复策略
// ============================================================

/**
 * 获取错误恢复策略
 * @param {Error} error - 错误对象
 * @returns {Object} - 恢复策略
 */
function getRecoveryStrategy(error) {
  const category = getErrorCategory(error);
  const errorType = error.type || error.code || error.name || '';
  
  const strategies = {
    recoverable: {
      action: 'retry',
      maxRetries: 3,
      backoff: 'exponential',
      backoffBase: 1000,
      fallback: 'degrade',
      fallbackOptions: ['cache', 'mock', 'skip', 'alternative_agent']
    },
    unrecoverable: {
      action: 'escalate',
      maxRetries: 0,
      fallback: 'notify',
      fallbackOptions: ['user_feedback', 'manual_review', 'skip']
    },
    unknown: {
      action: 'retry',
      maxRetries: 1,
      backoff: 'linear',
      backoffBase: 500,
      fallback: 'skip',
      fallbackOptions: ['cache', 'skip']
    }
  };
  
  // 针对特定错误类型的策略微调
  if (errorType.includes('RATE_LIMIT') || errorMessage(error).includes('rate limit')) {
    return {
      action: 'retry',
      maxRetries: 5,
      backoff: 'fixed',
      backoffBase: 5000,
      fallback: 'queue',
      fallbackOptions: ['queue', 'alternative_agent', 'skip']
    };
  }
  
  if (errorType.includes('TIMEOUT')) {
    return {
      action: 'retry',
      maxRetries: 2,
      backoff: 'linear',
      backoffBase: 2000,
      fallback: 'timeout_extended',
      fallbackOptions: ['timeout_extended', 'alternative_agent', 'skip']
    };
  }
  
  return strategies[category];
}

function errorMessage(error) {
  return (error && error.message) ? error.message.toLowerCase() : '';
}

// ============================================================
// 错误日志
// ============================================================

/**
 * 加载错误日志
 */
function loadErrorLog() {
  try {
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const data = fs.readFileSync(ERROR_LOG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[ErrorHandler] Failed to load error log:', e.message);
  }
  return {
    errors: [],
    stats: {
      total: 0,
      recoverable: 0,
      unrecoverable: 0,
      unknown: 0
    },
    lastUpdated: null
  };
}

/**
 * 保存错误日志
 */
function saveErrorLog(log) {
  try {
    log.lastUpdated = new Date().toISOString();
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.error('[ErrorHandler] Failed to save error log:', e.message);
  }
}

/**
 * 记录错误
 * @param {Error} error - 错误对象
 * @param {Object} context - 上下文信息
 */
function logError(error, context = {}) {
  const log = loadErrorLog();
  
  const errorEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    message: error.message || String(error),
    stack: error.stack,
    type: error.type || error.code || error.name || 'Error',
    category: getErrorCategory(error),
    context: {
      taskId: context.taskId || null,
      agentName: context.agentName || null,
      operation: context.operation || null,
      metadata: context.metadata || {}
    }
  };
  
  log.errors.push(errorEntry);
  log.stats.total++;
  
  if (errorEntry.category === 'recoverable') {
    log.stats.recoverable++;
  } else if (errorEntry.category === 'unrecoverable') {
    log.stats.unrecoverable++;
  } else {
    log.stats.unknown++;
  }
  
  // 只保留最近1000条错误
  if (log.errors.length > 1000) {
    log.errors = log.errors.slice(-1000);
  }
  
  saveErrorLog(log);
  
  console.error(`[ErrorHandler] Error logged: ${errorEntry.id} | ${errorEntry.category} | ${errorEntry.message}`);
  
  return errorEntry.id;
}

/**
 * 获取错误日志
 * @param {Object} options - 查询选项
 * @returns {Array} - 错误列表
 */
function getErrorLog(options = {}) {
  const log = loadErrorLog();
  
  let errors = log.errors;
  
  if (options.category) {
    errors = errors.filter(e => e.category === options.category);
  }
  
  if (options.taskId) {
    errors = errors.filter(e => e.context.taskId === options.taskId);
  }
  
  if (options.agentName) {
    errors = errors.filter(e => e.context.agentName === options.agentName);
  }
  
  if (options.since) {
    errors = errors.filter(e => e.timestamp >= options.since);
  }
  
  // 限制返回数量
  if (options.limit) {
    errors = errors.slice(-options.limit);
  }
  
  return errors;
}

/**
 * 获取错误统计
 */
function getErrorStats() {
  const log = loadErrorLog();
  return {
    ...log.stats,
    recentTrend: getRecentTrend(log.errors)
  };
}

/**
 * 获取最近错误趋势
 */
function getRecentTrend(errors) {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const dayAgo = now - 86400000;
  
  const lastHour = errors.filter(e => new Date(e.timestamp).getTime() > hourAgo).length;
  const lastDay = errors.filter(e => new Date(e.timestamp).getTime() > dayAgo).length;
  
  return {
    lastHour: lastHour,
    lastDay: lastDay
  };
}

// ============================================================
// 主错误处理函数
// ============================================================

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {Object} context - 上下文信息
 * @returns {Object} - 处理结果
 */
function handleError(error, context = {}) {
  const category = getErrorCategory(error);
  const strategy = getRecoveryStrategy(error);
  const errorId = logError(error, context);
  
  const result = {
    errorId,
    handled: true,
    category,
    strategy: strategy.action,
    recoverable: category === 'recoverable',
    shouldRetry: strategy.action === 'retry' && strategy.maxRetries > 0,
    maxRetries: strategy.maxRetries,
    fallback: strategy.fallback,
    fallbackOptions: strategy.fallbackOptions,
    message: error.message || String(error),
    timestamp: new Date().toISOString()
  };
  
  // 如果应该重试，添加重试辅助函数
  if (result.shouldRetry) {
    result.retryWithBackoff = (operation) => {
      return retry(operation, result.maxRetries, strategy.backoff, strategy.backoffBase);
    };
  }
  
  return result;
}

// ============================================================
// 重试机制
// ============================================================

/**
 * 带退避的重试
 * @param {Function} operation - 要重试的操作
 * @param {number} maxRetries - 最大重试次数
 * @param {string} backoffType - 退避类型: 'linear' | 'exponential' | 'fixed'
 * @param {number} baseDelay - 基础延迟（毫秒）
 * @returns {Promise}
 */
async function retry(operation, maxRetries = 3, backoffType = 'exponential', baseDelay = 1000) {
  let lastError;
  let attempt = 0;
  
  for (let i = 0; i <= maxRetries; i++) {
    attempt++;
    
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 如果最后一次尝试还是失败，直接抛出
      if (i === maxRetries) {
        break;
      }
      
      // 计算延迟
      let delay;
      switch (backoffType) {
        case 'linear':
          delay = baseDelay * (i + 1);
          break;
        case 'exponential':
          delay = baseDelay * Math.pow(2, i);
          break;
        case 'fixed':
        default:
          delay = baseDelay;
          break;
      }
      
      console.log(`[ErrorHandler] Retry attempt ${attempt}/${maxRetries + 1} after ${delay}ms delay`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 所有重试都失败，抛出最后一个错误
  throw lastError;
}

/**
 * 简单的重试包装器（兼容同步/异步）
 * @param {Function} operation - 要执行的操作
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delayMs - 重试间隔（毫秒）
 * @returns {Promise}
 */
async function retrySimple(operation, maxRetries = 3, delayMs = 1000) {
  return retry(operation, maxRetries, 'fixed', delayMs);
}

// ============================================================
// 批量错误处理
// ============================================================

/**
 * 处理多个错误，返回汇总报告
 * @param {Array} errors - 错误数组
 * @param {Object} context - 默认上下文
 */
function handleErrors(errors, context = {}) {
  const results = errors.map(error => handleError(error, context));
  
  const summary = {
    total: results.length,
    recoverable: results.filter(r => r.recoverable).length,
    unrecoverable: results.filter(r => !r.recoverable).length,
    shouldRetry: results.filter(r => r.shouldRetry).length,
    results
  };
  
  return summary;
}

// ============================================================
// 清除旧日志
// ============================================================

/**
 * 清除指定天数之前的错误日志
 * @param {number} daysToKeep - 保留天数
 */
function clearOldLogs(daysToKeep = 7) {
  const log = loadErrorLog();
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  
  const originalCount = log.errors.length;
  log.errors = log.errors.filter(e => e.timestamp >= cutoff);
  
  saveErrorLog(log);
  
  const removed = originalCount - log.errors.length;
  console.log(`[ErrorHandler] Cleared ${removed} old error entries, kept ${log.errors.length}`);
  
  return { removed, kept: log.errors.length };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 核心函数
  handleError,
  handleErrors,
  isRecoverable,
  getErrorCategory,
  getRecoveryStrategy,
  logError,
  
  // 重试
  retry,
  retrySimple,
  
  // 查询
  getErrorLog,
  getErrorStats,
  
  // 维护
  clearOldLogs,
  
  // 常量
  RECOVERABLE_ERROR_TYPES,
  UNRECOVERABLE_ERROR_TYPES
};
