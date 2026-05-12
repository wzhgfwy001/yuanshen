/**
 * Category Validation Tracker - 分类验证追踪器
 * 
 * 功能：
 * 1. 自动计数任务
 * 2. 记录分类错误
 * 3. 检查验证状态
 * 4. 触发正式迁移
 * 
 * 使用方式：
 * 在主Agent任务处理流程中调用 tracker.increment() 和 tracker.recordError()
 */

const fs = require('fs');
const path = require('path');

const TRACKER_PATH = path.join(__dirname, 'category-validation-tracker.json');

class CategoryValidationTracker {
  constructor() {
    this.tracker = this._load();
  }

  _load() {
    try {
      const data = fs.readFileSync(TRACKER_PATH, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      // 如果文件不存在，返回默认结构
      return {
        config: { startDate: new Date().toISOString(), threshold: 30, errorThreshold: 3 },
        status: { value: 'validation_in_progress', label: '验证中', since: new Date().toISOString() },
        stats: { totalTasks: 0, validTasks: 0, errorCount: 0 },
        errors: [],
        history: []
      };
    }
  }

  _save() {
    this.tracker._internal.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TRACKER_PATH, JSON.stringify(this.tracker, null, 2), 'utf8');
  }

  /**
   * 任务完成时调用，自动+1
   * @param {Object} taskInfo - 任务信息
   * @param {string} taskInfo.taskId - 任务ID
   * @param {string} taskInfo.category - 当前分类
   * @param {string} taskInfo.agentName - 执行的子Agent名称
   */
  increment(taskInfo) {
    this.tracker.stats.totalTasks++;
    this.tracker.stats.validTasks++;
    this.tracker.history.push({
      taskId: taskInfo.taskId,
      category: taskInfo.category,
      agentName: taskInfo.agentName,
      timestamp: new Date().toISOString(),
      action: 'completed'
    });
    this._save();
    this._checkStatus();
    return this.getStatus();
  }

  /**
   * 记录分类错误
   * @param {Object} errorInfo - 错误信息
   * @param {string} errorInfo.taskId - 任务ID
   * @param {string} errorInfo.assignedCategory - 被分配的分类
   * @param {string} errorInfo.actualCategory - 实际应该是的分类
   * @param {string} errorInfo.detectedBy - 检测来源：user-feedback | agent-callback | self-check
   * @param {string} errorInfo.note - 备注
   */
  recordError(errorInfo) {
    this.tracker.stats.totalTasks++;
    this.tracker.stats.errorCount++;
    
    const error = {
      taskId: errorInfo.taskId,
      assignedCategory: errorInfo.assignedCategory,
      actualCategory: errorInfo.actualCategory,
      detectedBy: errorInfo.detectedBy,
      note: errorInfo.note || '',
      timestamp: new Date().toISOString()
    };
    
    this.tracker.errors.push(error);
    this.tracker.history.push({
      taskId: errorInfo.taskId,
      category: errorInfo.assignedCategory,
      timestamp: errorInfo.timestamp,
      action: 'classification_error',
      error: error
    });
    
    this._save();
    this._checkStatus();
    return this.getStatus();
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    const { stats, config, status } = this.tracker;
    const progress = Math.min(100, Math.round((stats.totalTasks / config.threshold) * 100));
    const canMigrate = stats.totalTasks >= config.threshold && stats.errorCount < config.errorThreshold;
    
    return {
      status: status.value,
      statusLabel: status.label,
      progress: `${progress}%`,
      totalTasks: stats.totalTasks,
      validTasks: stats.validTasks,
      errorCount: stats.errorCount,
      threshold: config.threshold,
      errorThreshold: config.errorThreshold,
      remaining: Math.max(0, config.threshold - stats.totalTasks),
      canMigrate: canMigrate,
      message: canMigrate 
        ? '✅ 验证通过，可以正式迁移到registry.json' 
        : `验证进行中，还需${Math.max(0, config.threshold - stats.totalTasks)}个任务`
    };
  }

  /**
   * 检查是否触发状态变更
   */
  _checkStatus() {
    const { stats, config, status } = this.tracker;
    
    if (status.value === 'validation_in_progress') {
      if (stats.errorCount >= config.errorThreshold) {
        status.value = 'validation_failed';
        status.label = '验证失败';
        status.since = new Date().toISOString();
      } else if (stats.totalTasks >= config.threshold) {
        status.value = 'validation_passed';
        status.label = '验证通过';
        status.since = new Date().toISOString();
      }
    }
  }

  /**
   * 重置追踪器（重新开始验证）
   */
  reset() {
    this.tracker = {
      config: { startDate: new Date().toISOString(), threshold: 30, errorThreshold: 3 },
      status: { value: 'validation_in_progress', label: '验证中', since: new Date().toISOString() },
      stats: { totalTasks: 0, validTasks: 0, errorCount: 0 },
      errors: [],
      history: [],
      _internal: { lastUpdated: new Date().toISOString() }
    };
    this._save();
    return this.getStatus();
  }

  /**
   * 获取最近N条历史记录
   * @param {number} limit - 条数
   */
  getHistory(limit = 10) {
    return this.tracker.history.slice(-limit);
  }

  /**
   * 获取错误列表
   */
  getErrors() {
    return this.tracker.errors;
  }
}

// 导出单例
const tracker = new CategoryValidationTracker();

module.exports = tracker;
