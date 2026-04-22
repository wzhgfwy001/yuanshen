/**
 * DeerFlow增强版多任务队列
 * 
 * 借鉴DeerFlow的设计：
 * 1. 优先级队列
 * 2. 多队列管理
 * 3. 动态限流
 * 4. 任务依赖管理
 */

const { EventEmitter } = require('events');

// ============== 任务项类 ==============
class TaskItem extends EventEmitter {
  constructor(task, options = {}) {
    super();
    this.id = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.data = task.data || task;
    this.priority = options.priority || 0;
    this.queue = options.queue || 'default';
    this.status = 'pending'; // pending, queued, processing, completed, failed, cancelled
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.delay = options.delay || 0;
    this.timeout = options.timeout || 30000;
    this.dependencies = options.dependencies || [];
    this.result = null;
    this.error = null;
    this.createdAt = Date.now();
    this.queuedAt = null;
    this.startedAt = null;
    this.completedAt = null;
    this.metadata = task.metadata || {};
  }

  /**
   * 检查是否可以执行
   */
  canExecute(completedTasks) {
    if (this.status !== 'pending' && this.status !== 'queued') {
      return false;
    }

    // 检查依赖
    for (const depId of this.dependencies) {
      if (!completedTasks.has(depId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 标记为开始
   */
  start() {
    this.status = 'processing';
    this.startedAt = Date.now();
    this.attempts++;
    this.emit('started', this);
  }

  /**
   * 标记为完成
   */
  complete(result) {
    this.status = 'completed';
    this.result = result;
    this.completedAt = Date.now();
    this.emit('completed', this);
  }

  /**
   * 标记为失败
   */
  fail(error) {
    this.error = error;
    
    if (this.attempts >= this.maxAttempts) {
      this.status = 'failed';
      this.completedAt = Date.now();
      this.emit('failed', this);
    } else {
      this.status = 'pending';
      this.emit('retry_scheduled', this);
    }
  }

  /**
   * 取消
   */
  cancel() {
    this.status = 'cancelled';
    this.completedAt = Date.now();
    this.emit('cancelled', this);
  }

  getDuration() {
    if (!this.startedAt || !this.completedAt) return null;
    return this.completedAt - this.startedAt;
  }
}

// ============== PriorityQueue 类 ==============
class PriorityQueue {
  constructor(options = {}) {
    this.maxSize = options.maxSize || Infinity;
    this.comparator = options.comparator || ((a, b) => b.priority - a.priority);
    this.items = [];
  }

  /**
   * 入队
   */
  enqueue(item) {
    if (this.items.length >= this.maxSize) {
      return false;
    }

    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
    return true;
  }

  /**
   * 出队
   */
  dequeue() {
    if (this.items.length === 0) return null;

    const first = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0) {
      this.items[0] = last;
      this._bubbleDown(0);
    }

    return first;
  }

  /**
   * 查看队首
   */
  peek() {
    return this.items[0] || null;
  }

  /**
   * 获取大小
   */
  size() {
    return this.items.length;
  }

  /**
   * 是否为空
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * 清空
   */
  clear() {
    this.items = [];
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.comparator(this.items[index], this.items[parentIndex]) <= 0) {
        break;
      }

      [this.items[index], this.items[parentIndex]] = 
        [this.items[parentIndex], this.items[index]];
      
      index = parentIndex;
    }
  }

  _bubbleDown(index) {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.items.length &&
          this.comparator(this.items[leftChild], this.items[smallest]) < 0) {
        smallest = leftChild;
      }

      if (rightChild < this.items.length &&
          this.comparator(this.items[rightChild], this.items[smallest]) < 0) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.items[index], this.items[smallest]] = 
        [this.items[smallest], this.items[index]];
      
      index = smallest;
    }
  }
}

