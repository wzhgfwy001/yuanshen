/**
 * DeerFlow增强版智能重试系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 指数退避算法
 * 2. 可配置的重试策略
 * 3. 错误分类与路由
 * 4. 重试历史与统计
 */

const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const RETRY_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  ABORTED: 'aborted'
};

const ERROR_CATEGORIES = {
  TRANSIENT: 'transient',     // 临时错误 (网络、限流)
  RESOURCE: 'resource',       // 资源错误 (内存、CPU)
  CLIENT: 'client',           // 客户端错误 (参数、权限)
  SERVER: 'server',           // 服务端错误 (500等)
  UNKNOWN: 'unknown'          // 未知错误
};

const RETRY_DECISIONS = {
  RETRY: 'retry',
  RETRY_WITH_BACKOFF: 'retry_with_backoff',
  FALLBACK: 'fallback',
  SKIP: 'skip',
  ABORT: 'abort',
  ESCALATE: 'escalate'
};

const RETRY_EVENTS = {
  RETRY_STARTED: 'retry_started',
  RETRY_ATTEMPT: 'retry_attempt',
  RETRY_SUCCEEDED: 'retry_succeeded',
  RETRY_FAILED: 'retry_failed',
  RETRY_ABORTED: 'retry_aborted',
  BACKOFF_APPLIED: 'backoff_applied'
};

// ============== RetryPolicy 类 ==============
class RetryPolicy {
  constructor(config = {}) {
    this.maxAttempts = config.maxAttempts || 3;
    this.initialDelayMs = config.initialDelayMs || 1000;
    this.maxDelayMs = config.maxDelayMs || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.jitter = config.jitter || 0.1; // 10%随机抖动
    this.retryableErrors = config.retryableErrors || this._defaultRetryableErrors();
    this.nonRetryableErrors = config.nonRetryableErrors || [];
    this.timeoutMs = config.timeoutMs || 60000;
  }

  _defaultRetryableErrors() {
    return [
      { type: 'network', patterns: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'] },
      { type: 'rate_limit', patterns: ['429', 'RATE_LIMIT'] },
      { type: 'server', patterns: ['500', '502', '503', '504'] },
      { type: 'timeout', patterns: ['TIMEOUT', 'timeout'] }
    ];
  }

  /**
   * 计算延迟
   */
  calculateDelay(attempt) {
    // 指数退避
    const exponentialDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt - 1);
    
    // 添加上限
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    
    // 添加抖动
    const jitterAmount = cappedDelay * this.jitter * (Math.random() * 2 - 1);
    const finalDelay = Math.round(cappedDelay + jitterAmount);
    
    return Math.max(0, finalDelay);
  }

