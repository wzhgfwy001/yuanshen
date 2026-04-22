/**
 * DeerFlow增强版模型选择器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 动态模型路由 - 根据任务类型选择最佳模型
 * 2. 成本控制 - 预算和token限制
 * 3. 负载均衡 - 多模型分发
 * 4. 故障转移 - 自动切换备用模型
 */

const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const MODEL_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  RATE_LIMITED: 'rate_limited',
  ERROR: 'error',
  DISABLED: 'disabled'
};

const SELECTION_STRATEGIES = {
  ROUND_ROBIN: 'round_robin',
  LEAST_LOADED: 'least_loaded',
  COST_OPTIMIZED: 'cost_optimized',
  LATENCY_OPTIMIZED: 'latency_optimized',
  QUALITY_OPTIMIZED: 'quality_optimized'
};

const MODEL_EVENTS = {
  MODEL_SELECTED: 'model_selected',
  MODEL_SWITCHED: 'model_switched',
  MODEL_FAILED: 'model_failed',
  MODEL_RECOVERED: 'model_recovered',
  BUDGET_EXCEEDED: 'budget_exceeded',
  RATE_LIMITED: 'rate_limited'
};

// ============== ModelConfig 类 ==============
class ModelConfig {
  constructor(config) {
    this.name = config.name;
    this.provider = config.provider || 'unknown';
    this.modelId = config.modelId;
    this.maxTokens = config.maxTokens || 4096;
    this.costPer1KInput = config.costPer1KInput || 0;
    this.costPer1KOutput = config.costPer1KOutput || 0;
    this.latencyMs = config.latencyMs || 1000;
    this.qualityScore = config.qualityScore || 0.5;
    this.capabilities = config.capabilities || [];
    this.status = MODEL_STATUS.AVAILABLE;
    this.currentLoad = 0;
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.avgLatency = 0;
    this.rateLimit = config.rateLimit || null;
    this.rateLimitWindow = config.rateLimitWindow || 60000;
    this.requestHistory = [];
  }

  /**
   * 计算成本
   */
  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * this.costPer1KInput;
    const outputCost = (outputTokens / 1000) * this.costPer1KOutput;
    return inputCost + outputCost;
  }

  /**
   * 检查速率限制
   */
  checkRateLimit() {
    if (!this.rateLimit) return true;
    
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    // 清理历史
    this.requestHistory = this.requestHistory.filter(t => t > windowStart);
    
    return this.requestHistory.length < this.rateLimit;
  }

  /**
   * 记录请求
   */
  recordRequest(success = true, latencyMs = null) {
    this.totalRequests++;
    this.requestHistory.push(Date.now());
    
    if (!success) {
      this.failedRequests++;
    }
    
    if (latencyMs !== null) {
      // 移动平均
      this.avgLatency = this.avgLatency === 0 
        ? latencyMs 
        : (this.avgLatency * 0.7 + latencyMs * 0.3);
    }
    
    this.updateStatus();
  }

  /**
   * 更新状态
   */
  updateStatus() {
    if (this.status === MODEL_STATUS.DISABLED) return;
    
    const errorRate = this.totalRequests > 0 
      ? this.failedRequests / this.totalRequests 
      : 0;
    
    if (errorRate > 0.5) {
      this.status = MODEL_STATUS.ERROR;
    } else if (!this.checkRateLimit()) {
      this.status = MODEL_STATUS.RATE_LIMITED;
    } else if (this.currentLoad > 10) {
      this.status = MODEL_STATUS.BUSY;
    } else {
      this.status = MODEL_STATUS.AVAILABLE;
    }
  }

  /**
   * 获取元数据
   */
  toJSON() {
    return {
      name: this.name,
      provider: this.provider,
      modelId: this.modelId,
      status: this.status,
      currentLoad: this.currentLoad,
      avgLatency: this.avgLatency,
      errorRate: this.totalRequests > 0 
        ? this.failedRequests / this.totalRequests 
        : 0,
      capabilities: this.capabilities
    };
  }
}

// ============== BudgetController 类 ==============
class BudgetController extends EventEmitter {
  constructor(config = {}) {
    super();
    this.maxBudget = config.maxBudget || 100;
    this.maxTokensPerDay = config.maxTokensPerDay || 100000;
    this.budgetUsed = 0;
    this.tokensUsed = 0;
    this.dailyResetTime = this._getNextDailyReset();
    this.alerts = [];
  }

  /**
   * 检查是否可以执行
   */
  canExecute(estimatedCost, estimatedTokens) {
    // 重置每日计数
    if (Date.now() > this.dailyResetTime) {
      this.tokensUsed = 0;
      this.dailyResetTime = this._getNextDailyReset();
    }
    
    if (this.budgetUsed + estimatedCost > this.maxBudget) {
      this.emit(MODEL_EVENTS.BUDGET_EXCEEDED, {
        type: 'budget',
        current: this.budgetUsed,
        requested: estimatedCost,
        limit: this.maxBudget
      });
      return false;
    }
    
    if (this.tokensUsed + estimatedTokens > this.maxTokensPerDay) {
      this.emit(MODEL_EVENTS.BUDGET_EXCEEDED, {
        type: 'tokens',
        current: this.tokensUsed,
        requested: estimatedTokens,
        limit: this.maxTokensPerDay
      });
      return false;
    }
    
    return true;
  }

