/**
 * DeerFlow增强版用户反馈系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多渠道反馈收集
 * 2. 反馈分类
 * 3. 优先级处理
 * 4. 反馈分析
 */

const { EventEmitter } = require('events');

// ============== 反馈项 ==============
class FeedbackItem extends EventEmitter {
  constructor(feedback, options = {}) {
    super();
    this.id = feedback.id || `fb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.content = feedback.content;
    this.type = feedback.type || 'general'; // bug, feature, complaint, praise, question
    this.category = feedback.category || null;
    this.priority = feedback.priority || 0;
    this.status = 'pending'; // pending, reviewing, in_progress, resolved, closed
    this.source = options.source || 'direct';
    this.userId = options.userId || null;
    this.context = feedback.context || {};
    this.metadata = options.metadata || {};
    this.responses = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.resolvedAt = null;
  }

  addResponse(response) {
    this.responses.push({
      ...response,
      timestamp: Date.now()
    });
    this.updatedAt = Date.now();
  }

  resolve() {
    this.status = 'resolved';
    this.resolvedAt = Date.now();
    this.updatedAt = Date.now();
    this.emit('resolved', this);
  }
}

// ============== UserFeedback 主类 ==============
class UserFeedback extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      autoClassify: config.autoClassify !== false,
      priorityThreshold: config.priorityThreshold || 5,
      ...config
    };

    this.feedbackItems = new Map();
    this.categories = new Map();
    this.stats = {
      total: 0,
      byType: {},
      byStatus: {},
      resolved: 0
    };
  }

  /**
   * 提交反馈
   */
  submit(feedback, options = {}) {
    // 自动分类
    if (this.config.autoClassify && !feedback.category) {
      feedback.category = this._classifyFeedback(feedback);
    }

    // 自动优先级
    if (this.config.autoClassify && feedback.priority === 0) {
      feedback.priority = this._calculatePriority(feedback);
    }

    const item = new FeedbackItem(feedback, options);
    this.feedbackItems.set(item.id, item);

    // 更新类别统计
    if (item.category) {
      if (!this.categories.has(item.category)) {
        this.categories.set(item.category, []);
      }
      this.categories.get(item.category).push(item.id);
    }

    // 更新统计
    this._updateStats(item, 'add');

    this.emit('feedback_submitted', item);

    return item;
  }

  /**
   * 获取反馈
   */
  get(id) {
    return this.feedbackItems.get(id) || null;
  }

  /**
   * 获取所有反馈
   */
  getAll(options = {}) {
    let items = Array.from(this.feedbackItems.values());

    if (options.type) {
      items = items.filter(i => i.type === options.type);
    }

    if (options.category) {
      items = items.filter(i => i.category === options.category);
    }

    if (options.status) {
      items = items.filter(i => i.status === options.status);
    }

    if (options.priority) {
      items = items.filter(i => i.priority >= options.priority);
    }

    // 排序
    if (options.sortBy === 'priority') {
      items.sort((a, b) => b.priority - a.priority);
    } else if (options.sortBy === 'date') {
      items.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * 添加响应
   */
  respond(feedbackId, response) {
    const item = this.feedbackItems.get(feedbackId);
    if (!item) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    item.addResponse(response);
    this.emit('response_added', { feedbackId, response });

    return item;
  }

  /**
   * 解决反馈
   */
  resolve(id, resolution = {}) {
    const item = this.feedbackItems.get(id);
    if (!item) {
      throw new Error(`Feedback not found: ${id}`);
    }

    item.resolve();
    
    if (resolution.response) {
      item.addResponse(resolution);
    }

    this._updateStats(item, 'resolve');

    return item;
  }

  /**
   * 批量处理
   */
  batchProcess(ids, action, options = {}) {
    const results = [];
    
    for (const id of ids) {
      try {
        const item = this.feedbackItems.get(id);
        if (!item) continue;

        switch (action) {
          case 'resolve':
            item.resolve();
            results.push({ id, success: true });
            break;
          case 'close':
            item.status = 'closed';
            results.push({ id, success: true });
            break;
          case 'update_priority':
            item.priority = options.priority;
            results.push({ id, success: true });
            break;
        }
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 分类反馈
   */
  _classifyFeedback(feedback) {
    const text = (feedback.content || '').toLowerCase();
    
    if (/bug|错误|崩溃|出错/.test(text)) {
      return 'bug';
    }
    if (/feature|功能|建议|想要/.test(text)) {
      return 'feature_request';
    }
    if (/complaint|不满|投诉|差评/.test(text)) {
      return 'complaint';
    }
    if (/praise|好评|满意|棒/.test(text)) {
      return 'praise';
    }
    if (/question|问题|怎么|如何/.test(text)) {
      return 'question';
    }
    
    return 'general';
  }

  /**
   * 计算优先级
   */
  _calculatePriority(feedback) {
    let priority = 1;
    
    // 类型优先级
    const typePriority = {
      complaint: 5,
      bug: 4,
      question: 2,
      feature_request: 1,
      praise: 1
    };
    
    if (typePriority[feedback.type]) {
      priority = typePriority[feedback.type];
    }

    // 紧急关键词
    const urgentKeywords = ['紧急', '重要', 'critical', 'urgent', 'asap'];
    for (const keyword of urgentKeywords) {
      if (feedback.content && feedback.content.includes(keyword)) {
        priority += 2;
        break;
      }
    }

    return Math.min(priority, 10);
  }

  /**
   * 更新统计
   */
  _updateStats(item, action) {
    this.stats.total++;

    if (action === 'add') {
      this.stats.byType[item.type] = (this.stats.byType[item.type] || 0) + 1;
      this.stats.byStatus[item.status] = (this.stats.byStatus[item.status] || 0) + 1;
    } else if (action === 'resolve') {
      this.stats.resolved++;
      this.stats.byStatus[item.status] = (this.stats.byStatus[item.status] || 0) - 1;
      if (this.stats.byStatus[item.status] < 0) {
        this.stats.byStatus[item.status] = 0;
      }
    }
  }

  /**
   * 获取统计
   */
  getStats() {
    return {
      ...this.stats,
      resolutionRate: this.stats.total > 0
        ? ((this.stats.resolved / this.stats.total) * 100).toFixed(2) + '%'
        : 'N/A',
      categories: Array.from(this.categories.keys())
    };
  }
}

// ============== 导出 ==============
module.exports = {
  UserFeedback,
  FeedbackItem
};