  /**
   * 检查是否应该重试
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.maxAttempts) {
      return { decision: RETRY_DECISIONS.ABORT, reason: 'max_attempts' };
    }

    const errorInfo = this._classifyError(error);
    
    // 检查非重试错误
    for (const pattern of this.nonRetryableErrors) {
      if (this._matchesPattern(error.message || error.code || '', pattern)) {
        return { decision: RETRY_DECISIONS.ABORT, reason: 'non_retryable', errorInfo };
      }
    }

    // 检查可重试错误
    for (const rule of this.retryableErrors) {
      if (this._matchesRule(error, rule)) {
        if (rule.type === 'rate_limit') {
          return { 
            decision: RETRY_DECISIONS.RETRY_WITH_BACKOFF, 
            reason: rule.type,
            errorInfo,
            suggestedDelay: this._getRateLimitDelay(error)
          };
        }
        return { 
          decision: RETRY_DECISIONS.RETRY, 
          reason: rule.type,
          errorInfo 
        };
      }
    }

    // 未知错误，默认不重试
    return { 
      decision: RETRY_DECISIONS.ABORT, 
      reason: 'unknown_error',
      errorInfo 
    };
  }

  _classifyError(error) {
    const message = error.message || '';
    const code = error.code || '';
    const statusCode = error.statusCode || 0;

    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(code)) {
      return { category: ERROR_CATEGORIES.TRANSIENT, recoverable: true };
    }

    if (statusCode === 429 || message.includes('rate limit')) {
      return { category: ERROR_CATEGORIES.TRANSIENT, recoverable: true, retryAfter: error.retryAfter };
    }

    if (statusCode >= 500) {
      return { category: ERROR_CATEGORIES.SERVER, recoverable: true };
    }

    if (statusCode >= 400) {
      return { category: ERROR_CATEGORIES.CLIENT, recoverable: false };
    }

    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return { category: ERROR_CATEGORIES.TRANSIENT, recoverable: true };
    }

    return { category: ERROR_CATEGORIES.UNKNOWN, recoverable: false };
  }

  _matchesRule(error, rule) {
    const text = `${error.message || ''} ${error.code || ''} ${error.statusCode || ''}`;
    
    for (const pattern of rule.patterns) {
      if (text.includes(pattern) || text.includes(pattern.toString())) {
        return true;
      }
    }
    
    return false;
  }

  _matchesPattern(text, pattern) {
    if (typeof pattern === 'string') {
      return text.includes(pattern);
    }
    if (pattern instanceof RegExp) {
      return pattern.test(text);
    }
    return false;
  }

  _getRateLimitDelay(error) {
    if (error.retryAfter) {
      return Math.max(this.initialDelayMs, error.retryAfter * 1000);
    }
    return this.calculateDelay(0);
  }
}

// ============== RetryAttempt 类 ==============
class RetryAttempt {
  constructor(attemptNumber, error, delay) {
    this.attemptNumber = attemptNumber;
    this.error = error;
    this.delay = delay;
    this.startedAt = Date.now();
    this.completedAt = null;
    this.succeeded = false;
  }

  complete(succeeded) {
    this.completedAt = Date.now();
    this.succeeded = succeeded;
  }

  getDuration() {
    if (!this.completedAt) return null;
    return this.completedAt - this.startedAt;
  }
}

// ============== SmartRetry 主类 ==============
class SmartRetry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.policy = new RetryPolicy(config.policy);
    this.defaultFallback = config.defaultFallback || null;
    this.enableStats = config.enableStats !== false;
    
    this.stats = {
      totalAttempts: 0,
      succeeded: 0,
      failed: 0,
      aborted: 0,
      totalRetryAttempts: 0,
      totalDelayMs: 0,
      byErrorType: {}
    };

    this.activeRetries = new Map();
  }

  /**
   * 执行带重试的函数
   */
  async execute(fn, options = {}) {
    const {
      context = {},
      fallback = this.defaultFallback,
      onRetry = null,
      onSuccess = null,
      onFailure = null
    } = options;

    const taskId = `retry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const attempts = [];
    
    this.emit(RETRY_EVENTS.RETRY_STARTED, { taskId, context });

    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
      this.stats.totalAttempts++;
      
      try {
        const result = await this._executeWithTimeout(fn, this.policy.timeoutMs);
        
        this.stats.succeeded++;
        this.emit(RETRY_EVENTS.RETRY_SUCCEEDED, {
          taskId,
          attempt,
          duration: attempts.length > 0 ? attempts[attempts.length - 1].getDuration() : 0
        });

        if (onSuccess) await onSuccess(result, attempt);
        
        return { succeeded: true, result, attempts, taskId };
        
      } catch (error) {
        const retryAttempt = new RetryAttempt(attempt, error, 0);
        attempts.push(retryAttempt);

        const { decision, reason, suggestedDelay } = this.policy.shouldRetry(error, attempt);
        
        this._recordErrorType(reason, error);

        if (decision === RETRY_DECISIONS.ABORT) {
          this.stats.aborted++;
          
          this.emit(RETRY_EVENTS.RETRY_ABORTED, {
            taskId,
            attempt,
            reason,
            error: error.message
          });

          // 尝试执行fallback
          if (fallback) {
            try {
              const fallbackResult = await fallback(error, attempts);
              return { 
                succeeded: true, 
                result: fallbackResult, 
                attempts, 
                taskId,
                usedFallback: true 
              };
            } catch (fallbackError) {
              // fallback也失败了
            }
          }

          if (onFailure) await onFailure(error, attempts);
          
          return { 
            succeeded: false, 
            error, 
            attempts, 
            taskId,
            reason 
          };
        }

        // 计算延迟
        const delay = suggestedDelay || this.policy.calculateDelay(attempt);
        retryAttempt.delay = delay;
        this.stats.totalDelayMs += delay;
        
        this.emit(RETRY_EVENTS.RETRY_ATTEMPT, {
          taskId,
          attempt,
          reason,
          delay,
          error: error.message
        });

        if (onRetry) await onRetry(error, attempt, delay);

        // 等待后重试
        if (attempt < this.policy.maxAttempts) {
          this.stats.totalRetryAttempts++;
          this.emit(RETRY_EVENTS.BACKOFF_APPLIED, { taskId, attempt, delay });
          await this._delay(delay);
        }
      }
    }

    // 所有重试都失败了
    this.stats.failed++;
    
    const lastError = attempts[attempts.length - 1]?.error;
    
    this.emit(RETRY_EVENTS.RETRY_FAILED, {
      taskId,
      attempts: attempts.length,
      lastError: lastError?.message
    });

    return { 
      succeeded: false, 
      error: lastError, 
      attempts, 
      taskId,
      reason: 'all_retries_exhausted'
    };
  }

  /**
   * 创建重试包装器
   */
  wrap(fn, options = {}) {
    return (...args) => this.execute(() => fn(...args), options);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const successRate = this.stats.totalAttempts > 0 
      ? (this.stats.succeeded / this.stats.totalAttempts) * 100 
      : 0;
    
    const avgDelay = this.stats.totalRetryAttempts > 0
      ? this.stats.totalDelayMs / this.stats.totalRetryAttempts
      : 0;

    return {
      ...this.stats,
      successRate: successRate.toFixed(2) + '%',
      avgRetryDelay: Math.round(avgDelay) + 'ms'
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalAttempts: 0,
      succeeded: 0,
      failed: 0,
      aborted: 0,
      totalRetryAttempts: 0,
      totalDelayMs: 0,
      byErrorType: {}
    };
  }

  /**
   * 更新策略
   */
  updatePolicy(updates) {
    this.policy = new RetryPolicy({
      ...this._policyToConfig(),
      ...updates
    });
  }

  _policyToConfig() {
    return {
      maxAttempts: this.policy.maxAttempts,
      initialDelayMs: this.policy.initialDelayMs,
      maxDelayMs: this.policy.maxDelayMs,
      backoffMultiplier: this.policy.backoffMultiplier,
      jitter: this.policy.jitter,
      timeoutMs: this.policy.timeoutMs
    };
  }

  _recordErrorType(reason, error) {
    if (!this.stats.byErrorType[reason]) {
      this.stats.byErrorType[reason] = { count: 0, examples: [] };
    }
    
    this.stats.byErrorType[reason].count++;
    
    if (this.stats.byErrorType[reason].examples.length < 3) {
      this.stats.byErrorType[reason].examples.push(error.message?.slice(0, 100));
    }
  }

  async _executeWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      )
    ]);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 导出 ==============
module.exports = {
  SmartRetry,
  RetryPolicy,
  RetryAttempt,
  RETRY_STATES,
  ERROR_CATEGORIES,
  RETRY_DECISIONS,
  RETRY_EVENTS
};
