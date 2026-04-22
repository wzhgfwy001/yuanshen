/**
 * Category Validation Tracker - 分类验证追踪器 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化
 * 2. 中间件管道
 * 3. 事件系统
 * 4. 输入验证
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const TRACKER_PATH = path.join(__dirname, 'category-validation-tracker.json');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class TaskRecord {
  constructor(taskId, category, agentName) {
    this.taskId = taskId;
    this.category = category;
    this.agentName = agentName;
    this.timestamp = new Date().toISOString();
    this.action = 'completed';
  }

  toJSON() {
    return {
      taskId: this.taskId,
      category: this.category,
      agentName: this.agentName,
      timestamp: this.timestamp,
      action: this.action
    };
  }
}

class ErrorRecord {
  constructor(taskId, assignedCategory, actualCategory, detectedBy, note = '') {
    this.taskId = taskId;
    this.assignedCategory = assignedCategory;
    this.actualCategory = actualCategory;
    this.detectedBy = detectedBy;
    this.note = note;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      taskId: this.taskId,
      assignedCategory: this.assignedCategory,
      actualCategory: this.actualCategory,
      detectedBy: this.detectedBy,
      note: this.note,
      timestamp: this.timestamp
    };
  }
}

class TrackerStats {
  constructor() {
    this.totalTasks = 0;
    this.validTasks = 0;
    this.errorCount = 0;
  }

  increment(valid = true) {
    this.totalTasks++;
    if (valid) this.validTasks++;
    else this.errorCount++;
  }

  toJSON() {
    return {
      totalTasks: this.totalTasks,
      validTasks: this.validTasks,
      errorCount: this.errorCount
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class TrackerEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[TrackerEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new TrackerEmitter();

const EVENTS = {
  TASK_INCREMENTED: 'task_incremented',
  ERROR_RECORDED: 'error_recorded',
  STATUS_CHANGED: 'status_changed',
  THRESHOLD_REACHED: 'threshold_reached',
  READY_TO_MIGRATE: 'ready_to_migrate'
};

emitter.on(EVENTS.READY_TO_MIGRATE, () => {
  console.log('[Tracker] 🚀 验证通过，可以正式迁移到registry.json');
});

emitter.on(EVENTS.STATUS_CHANGED, (status) => {
  console.log(`[Tracker] 状态变更: ${status.value} - ${status.label}`);
});

// ==================== DeerFlow借鉴: 中间件管道 ====================

class TrackerMiddleware {
  beforeIncrement(taskInfo, context) { return { taskInfo, context }; }
  afterIncrement(status, context) { return status; }
  beforeRecordError(errorInfo, context) { return { errorInfo, context }; }
  afterRecordError(status, context) { return status; }
}

class TrackerPipeline {
  constructor() {
    this.incrementMiddlewares = [];
    this.errorMiddlewares = [];
  }

  useForIncrement(mw) {
    this.incrementMiddlewares.push(mw);
    return this;
  }

  useForError(mw) {
    this.errorMiddlewares.push(mw);
    return this;
  }

  executeIncrement(taskInfo, context, fn) {
    let ctx = { taskInfo, context, errors: [] };

    for (const mw of this.incrementMiddlewares) {
      try {
        const result = mw.beforeIncrement(ctx.taskInfo, ctx.context);
        ctx.taskInfo = result.taskInfo;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    let result;
    try {
      result = fn(ctx.taskInfo, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      result = null;
    }

    for (const mw of this.incrementMiddlewares) {
      try {
        result = mw.afterIncrement(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    return result;
  }

  executeError(errorInfo, context, fn) {
    let ctx = { errorInfo, context, errors: [] };

    for (const mw of this.errorMiddlewares) {
      try {
        const result = mw.beforeRecordError(ctx.errorInfo, ctx.context);
        ctx.errorInfo = result.errorInfo;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    let result;
    try {
      result = fn(ctx.errorInfo, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      result = null;
    }

    for (const mw of this.errorMiddlewares) {
      try {
        result = mw.afterRecordError(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    return result;
  }
}

// 具体中间件
class ValidationMiddleware extends TrackerMiddleware {
  beforeIncrement(taskInfo, context) {
    if (!taskInfo || typeof taskInfo !== 'object') {
      throw new Error('taskInfo must be an object');
    }
    if (!taskInfo.taskId) {
      taskInfo.taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!taskInfo.category) {
      taskInfo.category = 'unknown';
    }
    if (!taskInfo.agentName) {
      taskInfo.agentName = 'unknown';
    }
    return { taskInfo, context };
  }

  beforeRecordError(errorInfo, context) {
    if (!errorInfo || typeof errorInfo !== 'object') {
      throw new Error('errorInfo must be an object');
    }
    if (!errorInfo.taskId) {
      errorInfo.taskId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return { errorInfo, context };
  }
}

class LoggingMiddleware extends TrackerMiddleware {
  afterIncrement(status, context) {
    console.log(`[Tracker] 任务完成: total=${status.totalTasks}, valid=${status.validTasks}`);
    return status;
  }

  afterRecordError(status, context) {
    console.log(`[Tracker] 错误记录: total=${status.totalTasks}, errors=${status.errorCount}`);
    return status;
  }
}

// ==================== 追踪器主类 ====================

class CategoryValidationTracker {
  constructor() {
    this.pipeline = new TrackerPipeline();
    this.pipeline.useForIncrement(new ValidationMiddleware());
    this.pipeline.useForIncrement(new LoggingMiddleware());
    this.pipeline.useForError(new ValidationMiddleware());

    this.tracker = this._loadSync();
  }

  _loadSync() {
    try {
      const data = fsSync.readFileSync(TRACKER_PATH, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return {
        config: { startDate: new Date().toISOString(), threshold: 30, errorThreshold: 3 },
        status: { value: 'validation_in_progress', label: '验证中', since: new Date().toISOString() },
        stats: { totalTasks: 0, validTasks: 0, errorCount: 0 },
        errors: [],
        history: [],
        _internal: { lastUpdated: new Date().toISOString() }
      };
    }
  }

  async _load() {
    try {
      const data = await fs.readFile(TRACKER_PATH, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return {
        config: { startDate: new Date().toISOString(), threshold: 30, errorThreshold: 3 },
        status: { value: 'validation_in_progress', label: '验证中', since: new Date().toISOString() },
        stats: { totalTasks: 0, validTasks: 0, errorCount: 0 },
        errors: [],
        history: [],
        _internal: { lastUpdated: new Date().toISOString() }
      };
    }
  }

  async _save() {
    this.tracker._internal.lastUpdated = new Date().toISOString();
    await fs.writeFile(TRACKER_PATH, JSON.stringify(this.tracker, null, 2), 'utf8');
  }

  /**
   * 任务完成时调用，自动+1
   */
  increment(taskInfo) {
    return this.pipeline.executeIncrement(
      taskInfo,
      {},
      (info) => this._doIncrement(info)
    );
  }

  _doIncrement(taskInfo) {
    const record = new TaskRecord(
      taskInfo.taskId,
      taskInfo.category,
      taskInfo.agentName
    );

    this.tracker.stats.totalTasks++;
    this.tracker.stats.validTasks++;
    this.tracker.history.push(record.toJSON());

    // 触发事件
    emitter.emit(EVENTS.TASK_INCREMENTED, this.tracker.stats);
    this._checkStatus();

    // 同步保存
    this._saveSync();

    return this.getStatus();
  }

  /**
   * 记录分类错误
   */
  recordError(errorInfo) {
    return this.pipeline.executeError(
      errorInfo,
      {},
      (info) => this._doRecordError(info)
    );
  }

  _doRecordError(errorInfo) {
    const record = new ErrorRecord(
      errorInfo.taskId,
      errorInfo.assignedCategory,
      errorInfo.actualCategory,
      errorInfo.detectedBy,
      errorInfo.note || ''
    );

    this.tracker.stats.totalTasks++;
    this.tracker.stats.errorCount++;
    this.tracker.errors.push(record.toJSON());

    const historyEntry = {
      taskId: errorInfo.taskId,
      category: errorInfo.assignedCategory,
      timestamp: record.timestamp,
      action: 'classification_error',
      error: record.toJSON()
    };
    this.tracker.history.push(historyEntry);

    // 触发事件
    emitter.emit(EVENTS.ERROR_RECORDED, record);
    this._checkStatus();

    // 同步保存
    this._saveSync();

    return this.getStatus();
  }

  _saveSync() {
    this.tracker._internal.lastUpdated = new Date().toISOString();
    fsSync.writeFileSync(TRACKER_PATH, JSON.stringify(this.tracker, null, 2), 'utf8');
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
    const prevStatus = status.value;

    if (status.value === 'validation_in_progress') {
      if (stats.errorCount >= config.errorThreshold) {
        status.value = 'validation_failed';
        status.label = '验证失败';
        status.since = new Date().toISOString();
      } else if (stats.totalTasks >= config.threshold) {
        status.value = 'validation_passed';
        status.label = '验证通过';
        status.since = new Date().toISOString();
        emitter.emit(EVENTS.READY_TO_MIGRATE);
      }
    }

    if (prevStatus !== status.value) {
      emitter.emit(EVENTS.STATUS_CHANGED, status);
    }
  }

  /**
   * 重置追踪器
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
    this._saveSync();
    return this.getStatus();
  }

  /**
   * 获取最近N条历史记录
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
module.exports.CategoryValidationTracker = CategoryValidationTracker;
module.exports.TaskRecord = TaskRecord;
module.exports.ErrorRecord = ErrorRecord;
module.exports.TrackerPipeline = TrackerPipeline;
module.exports.emitter = emitter;
module.exports.EVENTS = EVENTS;
