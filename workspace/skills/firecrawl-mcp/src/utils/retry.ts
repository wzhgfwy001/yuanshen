/**
 * Firecrawl MCP Retry Utility
 * 带指数退避的重试机制
 */

import { FirecrawlError, FirecrawlErrorCode } from './errors';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: FirecrawlErrorCode[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  retryableErrors: [
    FirecrawlErrorCode.NETWORK_ERROR,
    FirecrawlErrorCode.TIMEOUT,
    FirecrawlErrorCode.API_RATE_LIMIT,
    FirecrawlErrorCode.SCRAPE_FAILED,
    FirecrawlErrorCode.PARSE_FAILED,
  ],
};

/**
 * 计算延迟时间 (指数退避 + 随机抖动)
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffFactor, attempt),
    config.maxDelayMs
  );
  
  // 添加随机抖动 (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * 检查错误是否可重试
 */
export function isRetryableError(
  error: any,
  config: RetryConfig
): boolean {
  if (error instanceof FirecrawlError) {
    return error.isRetryable();
  }
  
  // 网络错误可重试
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // 429 Too Many Requests 可重试
  if (error.statusCode === 429) {
    return true;
  }
  
  return false;
}

/**
 * 带重试的函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: any, delay: number) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= finalConfig.maxRetries || !isRetryableError(error, finalConfig)) {
        throw error;
      }
      
      const delay = calculateBackoffDelay(attempt, finalConfig);
      
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 速率限制器
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  
  constructor(maxTokensPerMinute: number) {
    this.maxTokens = maxTokensPerMinute;
    this.tokens = maxTokensPerMinute;
    this.refillRate = maxTokensPerMinute / (60 * 1000);
    this.lastRefill = Date.now();
  }
  
  /**
   * 获取一个 token，如果达到限制则等待
   */
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
    await sleep(waitTime);
    
    this.refill();
    this.tokens -= 1;
  }
  
  /**
   * 补充 token
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * 爬取选项配置
 */
export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  delayBetweenRequests: number;
  timeout: number;
}

/**
 * 默认爬取选项
 */
export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxDepth: 2,
  maxPages: 100,
  respectRobotsTxt: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  delayBetweenRequests: 1000,
  timeout: 60000,
};