  /**
   * 记录使用
   */
  recordUsage(cost, tokens) {
    this.budgetUsed += cost;
    this.tokensUsed += tokens;
  }

  /**
   * 获取剩余预算
   */
  getRemaining() {
    return {
      budget: this.maxBudget - this.budgetUsed,
      tokens: this.maxTokensPerDay - this.tokensUsed,
      budgetPercent: ((this.maxBudget - this.budgetUsed) / this.maxBudget) * 100,
      tokensPercent: ((this.maxTokensPerDay - this.tokensUsed) / this.maxTokensPerDay) * 100
    };
  }

  /**
   * 重置
   */
  reset() {
    this.budgetUsed = 0;
    this.tokensUsed = 0;
    this.dailyResetTime = this._getNextDailyReset();
  }

  _getNextDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }
}

// ============== ModelSelector 主类 ==============
class ModelSelector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.models = new Map();
    this.budgetController = new BudgetController({
      maxBudget: config.maxBudget,
      maxTokensPerDay: config.maxTokensPerDay
    });
    this.strategy = config.strategy || SELECTION_STRATEGIES.COST_OPTIMIZED;
    this.fallbackModels = new Map();
    this.roundRobinIndex = new Map();
  }

  /**
   * 注册模型
   */
  registerModel(config) {
    const model = new ModelConfig(config);
    this.models.set(config.name, model);
    this.roundRobinIndex.set(config.name, 0);
    
    // 设置备用模型
    if (config.fallback) {
      this.fallbackModels.set(config.name, config.fallback);
    }
    
    this.emit('model_registered', model.toJSON());
    return model;
  }

  /**
   * 批量注册模型
   */
  registerModels(modelConfigs) {
    return modelConfigs.map(config => this.registerModel(config));
  }

  /**
   * 选择最佳模型
   */
  selectModel(context = {}) {
    const {
      taskType = 'general',
      requiredCapabilities = [],
      maxCost = null,
      maxLatency = null,
      qualityWeight = 0.5,
      costWeight = 0.3,
      latencyWeight = 0.2
    } = context;
    
    // 获取候选模型
    let candidates = Array.from(this.models.values())
      .filter(m => m.status === MODEL_STATUS.AVAILABLE);
    
    // 按任务类型筛选
    if (taskType !== 'general') {
      candidates = candidates.filter(m => 
        m.capabilities.includes(taskType) || 
        m.capabilities.includes('general')
      );
    }
    
    // 按能力筛选
    if (requiredCapabilities.length > 0) {
      candidates = candidates.filter(m =>
        requiredCapabilities.every(cap => m.capabilities.includes(cap))
      );
    }
    
    // 按成本筛选
    if (maxCost !== null) {
      candidates = candidates.filter(m => m.costPer1KInput <= maxCost);
    }
    
    // 按延迟筛选
    if (maxLatency !== null) {
      candidates = candidates.filter(m => m.avgLatency <= maxLatency);
    }
    
    if (candidates.length === 0) {
      // 尝试使用备用模型
      return this._selectFallback(context);
    }
    
    // 根据策略选择
    let selected;
    
    switch (this.strategy) {
      case SELECTION_STRATEGIES.ROUND_ROBIN:
        selected = this._selectRoundRobin(candidates);
        break;
      case SELECTION_STRATEGIES.LEAST_LOADED:
        selected = candidates.sort((a, b) => a.currentLoad - b.currentLoad)[0];
        break;
      case SELECTION_STRATEGIES.COST_OPTIMIZED:
        selected = candidates.sort((a, b) => 
          (a.costPer1KInput + a.costPer1KOutput) - 
          (b.costPer1KInput + b.costPer1KOutput)
        )[0];
        break;
      case SELECTION_STRATEGIES.LATENCY_OPTIMIZED:
        selected = candidates.sort((a, b) => a.avgLatency - b.avgLatency)[0];
        break;
      case SELECTION_STRATEGIES.QUALITY_OPTIMIZED:
        selected = candidates.sort((a, b) => b.qualityScore - a.qualityScore)[0];
        break;
      default:
        // 综合评分
        selected = this._selectByScore(candidates, {
          qualityWeight,
          costWeight,
          latencyWeight
        });
    }
    
    selected.currentLoad++;
    
    this.emit(MODEL_EVENTS.MODEL_SELECTED, {
      model: selected.toJSON(),
      strategy: this.strategy,
      context
    });
    
    return selected;
  }

  /**
   * 综合评分选择
   */
  _selectByScore(candidates, weights) {
    const scored = candidates.map(m => {
      // 归一化分数
      const maxCost = Math.max(...candidates.map(c => c.costPer1KInput + c.costPer1KOutput));
      const maxLatency = Math.max(...candidates.map(c => c.avgLatency));
      
      const costScore = 1 - ((m.costPer1KInput + m.costPer1KOutput) / maxCost);
      const latencyScore = 1 - (m.avgLatency / maxLatency);
      const qualityScore = m.qualityScore;
      
      const totalScore = 
        qualityScore * weights.qualityWeight +
        costScore * weights.costWeight +
        latencyScore * weights.latencyWeight;
      
      return { model: m, score: totalScore };
    });
    
    return scored.sort((a, b) => b.score - a.score)[0].model;
  }

  /**
   * 轮询选择
   */
  _selectRoundRobin(candidates) {
    const modelName = candidates[0].name;
    const index = this.roundRobinIndex.get(modelName) || 0;
    const selected = candidates[index % candidates.length];
    this.roundRobinIndex.set(modelName, index + 1);
    return selected;
  }

  /**
   * 选择备用模型
   */
  _selectFallback(context) {
    // 尝试任何可用的模型
    const available = Array.from(this.models.values())
      .filter(m => m.status !== MODEL_STATUS.DISABLED);
    
    if (available.length > 0) {
      const fallback = available[0];
      fallback.currentLoad++;
      this.emit(MODEL_EVENTS.MODEL_SWITCHED, {
        original: null,
        fallback: fallback.toJSON(),
        reason: 'no_candidates'
      });
      return fallback;
    }
    
    return null;
  }

  /**
   * 记录模型结果
   */
  recordResult(modelName, success, latencyMs = null, error = null) {
    const model = this.models.get(modelName);
    if (!model) return;
    
    model.currentLoad = Math.max(0, model.currentLoad - 1);
    model.recordRequest(success, latencyMs);
    
    if (success) {
      this.emit(MODEL_EVENTS.MODEL_RECOVERED, { model: model.toJSON() });
    } else {
      this.emit(MODEL_EVENTS.MODEL_FAILED, {
        model: model.toJSON(),
        error
      });
      
      // 检查是否需要自动切换
      if (model.failedRequests > 3) {
        this._handleModelFailure(model);
      }
    }
  }

  /**
   * 处理模型故障
   */
  _handleModelFailure(model) {
    const fallbackName = this.fallbackModels.get(model.name);
    
    if (fallbackName) {
      const fallback = this.models.get(fallbackName);
      if (fallback && fallback.status === MODEL_STATUS.AVAILABLE) {
        this.emit(MODEL_EVENTS.MODEL_SWITCHED, {
          original: model.name,
          fallback: fallbackName,
          reason: 'failure'
        });
      }
    }
  }

  /**
   * 执行带自动重试的请求
   */
  async executeWithRetry(context, executeFn, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallbackEnabled = true
    } = options;
    
    let lastError = null;
    const triedModels = new Set();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const model = this.selectModel(context);
      
      if (!model) {
        throw new Error('No available models');
      }
      
      if (triedModels.has(model.name)) {
        continue; // 避免重复尝试同一个模型
      }
      triedModels.add(model.name);
      
      try {
        const result = await executeFn(model);
        this.recordResult(model.name, true, result.latencyMs);
        return result;
      } catch (error) {
        lastError = error;
        this.recordResult(model.name, false, null, error.message);
        
        if (attempt < maxRetries - 1) {
          await this._delay(retryDelay * (attempt + 1));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 获取模型状态
   */
  getModelStatus(name = null) {
    if (name) {
      const model = this.models.get(name);
      return model ? model.toJSON() : null;
    }
    
    return Array.from(this.models.values()).map(m => m.toJSON());
  }

  /**
   * 获取选择器统计
   */
  getStatistics() {
    const models = Array.from(this.models.values());
    
    return {
      totalModels: models.length,
      availableModels: models.filter(m => m.status === MODEL_STATUS.AVAILABLE).length,
      totalRequests: models.reduce((sum, m) => sum + m.totalRequests, 0),
      totalFailures: models.reduce((sum, m) => sum + m.failedRequests, 0),
      budgetStatus: this.budgetController.getRemaining(),
      byModel: models.map(m => ({
        name: m.name,
        status: m.status,
        load: m.currentLoad,
        errorRate: m.totalRequests > 0 ? m.failedRequests / m.totalRequests : 0,
        avgLatency: m.avgLatency
      }))
    };
  }

  /**
   * 禁用模型
   */
  disableModel(name) {
    const model = this.models.get(name);
    if (model) {
      model.status = MODEL_STATUS.DISABLED;
      this.emit('model_disabled', { model: model.toJSON() });
    }
  }

  /**
   * 启用模型
   */
  enableModel(name) {
    const model = this.models.get(name);
    if (model) {
      model.status = MODEL_STATUS.AVAILABLE;
      model.failedRequests = 0;
      this.emit('model_enabled', { model: model.toJSON() });
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 导出 ==============
module.exports = {
  ModelSelector,
  ModelConfig,
  BudgetController,
  MODEL_STATUS,
  SELECTION_STRATEGIES,
  MODEL_EVENTS
};
