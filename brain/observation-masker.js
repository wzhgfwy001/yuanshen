/**
 * Observation Masking - 观察掩码
 * 基于 Anthropic Managed Agents 理念
 * 屏蔽调试信息、重复日志，节省50%+成本
 */

const fs = require('fs');
const path = require('path');

/**
 * 观察类型
 */
const OBSERVATION_TYPE = {
  DEBUG: 'debug',       // 调试信息
  LOG: 'log',           // 日志输出
  PROGRESS: 'progress', // 进度更新
  INFO: 'info',         // 一般信息
  RESULT: 'result',     // 结果（重要，保留）
  ERROR: 'error',       // 错误（必须保留）
  WARNING: 'warning'    // 警告（必须保留）
};

/**
 * 掩码规则
 */
const MASK_RULES = {
  // 始终掩码
  alwaysMask: [
    'DEBUG:',
    '[DEBUG]',
    'console.log',
    'Request ID:',
    'Response time:',
    'Memory usage:'
  ],
  // 始终保留
  neverMask: [
    'ERROR:',
    'FATAL:',
    'Exception:',
    'Failed:',
    'Success:'
  ],
  // 超过这个长度就掩码
  maxLength: 2000
};

/**
 * 观察记录
 */
class Observation {
  constructor(content, type, source, metadata = {}) {
    this.id = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.content = content;
    this.type = type;
    this.source = source;
    this.metadata = metadata;
    this.masked = false;
    this.maskedAt = null;
    this.maskReason = null;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 掩码
   */
  mask(reason) {
    this.masked = true;
    this.maskedAt = new Date().toISOString();
    this.maskReason = reason;
    return this;
  }

  /**
   * 获取内容（掩码后）
   */
  getContent() {
    if (this.masked) {
      return `[${this.type}] - masked (${this.maskReason})`;
    }
    return this.content;
  }

  /**
   * 获取摘要
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      source: this.source,
      masked: this.masked,
      contentLength: this.content.length,
      timestamp: this.timestamp
    };
  }
}

/**
 * Observation Masker 主类
 */
class ObservationMasker {
  constructor(options = {}) {
    this.alwaysMaskPatterns = options.alwaysMaskPatterns || MASK_RULES.alwaysMask;
    this.neverMaskPatterns = options.neverMaskPatterns || MASK_RULES.neverMask;
    this.maxLength = options.maxLength || MASK_RULES.maxLength;
    this.history = [];
    this.enableMasking = options.enableMasking !== false;
  }

  /**
   * 处理观察
   * @param {string} content - 观察内容
   * @param {string} type - 类型
   * @param {string} source - 来源
   * @param {object} metadata - 元数据
   * @returns {object} - 处理结果
   */
  observe(content, type = OBSERVATION_TYPE.INFO, source = 'unknown', metadata = {}) {
    const observation = new Observation(content, type, source, metadata);
    
    // 判断是否掩码
    const maskDecision = this.shouldMask(content, type, source);
    
    if (maskDecision.shouldMask && this.enableMasking) {
      observation.mask(maskDecision.reason);
    }
    
    this.history.push(observation);
    
    return {
      observation,
      masked: observation.masked,
      content: observation.getContent()
    };
  }

  /**
   * 判断是否应该掩码
   */
  shouldMask(content, type, source) {
    // 错误和警告不掩码
    if (type === OBSERVATION_TYPE.ERROR || type === OBSERVATION_TYPE.WARNING) {
      return { shouldMask: false, reason: null };
    }

    // 检查neverMask模式
    for (const pattern of this.neverMaskPatterns) {
      if (content.includes(pattern)) {
        return { shouldMask: false, reason: null };
      }
    }

    // 检查alwaysMask模式
    for (const pattern of this.alwaysMaskPatterns) {
      if (content.includes(pattern)) {
        return { shouldMask: true, reason: `pattern match: ${pattern}` };
      }
    }

    // 超长内容掩码
    if (content.length > this.maxLength) {
      return { shouldMask: true, reason: `length ${content.length} > ${this.maxLength}` };
    }

    // 重复内容检测
    const recentDuplicates = this.history.filter(o => 
      !o.masked && o.content === content
    );
    if (recentDuplicates.length >= 3) {
      return { shouldMask: true, reason: `duplicate x${recentDuplicates.length + 1}` };
    }

    return { shouldMask: false, reason: null };
  }

  /**
   * 批量掩码
   */
  maskAll(matcher) {
    let count = 0;
    for (const obs of this.history) {
      if (!obs.masked && matcher(obs)) {
        obs.mask('bulk mask');
        count++;
      }
    }
    return { masked: count };
  }

  /**
   * 获取可见观察（掩码后的内容）
   */
  getVisibleObservations(limit = 50) {
    return this.history
      .slice(-limit)
      .map(o => ({
        type: o.type,
        source: o.source,
        content: o.getContent(),
        masked: o.masked,
        timestamp: o.timestamp
      }));
  }

  /**
   * 获取统计
   */
  stats() {
    const total = this.history.length;
    const masked = this.history.filter(o => o.masked).length;
    const byType = {};
    
    for (const obs of this.history) {
      byType[obs.type] = byType[obs.type] || { total: 0, masked: 0 };
      byType[obs.type].total++;
      if (obs.masked) byType[obs.type].masked++;
    }

    return {
      total,
      masked,
      visible: total - masked,
      maskPercent: total > 0 ? ((masked / total) * 100).toFixed(1) : 0,
      byType
    };
  }

  /**
   * 获取历史摘要
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit).map(o => o.getSummary());
  }

  /**
   * 清除历史
   */
  clear() {
    this.history = [];
  }
}

// 单例
const observationMasker = new ObservationMasker({
  maxLength: 2000
});

module.exports = { observationMasker, ObservationMasker, OBSERVATION_TYPE };

// 使用示例
if (require.main === module) {
  // 调试信息会被掩码
  const r1 = observationMasker.observe('DEBUG: searching...', OBSERVATION_TYPE.DEBUG, 'search');
  console.log('Debug masked:', r1.masked);
  
  // 错误必须保留
  const r2 = observationMasker.observe('ERROR: connection failed', OBSERVATION_TYPE.ERROR, 'network');
  console.log('Error kept:', !r2.masked);
  
  // 超长内容掩码
  const r3 = observationMasker.observe('x'.repeat(5000), OBSERVATION_TYPE.LOG, 'tool');
  console.log('Long log masked:', r3.masked);
  
  // 重复内容掩码
  observationMasker.observe('Same log message', OBSERVATION_TYPE.LOG, 'tool');
  observationMasker.observe('Same log message', OBSERVATION_TYPE.LOG, 'tool');
  const r4 = observationMasker.observe('Same log message', OBSERVATION_TYPE.LOG, 'tool');
  console.log('Duplicate masked:', r4.masked);
  
  console.log('Stats:', observationMasker.stats());
  console.log('Visible:', observationMasker.getVisibleObservations(10));
}