// ============== MultiTaskQueue 主类 ==============
class MultiTaskQueue extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      maxQueueSize: config.maxQueueSize || 1000,
      defaultTimeout: config.defaultTimeout || 30000,
      ...config
    };

    this.queues = new Map();
    this.tasks = new Map();
    this.runningTasks = new Map();
    this.completedTasks = new Set();
    this.failedTasks = new Map();
    this.waitingTasks = [];

    // 创建默认队列
    this._createQueue('default');
  }

  /**
   * 创建队列
   */
  _createQueue(name, options = {}) {
    const queue = new PriorityQueue({
      maxSize: options.maxSize || this.config.maxQueueSize,
      comparator: (a, b) => {
        // 首先按优先级，然后按创建时间
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt - b.createdAt;
      }
    });

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * 添加任务
   */
  addTask(task, options = {}) {
    const queueName = options.queue || 'default';
    
    if (!this.queues.has(queueName)) {
      this._createQueue(queueName);
    }

    const taskItem = new TaskItem(task, {
      priority: options.priority || 0,
      queue: queueName,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0,
      timeout: options.timeout || this.config.defaultTimeout,
      dependencies: options.dependencies || []
    });

    this.tasks.set(taskItem.id, taskItem);

    if (options.delay > 0) {
      // 延迟任务
      setTimeout(() => {
        this._enqueueTask(taskItem);
      }, options.delay);
    } else {
      this._enqueueTask(taskItem);
    }

    this.emit('task_added', { task: taskItem, queue: queueName });
    this._processQueue();

    return taskItem;
  }

  /**
   * 入队任务
   */
  _enqueueTask(taskItem) {
    const queue = this.queues.get(taskItem.queue);
    
    if (!queue.enqueue(taskItem)) {
      taskItem.fail(new Error('Queue is full'));
      this.emit('queue_full', { task: taskItem });
      return false;
    }

    taskItem.status = 'queued';
    taskItem.queuedAt = Date.now();
    return true;
  }

  /**
   * 处理队列
   */
  _processQueue() {
    if (this.runningTasks.size >= this.config.maxConcurrent) {
      return; // 达到并发上限
    }

    // 遍历所有队列
    for (const [queueName, queue] of this.queues) {
      while (!queue.isEmpty() && this.runningTasks.size < this.config.maxConcurrent) {
        const taskItem = queue.dequeue();
        
        if (!taskItem) break;

        // 检查依赖
        if (!taskItem.canExecute(this.completedTasks)) {
          // 放回等待列表
          this.waitingTasks.push(taskItem);
          continue;
        }

        this._executeTask(taskItem);
      }
    }
  }

  /**
   * 执行任务
   */
  async _executeTask(taskItem) {
    this.runningTasks.set(taskItem.id, taskItem);
    taskItem.start();

    this.emit('task_started', { task: taskItem });

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), taskItem.timeout);
      });

      const result = await Promise.race([
        taskItem.data.execute ? taskItem.data.execute() : taskItem.data,
        timeoutPromise
      ]);

      taskItem.complete(result);
      this.completedTasks.add(taskItem.id);
      this.runningTasks.delete(taskItem.id);

      this.emit('task_completed', { task: taskItem, result });

      // 检查等待中的任务
      this._checkWaitingTasks();
      this._processQueue();

    } catch (error) {
      taskItem.fail(error);
      this.runningTasks.delete(taskItem.id);

      if (taskItem.status === 'failed') {
        this.failedTasks.set(taskItem.id, taskItem);
        this.emit('task_failed', { task: taskItem, error });
      } else {
        // 重试
        this._enqueueTask(taskItem);
      }

      this._processQueue();
    }
  }

  /**
   * 检查等待中的任务
   */
  _checkWaitingTasks() {
    const stillWaiting = [];

    for (const task of this.waitingTasks) {
      if (task.canExecute(this.completedTasks)) {
        this._enqueueTask(task);
      } else {
        stillWaiting.push(task);
      }
    }

    this.waitingTasks = stillWaiting;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(queueName = null) {
    if (queueName) {
      const queue = this.queues.get(queueName);
      return queue ? queue.size() : 0;
    }

    const status = {};
    for (const [name, queue] of this.queues) {
      status[name] = queue.size();
    }
    return status;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    return {
      id: task.id,
      status: task.status,
      priority: task.priority,
      queue: task.queue,
      attempts: task.attempts,
      result: task.result,
      error: task.error?.message,
      duration: task.getDuration(),
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt
    };
  }

  /**
   * 获取统计
   */
  getStats() {
    return {
      totalTasks: this.tasks.size,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
      waiting: this.waitingTasks.length,
      queues: this.getQueueStatus()
    };
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.cancel();
      this.emit('task_cancelled', { task });
      return true;
    }
    return false;
  }

  /**
   * 清空队列
   */
  clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.clear();
      return true;
    }
    return false;
  }
}

// ============== 导出 ==============
module.exports = {
  MultiTaskQueue,
  TaskItem,
  PriorityQueue
};
