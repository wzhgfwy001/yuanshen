/**
 * DeerFlow增强版错误处理器
 * 
 * 借鉴DeerFlow的设计：
 * 1. Middleware链式处理 - 类似DeerFlow的18个中间件链
 * 2. 可插拔的错误处理策略
 * 3. 错误分类与恢复机制
 * 4. 优雅降级
 */

const { EventEmitter } = require('events');

// ============== 错误类型定义 ==============
const ERROR_TYPES = {
  // 源自DeerFlow的错误分类
  LLM_ERROR: 'LLM_ERROR',                     // LLM调用错误
  TOOL_ERROR: 'TOOL_ERROR',                   // 工具执行错误
  SANDBOX_ERROR: 'SANDBOX_ERROR',             // 沙箱错误
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',             // 超时错误
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',       // 限流错误
  AUTH_ERROR: 'AUTH_ERROR',                   // 认证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 验证错误
  NETWORK_ERROR: 'NETWORK_ERROR',             // 网络错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',               // 系统错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'               // 未知错误
};

const ERROR_SEVERITY = {
  LOW: 'low',         // 不影响主流程
  MEDIUM: 'medium',   // 影响当前操作
  HIGH: 'high',       // 影响整个任务
  CRITICAL: 'critical' // 需要立即干预
};

const RECOVERY_STRATEGIES = {
  RETRY: 'retry',           // 重试
  RETRY_WITH_BACKOFF: 'retry_with_backoff',  // 指数退避重试
  FALLBACK: 'fallback',     // 降级到备用方案
  SKIP: 'skip',             // 跳过
  ABORT: 'abort',           // 中止任务
  ESCALATE: 'escalate'      // 升级处理
};

// ============== 错误项类 ==============
class ErrorItem extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || this._generateId();
    this.type = config.type || ERROR_TYPES.UNKNOWN_ERROR;
    this.severity = config.severity || ERROR_SEVERITY.MEDIUM;
    this.message = config.message;
    this.cause = config.cause || null;
    this.context = config.context || {};
    this.timestamp = Date.now();
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = config.maxRecoveryAttempts || 3;
    this.recoveryStrategy = config.recoveryStrategy || RECOVERY_STRATEGIES.RETRY;
    this.status = 'pending'; // pending, recovering, recovered, failed
    this.resolved = false;
    this.resolution = null;
    this.metadata = config.metadata || {};
  }

  _generateId() {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getFullMessage() {
    let msg = `[${this.type}] ${this.message}`;
    if (this.cause) {
      msg += `\nCaused by: ${this.cause}`;
    }
    return msg;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      cause: this.cause,
      context: this.context,
      timestamp: this.timestamp,
      recoveryAttempts: this.recoveryAttempts,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      recoveryStrategy: this.recoveryStrategy,
      status: this.status,
      resolved: this.resolved,
      resolution: this.resolution,
      metadata: this.metadata
    };
  }
}

// ============== 错误中间件基类 ==============
class ErrorMiddleware {
  constructor(name) {
    this.name = name;
    this.next = null;
  }

  setNext(middleware) {
    this.next = middleware;
    return middleware;
  }

  async handle(error, context) {
    // 子类实现具体的错误处理逻辑
    throw new Error('handle() must be implemented by subclass');
  }

  async _passToNext(error, context) {
    if (this.next) {
      return await this.next.handle(error, context);
    }
    // 如果没有下一个中间件，返回原始错误
    return { handled: false, error, context };
  }
}

// ============== 具体错误中间件实现 ==============

