/**
 * DeerFlow增强版技能进化系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 技能使用追踪
 * 2. 成功率分析
 * 3. 自动优化建议
 * 4. 版本演进记录
 */

const { EventEmitter } = require('events');
const fs = require('fs');

// ============== 技能使用记录类 ==============
class SkillUsageRecord {
  constructor(skillName) {
    this.skillName = skillName;
    this.uses = 0;
    this.successes = 0;
    this.failures = 0;
    this.totalDuration = 0;
    this.lastUsed = null;
    this.lastSuccess = null;
    this.lastFailure = null;
    this.errorTypes = new Map();
    this.contexts = [];
  }

  recordSuccess(duration, context = {}) {
    this.uses++;
    this.successes++;
    this.totalDuration += duration;
    this.lastUsed = Date.now();
    this.lastSuccess = Date.now();
    this.contexts.push({ success: true, ...context });
    if (this.contexts.length > 100) this.contexts.shift();
  }

  recordFailure(error, context = {}) {
    this.uses++;
    this.failures++;
    this.lastUsed = Date.now();
    this.lastFailure = Date.now();
    
    const errorType = error?.type || error?.message || 'Unknown';
    this.errorTypes.set(errorType, (this.errorTypes.get(errorType) || 0) + 1);
    this.contexts.push({ success: false, error: errorType, ...context });
    if (this.contexts.length > 100) this.contexts.shift();
  }

  getSuccessRate() {
    return this.uses > 0 ? this.successes / this.uses : 0;
  }

  getAverageDuration() {
    return this.successes > 0 ? this.totalDuration / this.successes : 0;
  }

  toJSON() {
    return {
      skillName: this.skillName,
      uses: this.uses,
      successes: this.successes,
      failures: this.failures,
      successRate: this.getSuccessRate(),
      avgDuration: this.getAverageDuration(),
      lastUsed: this.lastUsed,
      lastSuccess: this.lastSuccess,
      lastFailure: this.lastFailure,
      errorTypes: Object.fromEntries(this.errorTypes),
      recentContexts: this.contexts.slice(-10)
    };
  }
}

