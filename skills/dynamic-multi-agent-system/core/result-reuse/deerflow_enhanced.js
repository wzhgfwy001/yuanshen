/**
 * DeerFlow增强版结果复用系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 相似任务检测
 * 2. 结果复用
 * 3. 部分结果匹配
 * 4. 复用统计分析
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============== 结果模板类 ==============
class ResultTemplate {
  constructor(taskPattern, result, options = {}) {
    this.id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.taskPattern = taskPattern;
    this.result = result;
    this.usageCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.adaptationRules = options.adaptationRules || [];
    this.metadata = options.metadata || {};
    this.createdAt = Date.now();
    this.lastUsed = null;
    this.avgAdaptationTime = 0;
  }

  recordUsage(success) {
    this.usageCount++;
    this.lastUsed = Date.now();
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
  }

  getSuccessRate() {
    return this.usageCount > 0 ? this.successCount / this.usageCount : 0;
  }

  addAdaptationRule(rule) {
    this.adaptationRules.push(rule);
  }
}

// ============== ResultReuse 主类 ==============
class ResultReuse extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.75,
      maxTemplates: config.maxTemplates || 500,
      enablePartialMatch: config.enablePartialMatch !== false,
      adaptationStrategy: config.adaptationStrategy || 'auto',
      ...config
    };

    this.templates = new Map();
    this.patternIndex = new Map();
    this.stats = {
      totalReuseAttempts: 0,
      successfulReuses: 0,
      failedReuses: 0,
      partialReuses: 0,
      templatesCreated: 0
    };
  }

  /**
   * 创建模板
   */
  createTemplate(taskPattern, result, options = {}) {
    const patternKey = this._generatePatternKey(taskPattern);
    
    const template = new ResultTemplate(taskPattern, result, options);
    this.templates.set(template.id, template);
    this.patternIndex.set(patternKey, template.id);

    // 限制模板数量
    if (this.templates.size > this.config.maxTemplates) {
      this._pruneOldTemplates();
    }

    this.stats.templatesCreated++;
    this.emit('template_created', template);

    return template;
  }

  /**
   * 查找可复用的模板
   */
  findReusable(taskPattern, options = {}) {
    const threshold = options.threshold || this.config.similarityThreshold;
    
    this.stats.totalReuseAttempts++;

    // 精确匹配
    const patternKey = this._generatePatternKey(taskPattern);
    if (this.patternIndex.has(patternKey)) {
      const templateId = this.patternIndex.get(patternKey);
      const template = this.templates.get(templateId);
      if (template) {
        template.recordUsage(true);
        this.stats.successfulReuses++;
        this.emit('reused', { templateId, type: 'exact' });
        return { type: 'exact', template, similarity: 1 };
      }
    }

    // 相似匹配
    if (this.config.enablePartialMatch) {
      const candidates = this._findSimilarPatterns(taskPattern);
      
      for (const candidate of candidates) {
        const similarity = this._calculateSimilarity(taskPattern, candidate.taskPattern);
        
        if (similarity >= threshold) {
          const template = this.templates.get(candidate.id);
          if (template) {
            // 检查是否需要适配
            const needsAdaptation = similarity < 1;
            
            if (needsAdaptation && options.skipPartial) {
              continue;
            }

            template.recordUsage(true);
            this.stats.successfulReuses++;
            
            if (needsAdaptation) {
              this.stats.partialReuses++;
              this.emit('reused', { templateId: candidate.id, type: 'partial', similarity });
            } else {
              this.emit('reused', { templateId: candidate.id, type: 'similar', similarity });
            }

            return {
              type: needsAdaptation ? 'partial' : 'similar',
              template,
              similarity,
              adaptationNeeded: needsAdaptation
            };
          }
        }
      }
    }

    this.stats.failedReuses++;
    this.emit('no_reuse_found', { taskPattern });
    return null;
  }

  /**
   * 适配部分匹配的结果
   */
  adaptResult(template, taskPattern, context = {}) {
    if (template.similarity === 1) {
      return template.result;
    }

    const adapted = this._applyAdaptationRules(template, taskPattern, context);
    
    return adapted;
  }

  /**
   * 应用适配规则
   */
  _applyAdaptationRules(template, taskPattern, context) {
    let result = template.result;

    for (const rule of template.adaptationRules) {
      try {
        result = rule(result, taskPattern, context);
      } catch (e) {
        // 规则失败，尝试下一个
        this.emit('adaptation_rule_failed', { rule, error: e.message });
      }
    }

    return result;
  }

  /**
   * 学习新模板
   */
  learnFromExecution(taskPattern, result, options = {}) {
    // 检查是否有类似的模板
    const existing = this.findReusable(taskPattern, { threshold: 0.9 });
    
    if (existing && existing.similarity > 0.95) {
      // 太相似，不需要创建新模板
      return existing.template;
    }

    // 创建新模板
    const template = this.createTemplate(taskPattern, result, options);
    
    // 添加适配规则
    if (options.extractRules && result) {
      const rules = this._extractAdaptationRules(taskPattern, result);
      for (const rule of rules) {
        template.addAdaptationRule(rule);
      }
    }

    return template;
  }

  /**
   * 提取适配规则
   */
  _extractAdaptationRules(taskPattern, result) {
    const rules = [];

    // 如果结果包含日期，添加日期更新规则
    if (result && typeof result === 'object') {
      if (result.date || result.timestamp || result.createdAt) {
        rules.push((res, pattern, ctx) => {
          // 更新日期为当前
          const updated = { ...res };
          if (updated.date) updated.date = new Date().toISOString().split('T')[0];
          if (updated.timestamp) updated.timestamp = Date.now();
          if (updated.createdAt) updated.createdAt = new Date().toISOString();
          return updated;
        });
      }
    }

    return rules;
  }

  /**
   * 生成模式键
   */
  _generatePatternKey(pattern) {
    const normalized = this._normalizePattern(pattern);
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  /**
   * 规范化模式
   */
  _normalizePattern(pattern) {
    if (typeof pattern !== 'object' || pattern === null) {
      return pattern;
    }

    if (Array.isArray(pattern)) {
      return pattern.map(item => this._normalizePattern(item));
    }

    // 移除时间相关字段
    const normalized = {};
    for (const [key, value] of Object.entries(pattern)) {
      if (['timestamp', 'date', 'createdAt', 'updatedAt', 'id'].includes(key)) {
        continue;
      }
      normalized[key] = this._normalizePattern(value);
    }

    return normalized;
  }

  /**
   * 查找相似模式
   */
  _findSimilarPatterns(taskPattern) {
    // 简化实现：返回最近的模板
    return Array.from(this.templates.values())
      .filter(t => t.usageCount > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 20);
  }

  /**
   * 计算相似度
   */
  _calculateSimilarity(a, b) {
    if (a === b) return 1;
    if (typeof a !== typeof b) return 0;
    
    if (typeof a !== 'object') {
      return String(a) === String(b) ? 1 : 0;
    }

    if (a === null || b === null) return a === b ? 1 : 0;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return 0;
      let matches = 0;
      for (let i = 0; i < a.length; i++) {
        matches += this._calculateSimilarity(a[i], b[i]);
      }
      return matches / a.length;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      const allKeys = new Set([...keysA, ...keysB]);
      
      if (allKeys.size === 0) return 1;
      if (keysA.length !== keysB.length) return 0;

      let matches = 0;
      for (const key of keysA) {
        if (keysB.includes(key)) {
          matches += this._calculateSimilarity(a[key], b[key]);
        }
      }
      
      return matches / allKeys.size;
    }

    return 0;
  }

  /**
   * 清理旧模板
   */
  _pruneOldTemplates() {
    const sorted = Array.from(this.templates.values())
      .sort((a, b) => b.lastUsed - a.lastUsed);

    const toRemove = sorted.slice(Math.floor(this.config.maxTemplates * 0.2));
    
    for (const template of toRemove) {
      this.templates.delete(template.id);
      this.emit('template_pruned', { templateId: template.id });
    }
  }

  /**
   * 删除模板
   */
  deleteTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (template) {
      this.templates.delete(templateId);
      this.emit('template_deleted', { templateId });
      return true;
    }
    return false;
  }

  /**
   * 获取模板
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * 列出所有模板
   */
  listTemplates(options = {}) {
    let templates = Array.from(this.templates.values());

    if (options.sortBy === 'usage') {
      templates.sort((a, b) => b.usageCount - a.usageCount);
    } else if (options.sortBy === 'success') {
      templates.sort((a, b) => b.getSuccessRate() - a.getSuccessRate());
    } else {
      templates.sort((a, b) => b.lastUsed - a.lastUsed);
    }

    if (options.limit) {
      templates = templates.slice(0, options.limit);
    }

    return templates.map(t => ({
      id: t.id,
      usageCount: t.usageCount,
      successRate: t.getSuccessRate(),
      lastUsed: t.lastUsed,
      createdAt: t.createdAt,
      adaptationRulesCount: t.adaptationRules.length
    }));
  }

  /**
   * 获取统计
   */
  getStats() {
    const reuseRate = this.stats.totalReuseAttempts > 0
      ? (this.stats.successfulReuses / this.stats.totalReuseAttempts) * 100
      : 0;

    return {
      ...this.stats,
      templatesCount: this.templates.size,
      reuseRate: reuseRate.toFixed(2) + '%',
      avgAdaptationTime: this.stats.partialReuses > 0 
        ? Math.round(this.stats.avgAdaptationTime) + 'ms'
        : 'N/A'
    };
  }
}

// ============== 导出 ==============
module.exports = {
  ResultReuse,
  ResultTemplate
};
