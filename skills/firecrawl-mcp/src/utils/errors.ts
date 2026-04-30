/**
 * Firecrawl MCP Error Types
 * 基于官方最佳实践的错误处理设计
 */

/**
 * 错误代码枚举
 */
export enum FirecrawlErrorCode {
  // 网络相关
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_ERROR = 'DNS_ERROR',
  
  // 爬取相关
  SCRAPE_FAILED = 'SCRAPE_FAILED',
  PARSE_FAILED = 'PARSE_FAILED',
  EXTRACT_FAILED = 'EXTRACT_FAILED',
  CRAWL_FAILED = 'CRAWL_FAILED',
  
  // API相关
  API_ERROR = 'API_ERROR',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  
  // 验证相关
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_URL = 'INVALID_URL',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // 资源相关
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
  CONTENT_BLOCKED = 'CONTENT_BLOCKED',
  
  // 工具相关
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  
  // 通用
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Firecrawl MCP 错误类
 */
export class FirecrawlError extends Error {
  public readonly code: FirecrawlErrorCode;
  public readonly statusCode?: number;
  public readonly retryAfter?: number;
  public readonly details?: Record<string, any>;
  
  constructor(
    message: string,
    code: FirecrawlErrorCode = FirecrawlErrorCode.UNKNOWN_ERROR,
    options?: {
      statusCode?: number;
      retryAfter?: number;
      details?: Record<string, any>;
    }
  ) {
    super(message);
    this.name = 'FirecrawlError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryAfter = options?.retryAfter;
    this.details = options?.details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirecrawlError);
    }
  }
  
  /**
   * 判断是否为可重试的错误
   */
  isRetryable(): boolean {
    const retryableCodes = [
      FirecrawlErrorCode.NETWORK_ERROR,
      FirecrawlErrorCode.TIMEOUT,
      FirecrawlErrorCode.API_RATE_LIMIT,
      FirecrawlErrorCode.API_QUOTA_EXCEEDED,
      FirecrawlErrorCode.SCRAPE_FAILED,
      FirecrawlErrorCode.PARSE_FAILED,
    ];
    return retryableCodes.includes(this.code);
  }
  
  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.code) {
      case FirecrawlErrorCode.API_KEY_INVALID:
        return 'API Key 无效。请检查您的 Firecrawl API Key 是否正确。';
      case FirecrawlErrorCode.API_KEY_MISSING:
        return '需要 API Key。请提供有效的 Firecrawl API Key。';
      case FirecrawlErrorCode.API_RATE_LIMIT:
        return `API 请求次数超限。请等待 ${this.retryAfter || 60} 秒后重试。`;
      case FirecrawlErrorCode.API_QUOTA_EXCEEDED:
        return 'API 配额已用完。请升级您的 Firecrawl 套餐。';
      case FirecrawlErrorCode.INVALID_URL:
        return `无效的 URL: ${this.message}`;
      case FirecrawlErrorCode.CONTENT_BLOCKED:
        return '内容被阻止访问。可能需要认证或被防火墙拦截。';
      case FirecrawlErrorCode.PAGE_NOT_FOUND:
        return '页面未找到 (404)。';
      case FirecrawlErrorCode.NETWORK_ERROR:
        return '网络错误。请检查您的网络连接。';
      case FirecrawlErrorCode.TIMEOUT:
        return '请求超时。请稍后重试。';
      default:
        return this.message;
    }
  }
  
  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryAfter: this.retryAfter,
      details: this.details,
      isRetryable: this.isRetryable(),
      userMessage: this.getUserMessage(),
    };
  }
}

/**
 * 创建常见错误的工厂函数
 */
