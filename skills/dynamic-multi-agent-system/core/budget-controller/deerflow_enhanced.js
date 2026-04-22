/**
 * DeerFlow增强版预算控制器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多维度预算跟踪
 * 2. 实时预警系统
 * 3. 智能配额管理
 * 4. 成本分析和报告
 */

const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const BUDGET_EVENTS = {
  THRESHOLD_WARNING: 'threshold_warning',
  THRESHOLD_CRITICAL: 'threshold_critical',
  BUDGET_EXCEEDED: 'budget_exceeded',
  ALLOCATION_UPDATED: 'allocation_updated',
  RESET_TRIGGERED: 'reset_triggered'
};

const BUDGET_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EXCEEDED: 'exceeded'
};

// ============== BudgetAllocation 类 ==============
class BudgetAllocation extends EventEmitter {
  constructor(name, limit, options = {}) {
    super();
    this.name = name;
    this.limit = limit;
    this.used = 0;
    this.warningThreshold = options.warningThreshold || 0.8;
    this.criticalThreshold = options.criticalThreshold || 0.95;
    this.resetPolicy = options.resetPolicy || 'never';
    this.resetInterval = options.resetInterval || 86400000; // 24小时
    this.lastReset = Date.now();
    this.history = [];
    this.tags = options.tags || {};
  }

  /**
   * 使用预算
   */
  spend(amount, metadata = {}) {
    if (this.used + amount > this.limit) {
      this.emit(BUDGET_EVENTS.BUDGET_EXCEEDED, {
        name: this.name,
        requested: amount,
        available: this.limit - this.used,
        limit: this.limit
      });
      return false;
    }

    this.used += amount;
    
    this.history.push({
      amount,
      timestamp: Date.now(),
      ...metadata
    });

    this._checkThresholds();
    return true;
  }

  /**
   * 释放预算
   */
  release(amount) {
    this.used = Math.max(0, this.used - amount);
  }

  /**
   * 获取剩余
   */
  getRemaining() {
    return Math.max(0, this.limit - this.used);
  }

  /**
   * 获取使用百分比
   */
  getUsagePercent() {
    return (this.used / this.limit) * 100;
  }

  /**
   * 获取状态
   */
  getStatus() {
    const percent = this.getUsagePercent();
    
    if (percent >= 100) return BUDGET_STATUS.EXCEEDED;
    if (percent >= this.criticalThreshold * 100) return BUDGET_STATUS.CRITICAL;
    if (percent >= this.warningThreshold * 100) return BUDGET_STATUS.WARNING;
    return BUDGET_STATUS.NORMAL;
  }

  /**
   * 重置
   */
  reset() {
    this.history.push({
      type: 'reset',
      previousUsed: this.used,
      timestamp: Date.now()
    });
    
    this.used = 0;
    this.lastReset = Date.now();
    
    this.emit(BUDGET_EVENTS.RESET_TRIGGERED, {
      name: this.name,
      previousUsage: this.used
    });
  }

  /**
   * 检查是否需要重置
   */
  checkAutoReset() {
    if (this.resetPolicy !== 'auto') return false;
    
    if (Date.now() - this.lastReset >= this.resetInterval) {
      this.reset();
      return true;
    }
    
    return false;
  }

  _checkThresholds() {
    const percent = this.getUsagePercent();
    
    if (percent >= this.criticalThreshold * 100) {
      this.emit(BUDGET_EVENTS.THRESHOLD_CRITICAL, {
        name: this.name,
        percent,
        remaining: this.getRemaining()
      });
    } else if (percent >= this.warningThreshold * 100) {
      this.emit(BUDGET_EVENTS.THRESHOLD_WARNING, {
        name: this.name,
        percent,
        remaining: this.getRemaining()
      });
    }
  }

  toJSON() {
    return {
      name: this.name,
      limit: this.limit,
      used: this.used,
      remaining: this.getRemaining(),
      usagePercent: this.getUsagePercent(),
      status: this.getStatus(),
      historyLength: this.history.length,
      lastReset: this.lastReset
    };
  }
}

// ============== BudgetController 主类 ==============
class BudgetController extends EventEmitter {
  constructor(config = {}) {
    super();
    this.allocations = new Map();
    this.globalLimit = config.globalLimit || Infinity;
    this.globalUsed = 0;
    this.currency = config.currency || 'USD';
    this.costPerToken = config.costPerToken || {};
    
    // 预定义的预算分配
    this.defaultAllocations = config.defaultAllocations || [];
    this._initializeDefaults();
  }

  /**
   * 创建预算分配
   */
  createAllocation(name, limit, options = {}) {
    const allocation = new BudgetAllocation(name, limit, options);
    
    allocation.on(BUDGET_EVENTS.THRESHOLD_WARNING, (data) => {
      this.emit(BUDGET_EVENTS.THRESHOLD_WARNING, data);
    });
    
    allocation.on(BUDGET_EVENTS.THRESHOLD_CRITICAL, (data) => {
      this.emit(BUDGET_EVENTS.THRESHOLD_CRITICAL, data);
    });
    
    allocation.on(BUDGET_EVENTS.BUDGET_EXCEEDED, (data) => {
      this.emit(BUDGET_EVENTS.BUDGET_EXCEEDED, data);
    });
    
    this.allocations.set(name, allocation);
    return allocation;
  }

  /**
   * 获取预算分配
   */
  getAllocation(name) {
    return this.allocations.get(name) || null;
  }

