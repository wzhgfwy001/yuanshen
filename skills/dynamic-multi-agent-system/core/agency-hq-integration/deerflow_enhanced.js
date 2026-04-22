/**
 * DeerFlow增强版Agency HQ集成
 * 
 * 借鉴DeerFlow的设计：
 * 1. HQ通信协议
 * 2. 任务同步
 * 3. 状态管理
 * 4. 健康检查
 */

const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');

// ============== HQ连接状态 ==============
const HQ_CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// ============== AgencyHQIntegration 主类 ==============
class AgencyHQIntegration extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      hqUrl: config.hqUrl || 'http://localhost:8080',
      apiKey: config.apiKey || null,
      reconnectInterval: config.reconnectInterval || 5000,
      healthCheckInterval: config.healthCheckInterval || 30000,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      ...config
    };

    this.state = HQ_CONNECTION_STATES.DISCONNECTED;
    this.connectionId = null;
    this.lastHealthCheck = null;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0
    };

    if (this.config.healthCheckInterval > 0) {
      this._startHealthCheck();
    }
  }

  /**
   * 连接到HQ
   */
  async connect() {
    this._setState(HQ_CONNECTION_STATES.CONNECTING);

    try {
      const response = await this._request('POST', '/api/connect', {
        clientId: this.config.clientId,
        capabilities: this.config.capabilities || ['task-execution', 'reporting']
      });

      this.connectionId = response.connectionId;
      this._setState(HQ_CONNECTION_STATES.CONNECTED);
      
      this.emit('connected', { connectionId: this.connectionId });
      
      return response;

    } catch (error) {
      this._setState(HQ_CONNECTION_STATES.ERROR);
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect() {
    if (this.state !== HQ_CONNECTION_STATES.CONNECTED) {
      return;
    }

    try {
      await this._request('POST', '/api/disconnect', {
        connectionId: this.connectionId
      });
    } catch (error) {
      // 忽略断开错误
    }

    this.connectionId = null;
    this._setState(HQ_CONNECTION_STATES.DISCONNECTED);
    this.emit('disconnected');
  }

  /**
   * 发送任务更新
   */
  async reportTaskUpdate(taskId, status, data = {}) {
    return await this._request('POST', '/api/tasks/update', {
      connectionId: this.connectionId,
      taskId,
      status,
      ...data
    });
  }

  /**
   * 请求新任务
   */
  async fetchTask(options = {}) {
    return await this._request('POST', '/api/tasks/fetch', {
      connectionId: this.connectionId,
      ...options
    });
  }

  /**
   * 提交任务结果
   */
  async submitResult(taskId, result) {
    return await this._request('POST', '/api/tasks/submit', {
      connectionId: this.connectionId,
      taskId,
      result
    });
  }

  /**
   * 获取配置更新
   */
  async fetchConfig() {
    return await this._request('GET', '/api/config', {
      connectionId: this.connectionId
    });
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const start = Date.now();
      await this._request('GET', '/api/health');
      const latency = Date.now() - start;
      
      this.lastHealthCheck = {
        status: 'healthy',
        latency,
        timestamp: Date.now()
      };

      this.emit('health_check', this.lastHealthCheck);
      return this.lastHealthCheck;

    } catch (error) {
      this.lastHealthCheck = {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now()
      };

      this.emit('health_check_failed', this.lastHealthCheck);
      return this.lastHealthCheck;
    }
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      state: this.state,
      connectionId: this.connectionId,
      lastHealthCheck: this.lastHealthCheck,
      stats: this.stats
    };
  }

  // ============== 私有方法 ==============

  async _request(method, path, body = null) {
    const startTime = Date.now();
    this.stats.requests++;

    const url = new URL(this.config.hqUrl + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey || '',
        'X-Connection-Id': this.connectionId || ''
      }
    };

    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const latency = Date.now() - startTime;
          this.stats.totalLatency += latency;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.stats.successes++;
            try {
              resolve(JSON.parse(data || '{}'));
            } catch {
              resolve(data);
            }
          } else {
            this.stats.failures++;
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        this.stats.failures++;
        reject(error);
      });

      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  _setState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      this.emit('state_changed', { from: oldState, to: newState });
    }
  }

  _startHealthCheck() {
    this._healthCheckTimer = setInterval(() => {
      if (this.state === HQ_CONNECTION_STATES.CONNECTED) {
        this.healthCheck();
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 关闭
   */
  shutdown() {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
    }
    this.disconnect();
  }
}

// ============== 导出 ==============
module.exports = {
  AgencyHQIntegration,
  HQ_CONNECTION_STATES
};