// ============== SkillEvolution 主类 ==============
class SkillEvolution extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      successThreshold: config.successThreshold || 0.8,
      minUsesForEvolution: config.minUsesForEvolution || 10,
      maxVersions: config.maxVersions || 5,
      storagePath: config.storagePath || './skill-evolution-data',
      ...config
    };
    
    this.skillRecords = new Map();
    this.skillVersions = new Map();
    this.evolutionHistory = [];
  }

  /**
   * 记录技能使用
   */
  recordUsage(skillName, success, duration, context = {}) {
    let record = this.skillRecords.get(skillName);
    
    if (!record) {
      record = new SkillUsageRecord(skillName);
      this.skillRecords.set(skillName, record);
    }

    if (success) {
      record.recordSuccess(duration, context);
    } else {
      record.recordFailure(context.error || new Error('Unknown'), context);
    }

    this.emit('usage_recorded', record.toJSON());

    // 检查是否需要进化
    if (record.uses >= this.config.minUsesForEvolution) {
      this._checkEvolution(record);
    }

    return record;
  }

  /**
   * 检查是否需要进化
   */
  _checkEvolution(record) {
    const successRate = record.getSuccessRate();
    
    if (successRate < this.config.successThreshold) {
      this.emit('evolution_needed', {
        skill: record.skillName,
        successRate,
        threshold: this.config.successThreshold,
        reason: 'success_rate_low'
      });

      // 生成优化建议
      const suggestions = this._generateSuggestions(record);
      this.emit('optimization_suggested', {
        skill: record.skillName,
        suggestions
      });
    }
  }

  /**
   * 生成优化建议
   */
  _generateSuggestions(record) {
    const suggestions = [];
    const successRate = record.getSuccessRate();
    
    // 成功率分析
    if (successRate < 0.5) {
      suggestions.push({
        type: 'major',
        priority: 'high',
        suggestion: '技能成功率过低，建议重新设计或拆分',
        reasons: [`当前成功率: ${(successRate * 100).toFixed(1)}%`]
      });
    } else if (successRate < 0.8) {
      suggestions.push({
        type: 'minor',
        priority: 'medium',
        suggestion: '技能有一定失败率，建议增加错误处理',
        reasons: [`当前成功率: ${(successRate * 100).toFixed(1)}%`]
      });
    }

    // 错误类型分析
    if (record.errorTypes.size > 0) {
      const topErrors = Array.from(record.errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      suggestions.push({
        type: 'error_analysis',
        priority: 'medium',
        suggestion: '高频错误分析',
        errors: topErrors.map(([error, count]) => ({ error, count })),
        recommendations: this._getErrorRecommendations(topErrors)
      });
    }

    // 性能分析
    const avgDuration = record.getAverageDuration();
    if (avgDuration > 30000) {
      suggestions.push({
        type: 'performance',
        priority: 'low',
        suggestion: '执行时间较长，考虑优化',
        reasons: [`平均耗时: ${(avgDuration / 1000).toFixed(1)}秒`]
      });
    }

    // 上下文分析
    const failedContexts = record.contexts.filter(c => !c.success);
    if (failedContexts.length > 5) {
      suggestions.push({
        type: 'context_analysis',
        priority: 'medium',
        suggestion: '分析失败上下文的共同特征',
        sampleContexts: failedContexts.slice(-5)
      });
    }

    return suggestions;
  }

  /**
   * 获取错误建议
   */
  _getErrorRecommendations(topErrors) {
    const recommendations = [];
    
    for (const [error] of topErrors) {
      if (error.includes('timeout')) {
        recommendations.push('增加超时处理和重试机制');
      }
      if (error.includes('memory') || error.includes('heap')) {
        recommendations.push('优化内存使用，增加流式处理');
      }
      if (error.includes('permission') || error.includes('access')) {
        recommendations.push('检查权限配置');
      }
      if (error.includes('format') || error.includes('parse')) {
        recommendations.push('增加输入验证和格式化');
      }
    }
    
    return recommendations;
  }

  /**
   * 创建新版本
   */
  createVersion(skillName, changes) {
    const record = this.skillRecords.get(skillName);
    const currentVersion = this.skillVersions.get(skillName) || 0;
    const newVersion = currentVersion + 1;

    const versionInfo = {
      version: `${newVersion}.0.0`,
      skillName,
      changes,
      previousVersion: currentVersion > 0 ? `${currentVersion}.0.0` : null,
      createdAt: Date.now(),
      previousStats: record ? {
        successRate: record.getSuccessRate(),
        uses: record.uses,
        avgDuration: record.getAverageDuration()
      } : null
    };

    this.skillVersions.set(skillName, newVersion);
    this.evolutionHistory.push(versionInfo);

    this.emit('version_created', versionInfo);

    // 限制版本数量
    this._pruneOldVersions(skillName);

    return versionInfo;
  }

  /**
   * 清理旧版本
   */
  _pruneOldVersions(skillName) {
    const skillHistory = this.evolutionHistory.filter(v => v.skillName === skillName);
    
    if (skillHistory.length > this.config.maxVersions) {
      const toRemove = skillHistory.slice(0, skillHistory.length - this.config.maxVersions);
      this.evolutionHistory = this.evolutionHistory.filter(v => !toRemove.includes(v));
    }
  }

  /**
   * 获取技能状态
   */
  getSkillStatus(skillName) {
    const record = this.skillRecords.get(skillName);
    const currentVersion = this.skillVersions.get(skillName) || 0;
    const history = this.evolutionHistory.filter(v => v.skillName === skillName);

    return {
      name: skillName,
      currentVersion: `${currentVersion}.0.0`,
      stats: record ? record.toJSON() : null,
      evolutionHistory: history,
      needsEvolution: record ? record.getSuccessRate() < this.config.successThreshold : false
    };
  }

  /**
   * 获取所有技能状态
   */
  getAllStatus() {
    const status = [];
    
    for (const skillName of this.skillRecords.keys()) {
      status.push(this.getSkillStatus(skillName));
    }
    
    return status.sort((a, b) => {
      if (a.needsEvolution !== b.needsEvolution) {
        return a.needsEvolution ? -1 : 1;
      }
      return (b.stats?.successRate || 0) - (a.stats?.successRate || 0);
    });
  }

  /**
   * 获取统计
   */
  getStatistics() {
    let totalUses = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let needsEvolution = 0;

    for (const record of this.skillRecords.values()) {
      totalUses += record.uses;
      totalSuccesses += record.successes;
      totalFailures += record.failures;
      if (record.getSuccessRate() < this.config.successThreshold) {
        needsEvolution++;
      }
    }

    return {
      totalSkills: this.skillRecords.size,
      totalUses,
      totalSuccesses,
      totalFailures,
      overallSuccessRate: totalUses > 0 ? (totalSuccesses / totalUses * 100).toFixed(2) + '%' : 'N/A',
      skillsNeedingEvolution: needsEvolution,
      totalVersions: this.evolutionHistory.length
    };
  }

  /**
   * 导出数据
   */
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      skills: Array.from(this.skillRecords.values()).map(r => r.toJSON()),
      versions: this.evolutionHistory,
      statistics: this.getStatistics()
    };
  }

  /**
   * 导入数据
   */
  importData(data) {
    if (data.skills) {
      for (const skillData of data.skills) {
        const record = new SkillUsageRecord(skillData.skillName);
        Object.assign(record, skillData);
        this.skillRecords.set(skillData.skillName, record);
      }
    }

    if (data.versions) {
      this.evolutionHistory.push(...data.versions);
    }
  }
}

// ============== 导出 ==============
module.exports = {
  SkillEvolution,
  SkillUsageRecord
};