export const firecrawlErrors = {
  network: (message: string, details?: Record<string, any>) =>
    new FirecrawlError(message, FirecrawlErrorCode.NETWORK_ERROR, { details }),
  
  timeout: (message: string = 'Request timed out') =>
    new FirecrawlError(message, FirecrawlErrorCode.TIMEOUT),
  
  apiKeyInvalid: () =>
    new FirecrawlError('API Key is invalid', FirecrawlErrorCode.API_KEY_INVALID),
  
  apiKeyMissing: () =>
    new FirecrawlError('API Key is required', FirecrawlErrorCode.API_KEY_MISSING),
  
  apiRateLimit: (retryAfter?: number) =>
    new FirecrawlError('API rate limit exceeded', FirecrawlErrorCode.API_RATE_LIMIT, { retryAfter }),
  
  apiQuotaExceeded: () =>
    new FirecrawlError('API quota exceeded', FirecrawlErrorCode.API_QUOTA_EXCEEDED),
  
  invalidUrl: (url: string) =>
    new FirecrawlError(`Invalid URL: ${url}`, FirecrawlErrorCode.INVALID_URL, { details: { url } }),
  
  scrapeFailed: (url: string, reason?: string) =>
    new FirecrawlError(`Failed to scrape ${url}${reason ? `: ${reason}` : ''}`, FirecrawlErrorCode.SCRAPE_FAILED, { details: { url, reason } }),
  
  parseFailed: (reason?: string) =>
    new FirecrawlError(`Failed to parse content${reason ? `: ${reason}` : ''}`, FirecrawlErrorCode.PARSE_FAILED),
  
  extractFailed: (reason?: string) =>
    new FirecrawlError(`Failed to extract content${reason ? `: ${reason}` : ''}`, FirecrawlErrorCode.EXTRACT_FAILED),
  
  crawlFailed: (url: string, reason?: string) =>
    new FirecrawlError(`Failed to crawl ${url}${reason ? `: ${reason}` : ''}`, FirecrawlErrorCode.CRAWL_FAILED, { details: { url, reason } }),
  
  contentBlocked: (url: string) =>
    new FirecrawlError(`Content blocked: ${url}`, FirecrawlErrorCode.CONTENT_BLOCKED, { details: { url } }),
  
  pageNotFound: (url: string) =>
    new FirecrawlError(`Page not found: ${url}`, FirecrawlErrorCode.PAGE_NOT_FOUND, { details: { url } }),
  
  toolNotFound: (toolName: string) =>
    new FirecrawlError(`Tool not found: ${toolName}`, FirecrawlErrorCode.TOOL_NOT_FOUND, { details: { toolName } }),
  
  toolExecutionFailed: (toolName: string, reason: string) =>
    new FirecrawlError(`Tool execution failed: ${toolName}`, FirecrawlErrorCode.TOOL_EXECUTION_FAILED, { details: { toolName, reason } }),
};

/**
 * 从 Axios 错误创建 FirecrawlError
 */
export function createErrorFromAxios(error: any): FirecrawlError {
  const response = error.response;
  const status = response?.status;
  const data = response?.data;
  
  const message = data?.error || data?.message || error.message || 'Unknown error';
  
  if (status === 401 || status === 403) {
    if (message.includes('invalid') || message.includes('Invalid')) {
      return firecrawlErrors.apiKeyInvalid();
    }
  }
  
  if (status === 429) {
    const retryAfter = parseInt(response?.headers?.['retry-after'] || '60', 10);
    return firecrawlErrors.apiRateLimit(retryAfter);
  }
  
  if (status === 402) {
    return firecrawlErrors.apiQuotaExceeded();
  }
  
  if (status === 404) {
    return firecrawlErrors.pageNotFound(error.config?.url || 'unknown');
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return firecrawlErrors.network(`Connection failed: ${error.code}`, { code: error.code });
  }
  
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return firecrawlErrors.timeout(`Request timed out: ${error.code}`);
  }
  
  return new FirecrawlError(message, FirecrawlErrorCode.UNKNOWN_ERROR, {
    statusCode: status,
    details: { originalError: error.message },
  });
}