// 1. LLM错误处理中间件 - 借鉴DeerFlow的LLMErrorHandlingMiddleware
class LLMErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('LLMErrorHandling');
    this.retryableErrors = [
      'rate_limit', 'timeout', 'connection',
      'service_unavailable', 'model_overloaded'
    ];
  }

  async handle(error, context) {
    const errorType = this._classifyError(error);
    
    if (errorType !== ERROR_TYPES.LLM_ERROR) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling LLM error: ${error.message}`);

    // 检查是否可重试
    if (this._isRetryable(error)) {
      return {
        handled: true,
        strategy: RECOVERY_STRATEGIES.RETRY_WITH_BACKOFF,
        error,
        context,
        suggestion: 'Retry with exponential backoff'
      };
    }

    // 不可重试的LLM错误，尝试降级
    if (this._hasFallback(context)) {
      return {
        handled: true,
        strategy: RECOVERY_STRATEGIES.FALLBACK,
        error,
        context,
        suggestion: 'Use fallback model'
      };
    }

    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.ESCALATE,
      error,
      context,
      suggestion: 'Escalate to user'
    };
  }

  _classifyError(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('llm') || msg.includes('model') || 
        msg.includes('openai') || msg.includes('api')) {
      return ERROR_TYPES.LLM_ERROR;
    }
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  _isRetryable(error) {
    const msg = (error.message || '').toLowerCase();
    return this.retryableErrors.some(e => msg.includes(e));
  }

  _hasFallback(context) {
    return context.availableModels && context.availableModels.length > 1;
  }
}

// 2. 工具错误处理中间件 - 借鉴DeerFlow的ToolErrorHandlingMiddleware
class ToolErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('ToolErrorHandling');
    this.toolErrorPatterns = [
      { pattern: /permission denied/i, strategy: RECOVERY_STRATEGIES.ABORT },
      { pattern: /not found/i, strategy: RECOVERY_STRATEGIES.SKIP },
      { pattern: /timeout/i, strategy: RECOVERY_STRATEGIES.RETRY },
      { pattern: /invalid/i, strategy: RECOVERY_STRATEGIES.ABORT }
    ];
  }

  async handle(error, context) {
    if (!this._isToolError(error)) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling tool error: ${error.message}`);

    const strategy = this._determineStrategy(error);
    
    return {
      handled: true,
      strategy,
      error,
      context,
      toolName: context.toolName || 'unknown'
    };
  }

  _isToolError(error) {
    return error.context && error.context.toolName;
  }

  _determineStrategy(error) {
    const msg = (error.message || '').toLowerCase();
    for (const { pattern, strategy } of this.toolErrorPatterns) {
      if (pattern.test(msg)) {
        return strategy;
      }
    }
    return RECOVERY_STRATEGIES.RETRY;
  }
}

// 3. 沙箱错误处理中间件 - 借鉴DeerFlow的SandboxAuditMiddleware
class SandboxErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('SandboxErrorHandling');
  }

  async handle(error, context) {
    if (!this._isSandboxError(error)) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling sandbox error: ${error.message}`);

    // 沙箱错误通常是安全问题，返回错误信息
    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.ABORT,
      error,
      context,
      suggestion: 'Sandbox execution failed - possible security issue'
    };
  }

  _isSandboxError(error) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('sandbox') || 
           msg.includes('container') || 
           msg.includes('isolation');
  }
}

// 4. 超时错误处理中间件
class TimeoutErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('TimeoutErrorHandling');
    this.defaultTimeout = 30000; // 30秒
  }

  async handle(error, context) {
    const errorType = this._classifyError(error);
    
    if (errorType !== ERROR_TYPES.TIMEOUT_ERROR) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling timeout error`);

    // 超时错误可以尝试重试
    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.RETRY,
      error,
      context,
      suggestion: 'Retry with extended timeout'
    };
  }

  _classifyError(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return ERROR_TYPES.TIMEOUT_ERROR;
    }
    return ERROR_TYPES.UNKNOWN_ERROR;
  }
}

// 5. 限流错误处理中间件 - 借鉴DeerFlow的RateLimit处理
class RateLimitErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('RateLimitErrorHandling');
    this.backoffMs = 1000;
    this.maxBackoffMs = 30000;
  }

  async handle(error, context) {
    if (!this._isRateLimitError(error)) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling rate limit error`);

    // 计算退避时间
    const backoff = this._calculateBackoff(context);
    
    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.RETRY_WITH_BACKOFF,
      error,
      context,
      backoffMs: backoff,
      suggestion: `Retry after ${backoff}ms backoff`
    };
  }

  _isRateLimitError(error) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('rate limit') || 
           msg.includes('too many requests') ||
           msg.includes('429');
  }

  _calculateBackoff(context) {
    const attempts = context.retryCount || 0;
    const backoff = Math.min(
      this.backoffMs * Math.pow(2, attempts),
      this.maxBackoffMs
    );
    return backoff;
  }
}

// 6. 验证错误处理中间件
class ValidationErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('ValidationErrorHandling');
  }

  async handle(error, context) {
    if (!this._isValidationError(error)) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling validation error: ${error.message}`);

    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.ABORT,
      error,
      context,
      suggestion: 'Fix input validation'
    };
  }

  _isValidationError(error) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('validation') || 
           msg.includes('invalid') ||
           msg.includes('schema');
  }
}

// 7. 网络错误处理中间件
class NetworkErrorHandlingMiddleware extends ErrorMiddleware {
  constructor() {
    super('NetworkErrorHandling');
  }

  async handle(error, context) {
    if (!this._isNetworkError(error)) {
      return this._passToNext(error, context);
    }

    console.log(`[${this.name}] Handling network error`);

    return {
      handled: true,
      strategy: RECOVERY_STRATEGIES.RETRY,
      error,
      context,
      suggestion: 'Retry network request'
    };
  }