  /**
   * 删除预算分配
   */
  removeAllocation(name) {
    return this.allocations.delete(name);
  }

  /**
   * 使用预算
   */
  spend(category, amount, metadata = {}) {
    // 检查全局限制
    if (this.globalUsed + amount > this.globalLimit) {
      this.emit(BUDGET_EVENTS.BUDGET_EXCEEDED, {
        category: 'GLOBAL',
        requested: amount,
        available: this.globalLimit - this.globalUsed,
        limit: this.globalLimit
      });
      return false;
    }

    // 获取或创建分配
    let allocation = this.allocations.get(category);
    if (!allocation) {
      allocation = this.createAllocation(category, Infinity);
    }

    const success = allocation.spend(amount, metadata);
    
    if (success) {
      this.globalUsed += amount;
    }
    
    return success;
  }

  /**
   * 释放预算
   */
  release(category, amount) {
    const allocation = this.allocations.get(category);
    if (allocation) {
      allocation.release(amount);
      this.globalUsed = Math.max(0, this.globalUsed - amount);
    }
  }

  /**
   * 计算Token成本
   */
  calculateTokenCost(promptTokens, completionTokens, model = 'default') {
    const rates = this.costPerToken[model] || this.costPerToken.default || {
      input: 0.001,
      output: 0.002
    };
    
    return {
      inputCost: (promptTokens / 1000) * rates.input,
      outputCost: (completionTokens / 1000) * rates.output,
      totalCost: (promptTokens / 1000) * rates.input + 
                 (completionTokens / 1000) * rates.output
    };
  }

  /**
   * 基于Token使用预算
   */
  spendTokens(category, promptTokens, completionTokens, model = 'default', metadata = {}) {
    const cost = this.calculateTokenCost(promptTokens, completionTokens, model);
    
    const success = this.spend(category, cost.totalCost, {
      model,
      promptTokens,
      completionTokens,
      ...metadata
    });
    
    return {
      success,
      cost,
      remaining: this.getGlobalRemaining()
    };
  }

  /**
   * 获取全局剩余
   */
  getGlobalRemaining() {
    return Math.max(0, this.globalLimit - this.globalUsed);
  }

  /**
   * 获取全局使用百分比
   */
  getGlobalUsagePercent() {
    if (this.globalLimit === Infinity) return 0;
    return (this.globalUsed / this.globalLimit) * 100;
  }

  /**
   * 获取所有预算状态
   */
  getAllStatus() {
    const allocations = {};
    let totalLimit = 0;
    let totalUsed = 0;
    
    for (const [name, alloc] of this.allocations) {
      allocations[name] = alloc.toJSON();
      if (alloc.limit !== Infinity) {
        totalLimit += alloc.limit;
        totalUsed += alloc.used;
      }
    }
    
    return {
      global: {
        limit: this.globalLimit,
        used: this.globalUsed,
        remaining: this.getGlobalRemaining(),
        usagePercent: this.getGlobalUsagePercent()
      },
      allocations,
      summary: {
        totalAllocations: this.allocations.size,
        totalLimit,
        totalUsed
      }
    };
  }

  /**
   * 预算警告设置
   */
  setWarningThreshold(category, threshold) {
    const alloc = this.allocations.get(category);
    if (alloc) {
      alloc.warningThreshold = threshold;
    }
  }

  /**
   * 预算限制更新
   */
  updateLimit(category, newLimit) {
    const alloc = this.allocations.get(category);
    if (alloc) {
      alloc.limit = newLimit;
      alloc.emit(BUDGET_EVENTS.ALLOCATION_UPDATED, {
        name: category,
        newLimit
      });
    }
  }

  /**
   * 重置类别预算
   */
  resetCategory(category) {
    const alloc = this.allocations.get(category);
    if (alloc) {
      this.globalUsed -= alloc.used;
      alloc.reset();
    }
  }

  /**
   * 重置所有预算
   */
  resetAll() {
    for (const alloc of this.allocations.values()) {
      alloc.reset();
    }
    this.globalUsed = 0;
  }

  /**
   * 生成成本报告
   */
  generateReport(options = {}) {
    const { period = 'day', category = null } = options;
    
    let allocations = Array.from(this.allocations.entries());
    
    if (category) {
      allocations = allocations.filter(([name]) => name === category);
    }
    
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      currency: this.currency,
      global: {
        limit: this.globalLimit,
        used: this.globalUsed,
        remaining: this.getGlobalRemaining(),
        usagePercent: this.getGlobalUsagePercent()
      },
      byCategory: [],
      summary: {
        totalCost: this.globalUsed,
        avgUsagePercent: 0
      }
    };
    
    let totalUsagePercent = 0;
    
    for (const [name, alloc] of allocations) {
      const usagePercent = alloc.getUsagePercent();
      totalUsagePercent += usagePercent;
      
      report.byCategory.push({
        name,
        limit: alloc.limit,
        used: alloc.used,
        remaining: alloc.getRemaining(),
        usagePercent,
        status: alloc.getStatus(),
        historyLength: alloc.history.length
      });
    }
    
    if (report.byCategory.length > 0) {
      report.summary.avgUsagePercent = totalUsagePercent / report.byCategory.length;
    }
    
    return report;
  }

  _initializeDefaults() {
    for (const config of this.defaultAllocations) {
      this.createAllocation(config.name, config.limit, config.options);
    }
  }
}

// ============== 导出 ==============
module.exports = {
  BudgetController,
  BudgetAllocation,
  BUDGET_EVENTS,
  BUDGET_STATUS
};
