/**
 * brain/token-rules.js - Token节省规则
 * 
 * 功能：
 * - 大结果(>10KB)自动处理：记录到brain/tool-result-log.json，返回摘要
 * - 调试日志屏蔽：不传入LLM上下文
 * - Token节省优化
 * 
 * 触发场景：
 * - 工具结果 > 10KB → 自动清除+记录+返回摘要
 * - 调试日志(DEBUG/console.log) → 屏蔽不传LLM
 * - 大文件读取 → 清除结果+节省Token
 * 
 * @version 1.0.0
 * @date 2026-05-12
 */

const fs = require('fs');
const path = require('path');

// Token阈值配置
const TOKEN_THRESHOLDS = {
  MAX_RESULT_SIZE: 10 * 1024,  // 10KB
  WARNING_SIZE: 5 * 1024,       // 5KB 警告线
  MAX_LOG_LINES: 50            // 日志最大行数
};

// 日志文件路径
const LOG_FILE = path.join(__dirname, 'tool-result-log.json');

/**
 * 处理大工具结果
 * @param {string} toolName - 工具名称
 * @param {object} args - 工具参数
 * @param {string|object} result - 工具结果
 * @returns {object} - { cleared: boolean, summary: string, originalSize: number }
 */
function processToolResult(toolName, args, result) {
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
  const size = Buffer.byteLength(resultStr, 'utf8');
  
  const response = {
    cleared: false,
    summary: '',
    originalSize: size,
    timestamp: new Date().toISOString(),
    toolName,
    args: sanitizeArgs(args)
  };

  // 检查是否超过阈值
  if (size <= TOKEN_THRESHOLDS.MAX_RESULT_SIZE) {
    return response;
  }

  // 超过阈值，清除并记录
  response.cleared = true;
  response.summary = generateSummary(result, size);
  
  // 记录到日志文件
  logToolResult(response);

  return response;
}

/**
 * 生成结果摘要
 * @param {string|object} result - 原始结果
 * @param {number} size - 原始大小
 * @returns {string} - 摘要
 */
function generateSummary(result, size) {
  const type = typeof result;
  
  let preview = '';
  if (type === 'string') {
    preview = result.substring(0, 200);
  } else if (type === 'object') {
    const keys = Object.keys(result);
    preview = `Object with ${keys.length} keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`;
  }

  const sizeKB = (size / 1024).toFixed(1);
  return `[Large result cleared] Size: ${sizeKB}KB | Type: ${type} | Preview: ${preview}`;
}

/**
 * 记录工具结果到日志
 * @param {object} resultInfo - 结果信息
 */
function logToolResult(resultInfo) {
  try {
    let logs = [];
    
    // 读取现有日志
    if (fs.existsSync(LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      } catch (e) {
        logs = [];
      }
    }

    // 添加新记录
    logs.unshift(resultInfo); // 最新的在前
    
    // 只保留最近100条
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }

    // 写入日志
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('[token-rules] Failed to log tool result:', e.message);
  }
}

/**
 * 清理参敏感信息
 * @param {object} args - 参数对象
 * @returns {object} - 清理后的参数
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') {
    return args;
  }

  const sanitized = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

  for (const [key, value] of Object.entries(args)) {
    const lowerKey = key.toLowerCase();
    
    // 检测敏感字段
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      sanitized[key] = value.substring(0, 100) + '...';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 检测并屏蔽调试日志
 * @param {string} text - 文本内容
 * @returns {string} - 清理后的文本
 */
function filterDebugLogs(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // 调试日志模式
  const debugPatterns = [
    /\[DEBUG\].*/gi,
    /console\.log.*/gi,
    /\[TRACE\].*/gi,
    /DEBUG:.*/gi
  ];

  let filtered = text;
  for (const pattern of debugPatterns) {
    filtered = filtered.replace(pattern, '[debug masked]');
  }

  return filtered;
}

/**
 * 检查文本是否包含调试信息
 * @param {string} text - 文本内容
 * @returns {boolean}
 */
function hasDebugContent(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return /\[DEBUG\]|console\.log|\[TRACE\]|DEBUG:/i.test(text);
}

/**
 * 获取工具结果日志
 * @param {number} limit - 返回条数
 * @returns {array} - 日志列表
 */
function getToolResultLogs(limit = 10) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    
    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    return logs.slice(0, limit);
  } catch (e) {
    return [];
  }
}

/**
 * 清理旧日志
 * @param {number} daysOld - 清理多少天前的日志
 */
function cleanOldLogs(daysOld = 7) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return;
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const filtered = logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime > cutoffTime;
    });

    fs.writeFileSync(LOG_FILE, JSON.stringify(filtered, null, 2), 'utf8');
    
    return filtered.length;
  } catch (e) {
    return -1;
  }
}

/**
 * 获取Token使用统计
 * @returns {object}
 */
function getStats() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return { totalLogs: 0, clearedSize: 0, tools: {} };
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    
    const stats = {
      totalLogs: logs.length,
      clearedSize: 0,
      tools: {}
    };

    for (const log of logs) {
      if (log.cleared && log.originalSize) {
        stats.clearedSize += log.originalSize;
        
        if (!stats.tools[log.toolName]) {
          stats.tools[log.toolName] = { count: 0, size: 0 };
        }
        stats.tools[log.toolName].count++;
        stats.tools[log.toolName].size += log.originalSize;
      }
    }

    return stats;
  } catch (e) {
    return { error: e.message };
  }
}

// 导出模块
module.exports = {
  // 核心功能
  processToolResult,
  filterDebugLogs,
  hasDebugContent,
  
  // 日志管理
  getToolResultLogs,
  cleanOldLogs,
  getStats,
  
  // 配置
  TOKEN_THRESHOLDS,
  LOG_FILE
};