  _isNetworkError(error) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('network') || 
           msg.includes('connection') ||
           msg.includes('econnrefused') ||
           msg.includes('enetunreach');
  }
}

// 8. 日志记录中间件 - 借鉴DeerFlow的审计日志
class AuditLoggingMiddleware extends ErrorMiddleware {
  constructor(logger) {
    super('AuditLogging');
    this.logger = logger || console;
  }

  async handle(error, context) {
    // 记录错误日志
    this.logger.error('[Audit]', {
      error: error.message,
      type: error.type || ERROR_TYPES.UNKNOWN_ERROR,
      severity: error.severity || ERROR_SEVERITY.MEDIUM,
      context: {
        taskId: context.taskId,
        toolName: context.toolName,
        timestamp: new Date().toISOString()
      }
    });

    // 继续传递给下一个中间件
    return this._passToNext(error, context);
  }
}

// ============== 错误处理链管理器 ==============
class ErrorHandlerChain extends EventEmitter {
  constructor(options = {}) {
    super();
    this.middlewares = [];
    this.errorLog = [];
    this.options = options;
    this._buildChain();
  }

  _buildChain() {
    // 借鉴DeerFlow的中间件链构建方式
    // 按顺序添加中间件
    
    const auditLogging = new AuditLoggingMiddleware(this.options.logger);
    
    const llmError = new LLMErrorHandlingMiddleware();
    const toolError = new ToolErrorHandlingMiddleware();
    const sandboxError = new SandboxErrorHandlingMiddleware();
    const timeoutError = new TimeoutErrorHandlingMiddleware();
    const rateLimitError = new RateLimitErrorHandlingMiddleware();
    const validationError = new ValidationErrorHandlingMiddleware();
    const networkError = new NetworkErrorHandlingMiddleware();

    // 构建链: AuditLogging -> LLMError -> ToolError -> SandboxError -> TimeoutError -> RateLimitError -> ValidationError -> NetworkError
    auditLogging.setNext(llmError);
    llmError.setNext(toolError);
    toolError.setNext(sandboxError);
    sandboxError.setNext(timeoutError);
    timeoutError.setNext(rateLimitError);
    rateLimitError.setNext(validationError);
    validationError.setNext(networkError);

    this.firstMiddleware = auditLogging;
  }

  /**
   * 添加自定义中间件
   */
  addMiddleware(middleware) {
    if (this.middlewares.length === 0) {
      this.firstMiddleware = middleware;
    } else {
      this.middlewares[this.middlewares.length - 1].setNext(middleware);
    }
    this.middlewares.push(middleware);
  }

  /**
   * 处理错误 - 借鉴DeerFlow的中间件链调用方式
   */
  async handle(error, context = {}) {
    const errorItem = error instanceof ErrorItem ? 
                      error : 
                      new ErrorItem({
                        type: this._classifyErrorType(error),
                        message: error.message || String(error),
                        cause: error.cause,
                        context
                      });

    this.errorLog.push(errorItem);
    this.emit('error_logged', errorItem);

    try {
      const result = await this.firstMiddleware.handle(errorItem, context);
      
      if (result.handled) {
        this.emit('error_handled', { error: errorItem, result });
        return result;
      } else {
        // 错误未被处理，升级
        this.emit('error_escalated', { error: errorItem, context });
        return {
          handled: false,
          strategy: RECOVERY_STRATEGIES.ESCALATE,
          error: errorItem,
          context,
          suggestion: 'Unhandled error - escalate to user'
        };
      }
    } catch (handlingError) {
      // 处理链本身出错
      console.error('Error in error handling chain:', handlingError);
      return {
        handled: false,
        strategy: RECOVERY_STRATEGIES.ESCALATE,
        error: errorItem,
        context,
        suggestion: 'Error handling chain failed'
      };
    }
  }

  _classifyErrorType(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('llm') || msg.includes('model')) return ERROR_TYPES.LLM_ERROR;
    if (msg.includes('tool')) return ERROR_TYPES.TOOL_ERROR;
    if (msg.includes('sandbox')) return ERROR_TYPES.SANDBOX_ERROR;
    if (msg.includes('timeout')) return ERROR_TYPES.TIMEOUT_ERROR;
    if (msg.includes('rate limit')) return ERROR_TYPES.RATE_LIMIT_ERROR;
    if (msg.includes('validation') || msg.includes('invalid')) return ERROR_TYPES.VALIDATION_ERROR;
    if (msg.includes('network') || msg.includes('connection')) return ERROR_TYPES.NETWORK_ERROR;
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  /**
   * 获取错误日志
   */
  getErrorLog(filters = {}) {
    let logs = [...this.errorLog];
    
    if (filters.type) {
      logs = logs.filter(e => e.type === filters.type);
    }
    if (filters.severity) {
      logs = logs.filter(e => e.severity === filters.severity);
    }
    if (filters.resolved !== undefined) {
      logs = logs.filter(e => e.resolved === filters.resolved);
    }
    if (filters.since) {
      logs = logs.filter(e => e.timestamp >= filters.since);
    }
    
    return logs;
  }

