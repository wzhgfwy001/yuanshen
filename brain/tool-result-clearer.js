/**
 * Tool Result Clearing - 工具结果清除
 * 基于 Anthropic Managed Agents 理念
 * 保留工具调用记录，清除大量返回数据，节省50%+ Token
 */

const fs = require('fs');
const path = require('path');

/**
 * 工具结果记录
 */
class ToolResult {
  constructor(toolName, args, result, resultSize) {
    this.id = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.toolName = toolName;
    this.args = args;
    this.result = result;
    this.resultSize = resultSize;  // 原始结果大小（字节）
    this.cleared = false;
    this.clearedAt = null;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 清除实际结果，只保留标记
   */
  clear() {
    if (this.cleared) return this;
    
    this.cleared = true;
    this.clearedAt = new Date().toISOString();
    // 保存元数据，清除实际结果
    this._savedResult = this.result;
    this.result = null;
    return this;
  }

  /**
   * 获取清除后的摘要
   */
  getSummary() {
    return {
      id: this.id,
      toolName: this.toolName,
      cleared: this.cleared,
      resultSize: this.resultSize,
      timestamp: this.timestamp
    };
  }

  /**
   * 获取保留的信息（用于审计）
   */
  getAuditInfo() {
    return {
      id: this.id,
      toolName: this.toolName,
      args: this.args,
      resultSize: this.resultSize,
      clearedAt: this.clearedAt,
      timestamp: this.timestamp
    };
  }
}

/**
 * Tool Result Clearing 主类
 */
class ToolResultClearer {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1024 * 10;  // 超过10KB清除
    this.preserveTypes = options.preserveTypes || ['error', 'status'];
    this.history = [];
    this.logFile = path.join(__dirname, 'tool-result-log.json');
  }

  /**
   * 处理工具结果
   * @param {string} toolName - 工具名称
   * @param {object} args - 工具参数
   * @param {any} result - 工具返回结果
   * @returns {object} - 处理后的结果
   */
  process(toolName, args, result) {
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const resultSize = Buffer.byteLength(resultStr, 'utf8');
    
    const record = new ToolResult(toolName, args, result, resultSize);
    
    // 判断是否需要清除
    const shouldClear = this.shouldClear(toolName, resultSize, result);
    
    if (shouldClear) {
      record.clear();
      this.log(`[CLEAR] ${toolName} - ${resultSize} bytes cleared`);
    } else {
      this.log(`[KEEP] ${toolName} - ${resultSize} bytes preserved`);
    }
    
    this.history.push(record);
    this.saveLog();
    
    return {
      result: shouldClear ? null : result,
      cleared: shouldClear,
      summary: record.getSummary()
    };
  }

  /**
   * 判断是否需要清除
   */
  shouldClear(toolName, resultSize, result) {
    // 错误始终保留
    if (this.preserveTypes.includes('error') && result instanceof Error) {
      return false;
    }
    
    // 状态消息保留
    if (this.preserveTypes.includes('status') && typeof result === 'object' && result.type === 'status') {
      return false;
    }
    
    // 超过阈值的清除
    if (resultSize > this.maxSize) {
      return true;
    }
    
    // 大数组清除（如搜索结果）
    if (Array.isArray(result) && result.length > 100) {
      return true;
    }
    
    // 超长字符串清除
    if (typeof result === 'string' && result.length > 5000) {
      return true;
    }
    
    return false;
  }

  /**
   * 清除所有大结果
   */
  clearAll(largeThan = 1024) {
    let count = 0;
    for (const record of this.history) {
      if (!record.cleared && record.resultSize > largeThan) {
        record.clear();
        count++;
      }
    }
    this.saveLog();
    return { cleared: count };
  }

  /**
   * 获取历史摘要
   */
  getHistorySummary() {
    const total = this.history.length;
    const cleared = this.history.filter(r => r.cleared).length;
    const totalBytes = this.history.reduce((sum, r) => sum + r.resultSize, 0);
    const savedBytes = this.history
      .filter(r => r.cleared)
      .reduce((sum, r) => sum + r.resultSize, 0);
    
    return {
      total,
      cleared,
      kept: total - cleared,
      totalBytes,
      savedBytes,
      savingsPercent: totalBytes > 0 ? ((savedBytes / totalBytes) * 100).toFixed(1) : 0
    };
  }

  /**
   * 获取审计日志
   */
  getAuditLog() {
    return this.history.map(r => r.getAuditInfo());
  }

  /**
   * 日志
   */
  log(message) {
    const entry = `[${new Date().toISOString()}] ${message}`;
    console.log(entry);
  }

  /**
   * 保存日志到文件
   */
  saveLog() {
    const data = {
      summary: this.getHistorySummary(),
      records: this.history.slice(-100).map(r => r.getSummary())
    };
    fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
  }

  /**
   * 获取统计
   */
  stats() {
    return this.getHistorySummary();
  }
}

const toolResultClearer = new ToolResultClearer({
  maxSize: 1024 * 10,  // 10KB
  preserveTypes: ['error', 'status']
});

module.exports = { toolResultClearer, ToolResultClearer };

// 使用示例
if (require.main === module) {
  // 处理各种工具结果
  const r1 = toolResultClearer.process('search', { query: '合同' }, Array(1000).fill('result'));
  console.log('Large array cleared:', r1.cleared);
  
  const r2 = toolResultClearer.process('read', { path: 'test.js' }, 'short content');
  console.log('Small result kept:', !r2.cleared);
  
  const r3 = toolResultClearer.process('status', {}, { type: 'status', message: 'ok' });
  console.log('Status preserved:', !r3.cleared);
  
  console.log('Stats:', toolResultClearer.stats());
}