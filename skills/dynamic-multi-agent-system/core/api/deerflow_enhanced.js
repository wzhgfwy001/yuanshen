/**
 * DeerFlow增强版API集成
 * 
 * 借鉴DeerFlow的设计：
 * 1. 统一API接口
 * 2. 请求/响应拦截
 * 3. 错误处理
 * 4. 速率限制
 */

const { EventEmitter } = require('events');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============== API客户端 ==============
class APIClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      baseURL: config.baseURL || '',
      apiKey: config.apiKey || null,
      authToken: config.authToken || null,
      timeout: config.timeout || 30000,
      retries: config.retries || 0,
      retryDelay: config.retryDelay || 1000,
      rateLimit: config.rateLimit || null,
      rateLimitWindow: config.rateLimitWindow || 60000,
      ...config
    };

    this.requestHistory = [];
    this.rateLimiter = null;
  }

  /**
   * GET请求
   */
  async get(path, params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${path}?${query}` : path;
    return this.request('GET', url, null, options);
  }

  /**
   * POST请求
   */
  async post(path, data = null, options = {}) {
    return this.request('POST', path, data, options);
  }

  /**
   * PUT请求
   */
  async put(path, data = null, options = {}) {
    return this.request('PUT', path, data, options);
  }

  /**
   * DELETE请求
   */
  async delete(path, options = {}) {
    return this.request('DELETE', path, null, options);
  }

  /**
   * 通用请求
   */
  async request(method, path, data = null, options = {}) {
    const url = this.config.baseURL + path;
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeerFlow-Client/1.0',
        ...options.headers
      }
    };

    // 添加认证
    if (this.config.apiKey) {
      requestOptions.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.authToken) {
      requestOptions.headers['X-Auth-Token'] = this.config.authToken;
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    // 速率限制检查
    if (this.config.rateLimit) {
      if (!this._checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }
    }

    // 重试逻辑
    let lastError;
    const maxRetries = options.retries !== undefined ? options.retries : this.config.retries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this._makeRequest(client, requestOptions, data);
        
        this.requestHistory.push({
          method,
          path,
          status: result.status,
          timestamp: Date.now()
        });

        return result;

      } catch (error) {
        lastError = error;

        if (attempt < maxRetries && this._shouldRetry(error)) {
          await this._delay(this.config.retryDelay * Math.pow(2, attempt));
          continue;
        }

        this.emit('request_failed', { method, path, error: error.message });
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 发送请求
   */
  _makeRequest(client, options, data) {
    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let body = '';
        
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                status: res.statusCode,
                data: parsed,
                headers: res.headers
              });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
            }
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: body,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  /**
   * 检查速率限制
   */
  _checkRateLimit() {
    if (!this.rateLimiter) {
      this.rateLimiter = [];
    }

    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;

    // 清理过期记录
    this.rateLimiter = this.rateLimiter.filter(t => t > windowStart);

    if (this.rateLimiter.length >= this.config.rateLimit) {
      return false;
    }

    this.rateLimiter.push(now);
    return true;
  }

  /**
   * 是否应该重试
   */
  _shouldRetry(error) {
    const message = error.message || '';
    return (
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    );
  }

  /**
   * 延迟
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取请求历史
   */
  getHistory(limit = 100) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * 获取统计
   */
  getStats() {
    const recent = this.requestHistory.filter(r => 
      Date.now() - r.timestamp < 60000
    );

    return {
      totalRequests: this.requestHistory.length,
      recentRequests: recent.length,
      successRate: recent.length > 0 
        ? ((recent.filter(r => r.status < 400).length / recent.length) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

// ============== API路由 ==============
class APIRouter extends EventEmitter {
  constructor() {
    super();
    this.routes = new Map();
    this.middlewares = [];
  }

  /**
   * 添加路由
   */
  addRoute(method, path, handler, options = {}) {
    const key = `${method}:${path}`;
    this.routes.set(key, {
      method,
      path,
      handler,
      middlewares: options.middlewares || [],
      metadata: options.metadata || {}
    });
    return this;
  }

  /**
   * GET路由
   */
  get(path, handler, options = {}) {
    return this.addRoute('GET', path, handler, options);
  }

  /**
   * POST路由
   */
  post(path, handler, options = {}) {
    return this.addRoute('POST', path, handler, options);
  }

  /**
   * 使用中间件
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * 处理请求
   */
  async handle(method, path, context = {}) {
    const key = `${method}:${path}`;
    const route = this.routes.get(key);

    if (!route) {
      throw new Error(`Route not found: ${method} ${path}`);
    }

    let index = 0;
    const middlewares = [...this.middlewares, ...route.middlewares];

    const next = async () => {
      if (index >= middlewares.length) {
        return route.handler(context);
      }
      const middleware = middlewares[index++];
      return middleware(context, next);
    };

    return next();
  }
}

// ============== 导出 ==============
module.exports = {
  APIClient,
  APIRouter
};