  /**
   * 获取错误统计
   */
  getStatistics() {
    const total = this.errorLog.length;
    const byType = {};
    const bySeverity = {};
    const byStatus = {};
    const resolved = this.errorLog.filter(e => e.resolved).length;

    this.errorLog.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });

    return {
      total,
      resolved,
      unresolved: total - resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      byType,
      bySeverity,
      byStatus
    };
  }
}

// ============== 主错误处理器 ==============
class EnhancedErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.chain = new ErrorHandlerChain(options);
    this.errorLog = [];
    this.options = options;
    
    // 监听链事件
    this.chain.on('error_logged', (error) => this._onErrorLogged(error));
    this.chain.on('error_handled', (data) => this._onErrorHandled(data));
    this.chain.on('error_escalated', (data) => this._onErrorEscalated(data));
  }

  /**
   * 处理错误 - 主入口
   */
  async handle(error, context = {}) {
    const result = await this.chain.handle(error, context);
    
    // 执行恢复策略
    if (result.handled) {
      await this._executeRecovery(result);
    }
    
    return result;
  }

  /**
   * 执行恢复策略
   */
  async _executeRecovery(result) {
    const { strategy, backoffMs, error, context } = result;
    
    switch (strategy) {
      case RECOVERY_STRATEGIES.RETRY:
        if (context.retryCount < (error.maxRecoveryAttempts || 3)) {
          await this._sleep(1000);
          context.retryCount = (context.retryCount || 0) + 1;
          return { action: 'retry', context };
        }
        return { action: 'max_retries_exceeded', error };
        
      case RECOVERY_STRATEGIES.RETRY_WITH_BACKOFF:
        if (context.retryCount < (error.maxRecoveryAttempts || 3)) {
          const delay = backoffMs || 1000;
          await this._sleep(delay);
          context.retryCount = (context.retryCount || 0) + 1;
          return { action: 'retry_with_backoff', delay, context };
        }
        return { action: 'max_retries_exceeded', error };
        
      case RECOVERY_STRATEGIES.FALLBACK:
        return { action: 'fallback', context };
        
      case RECOVERY_STRATEGIES.SKIP:
        return { action: 'skip', context };
        
      case RECOVERY_STRATEGIES.ABORT:
        return { action: 'abort', error };
        
      case RECOVERY_STRATEGIES.ESCALATE:
        return { action: 'escalate', error };
        
      default:
        return { action: 'unknown_strategy', strategy };
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _onErrorLogged(error) {
    this.errorLog.push(error);
    this.emit('error_logged', error);
  }

  _onErrorHandled(data) {
    this.emit('error_handled', data);
  }

  _onErrorEscalated(data) {
    this.emit('error_escalated', data);
  }

  /**
   * 便捷方法：包装异步函数自动错误处理
   */
  wrapAsync(fn, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const context = {
          functionName: fn.name,
          args: options.includeArgs ? args : undefined,
          ...options.context
        };
        const result = await this.handle(error, context);
        if (!result.handled && result.strategy === RECOVERY_STRATEGIES.ESCALATE) {
          throw error; // 重新抛出未处理的错误
        }
        return result;
      }
    };
  }

  /**
   * 获取错误统计
   */
  getStatistics() {
    return this.chain.getStatistics();
  }

  /**
   * 获取错误日志
   */
  getErrorLog(filters) {
    return this.chain.getErrorLog(filters);
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
    this.chain.errorLog = [];
  }
}

// ============== 导出 ==============
module.exports = {
  EnhancedErrorHandler,
  ErrorHandlerChain,
  ErrorMiddleware,
  ErrorItem,
  ERROR_TYPES,
  ERROR_SEVERITY,
  RECOVERY_STRATEGIES,
  // 预构建中间件
  LLMErrorHandlingMiddleware,
  ToolErrorHandlingMiddleware,
  SandboxErrorHandlingMiddleware,
  TimeoutErrorHandlingMiddleware,
  RateLimitErrorHandlingMiddleware,
  ValidationErrorHandlingMiddleware,
  NetworkErrorHandlingMiddleware,
  AuditLoggingMiddleware
};
