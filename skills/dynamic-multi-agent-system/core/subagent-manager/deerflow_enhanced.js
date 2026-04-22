/**
 * DeerFlow增强版SubAgent管理器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 双线程池 - _scheduler_pool(3) + _execution_pool(3)
 * 2. MAX_CONCURRENT_SUBAGENTS = 3 限制
 * 3. 事件驱动 - task_started, task_running, task_completed/task_failed/task_timed_out
 * 4. 后台线程执行 + 5秒轮询
 * 5. SSE事件流
 */

const { EventEmitter } = require('events');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// ============== 常量定义 ==============
const SUBAGENT_EVENTS = {
  TASK_STARTED: 'task_started',
  TASK_RUNNING: 'task_running', 
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TASK_TIMED_OUT: 'task_timed_out',
  ALL_COMPLETED: 'all_completed',
  RATE_LIMITED: 'rate_limited'
};

const SUBAGENT_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMED_OUT: 'timed_out',
  CANCELLED: 'cancelled'
};

const DEFAULT_CONFIG = {
  MAX_CONCURRENT: 3,           // 最大并发数 (借鉴DeerFlow)
  TASK_TIMEOUT: 900000,       // 15分钟超时 (借鉴DeerFlow)
  POLL_INTERVAL: 5000,         // 5秒轮询间隔
  SCHEDULER_POOL_SIZE: 3,      // 调度线程池大小
  EXECUTOR_POOL_SIZE: 3,      // 执行线程池大小
  RETRY_DELAY: 1000,           // 重试延迟
  MAX_RETRIES: 3              // 最大重试次数
};

// ============== SubAgent任务类 ==============
class SubAgentTask extends EventEmitter {
  constructor(config) {
    super();
    this.taskId = config.taskId || this._generateTaskId();
    this.subagentType = config.subagentType || 'general-purpose';
    this.prompt = config.prompt;
    this.description = config.description || '';
    this.maxTurns = config.maxTurns || 10;
    this.timeout = config.timeout || DEFAULT_CONFIG.TASK_TIMEOUT;
    this.retryCount = 0;
    this.maxRetries = config.maxRetries || DEFAULT_CONFIG.MAX_RETRIES;
    this.status = SUBAGENT_STATUS.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
    this.events = [];  // 事件历史
    this.context = config.context || {};
  }

  _generateTaskId() {
    return `subagent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    if (this.status !== SUBAGENT_STATUS.PENDING) {
      return false;
    }
    this.status = SUBAGENT_STATUS.RUNNING;
    this.startTime = Date.now();
    this._emitEvent(SUBAGENT_EVENTS.TASK_STARTED, {
      taskId: this.taskId,
      type: this.subagentType,
      timestamp: this.startTime
    });
    return true;
  }

  complete(result) {
    if (this.status !== SUBAGENT_STATUS.RUNNING) {
      return false;
    }
    this.status = SUBAGENT_STATUS.COMPLETED;
    this.result = result;
    this.endTime = Date.now();
    this._emitEvent(SUBAGENT_EVENTS.TASK_COMPLETED, {
      taskId: this.taskId,
      result,
      duration: this.endTime - this.startTime,
      timestamp: this.endTime
    });
    return true;
  }

  fail(error) {
    if (this.status !== SUBAGENT_STATUS.RUNNING) {
      return false;
    }
    this.retryCount++;
    if (this.retryCount < this.maxRetries) {
      this._emitEvent(SUBAGENT_EVENTS.RATE_LIMITED, {
        taskId: this.taskId,
        retryCount: this.retryCount,
        willRetry: true
      });
      return false;
    }
    this.status = SUBAGENT_STATUS.FAILED;
    this.error = error;
    this.endTime = Date.now();
    this._emitEvent(SUBAGENT_EVENTS.TASK_FAILED, {
      taskId: this.taskId,
      error,
      retryCount: this.retryCount,
      duration: this.endTime - this.startTime,
      timestamp: this.endTime
    });
    return true;
  }

  timeoutExpired() {
    if (this.status !== SUBAGENT_STATUS.RUNNING) {
      return false;
    }
    this.status = SUBAGENT_STATUS.TIMED_OUT;
    this.error = 'Task timed out';
    this.endTime = Date.now();
    this._emitEvent(SUBAGENT_EVENTS.TASK_TIMED_OUT, {
      taskId: this.taskId,
      timeout: this.timeout,
      duration: this.endTime - this.startTime,
      timestamp: this.endTime
    });
    return true;
  }

  cancel() {
    if (this.status === SUBAGENT_STATUS.RUNNING || 
        this.status === SUBAGENT_STATUS.PENDING) {
      this.status = SUBAGENT_STATUS.CANCELLED;
      this.endTime = Date.now();
      this._emitEvent('task_cancelled', {
        taskId: this.taskId,
        timestamp: this.endTime
      });
      return true;
    }
    return false;
  }

  _emitEvent(eventType, data) {
    const event = {
      type: eventType,
      taskId: this.taskId,
      ...data,
      _timestamp: Date.now()
    };
    this.events.push(event);
    this.emit(eventType, event);
  }

  getProgress() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const progress = this.status === SUBAGENT_STATUS.COMPLETED ? 100 :
                     this.status === SUBAGENT_STATUS.RUNNING ? 
                     Math.min(90, (elapsed / this.timeout) * 100) : 0;
    return {
      taskId: this.taskId,
      type: this.subagentType,
      status: this.status,
      progress: Math.round(progress),
      elapsed,
      timeout: this.timeout,
      retryCount: this.retryCount
    };
  }

  toJSON() {
    return {
      taskId: this.taskId,
      subagentType: this.subagentType,
      description: this.description,
      prompt: this.prompt,
      status: this.status,
      result: this.result,
      error: this.error,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime && this.startTime ? 
                this.endTime - this.startTime : null,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      events: this.events
    };
  }
}

// ============== SubAgent执行器 ==============
class SubAgentExecutor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.schedulerPool = [];
    this.executionPool = [];
    this.pendingQueue = [];
    this.runningTasks = new Map();
    this.completedTasks = [];
    this.failedTasks = [];
    this.eventHistory = [];
    this._initPools();
  }

  _initPools() {
    // 初始化调度线程池
    for (let i = 0; i < this.config.SCHEDULER_POOL_SIZE; i++) {
      this.schedulerPool.push({
        id: `scheduler-${i}`,
        busy: false
      });
    }
    // 初始化执行线程池
    for (let i = 0; i < this.config.EXECUTOR_POOL_SIZE; i++) {
      this.executionPool.push({
        id: `executor-${i}`,
        busy: false,
        currentTask: null
      });
    }
  }

  /**
   * 提交任务 - 借鉴DeerFlow的task()工具
   * @param {Object} taskConfig - 任务配置
   * @returns {Promise<Object>} 任务结果
   */
  async submitTask(taskConfig) {
    const task = new SubAgentTask({
      taskId: taskConfig.taskId,
      subagentType: taskConfig.subagentType || 'general-purpose',
      prompt: taskConfig.prompt,
      description: taskConfig.description,
      maxTurns: taskConfig.maxTurns,
      timeout: taskConfig.timeout || this.config.TASK_TIMEOUT,
      maxRetries: taskConfig.maxRetries,
      context: taskConfig.context
    });

    // 监听任务事件
    task.on(SUBAGENT_EVENTS.TASK_STARTED, (e) => this._onTaskStarted(e));
    task.on(SUBAGENT_EVENTS.TASK_COMPLETED, (e) => this._onTaskCompleted(e));
    task.on(SUBAGENT_EVENTS.TASK_FAILED, (e) => this._onTaskFailed(e));
    task.on(SUBAGENT_EVENTS.TASK_TIMED_OUT, (e) => this._onTaskTimedOut(e));
    task.on(SUBAGENT_EVENTS.RATE_LIMITED, (e) => this._onRateLimited(e));

    // 检查并发限制
    if (this.runningTasks.size >= this.config.MAX_CONCURRENT) {
      this.pendingQueue.push(task);
      this._emitEvent(SUBAGENT_EVENTS.RATE_LIMITED, {
        taskId: task.taskId,
        queueLength: this.pendingQueue.length
      });
    } else {
      this._scheduleTask(task);
    }

    return task;
  }

  /**
   * 批量提交任务 - 借鉴DeerFlow的并行执行
   * @param {Array} taskConfigs - 任务配置数组
   * @returns {Promise<Array>} 所有任务结果
   */
  async submitBatch(taskConfigs) {
    const tasks = taskConfigs.map(config => this.submitTask(config));
    return Promise.all(tasks.map(t => 
      t.then(task => new Promise(resolve => {
        task.on(SUBAGENT_EVENTS.TASK_COMPLETED, () => resolve(task));
        task.on(SUBAGENT_EVENTS.TASK_FAILED, () => resolve(task));
      }))
    ));
  }

  _scheduleTask(task) {
    const executor = this._getAvailableExecutor();
    if (!executor) {
      this.pendingQueue.push(task);
      return;
    }
    executor.busy = true;
    executor.currentTask = task;
    this.runningTasks.set(task.taskId, task);
    task.start();
  }

  _getAvailableExecutor() {
    const available = this.executionPool.find(e => !e.busy);
    return available || null;
  }

  _onTaskStarted(event) {
    this._emitEvent(SUBAGENT_EVENTS.TASK_STARTED, event);
    
    // 设置超时定时器
    const task = this.runningTasks.get(event.taskId);
    if (task) {
      task._timeoutTimer = setTimeout(() => {
        if (task.status === SUBAGENT_STATUS.RUNNING) {
          task.timeoutExpired();
        }
      }, task.timeout);
    }
  }

  async _onTaskCompleted(event) {
    this._emitEvent(SUBAGENT_EVENTS.TASK_COMPLETED, event);
    this._cleanupTask(event.taskId);
    this._scheduleNext();
  }

  async _onTaskFailed(event) {
    this._emitEvent(SUBAGENT_EVENTS.TASK_FAILED, event);
    this._cleanupTask(event.taskId);
    this._scheduleNext();
  }

  async _onTaskTimedOut(event) {
    this._emitEvent(SUBAGENT_EVENTS.TASK_TIMED_OUT, event);
    this._cleanupTask(event.taskId);
    this._scheduleNext();
  }

  _onRateLimited(event) {
    this._emitEvent(SUBAGENT_EVENTS.RATE_LIMITED, event);
    // 延迟重试
    setTimeout(() => {
      const task = this.runningTasks.get(event.taskId);
      if (task && task.status === SUBAGENT_STATUS.PENDING) {
        this._scheduleTask(task);
      }
    }, this.config.RETRY_DELAY);
  }

  _cleanupTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      if (task._timeoutTimer) {
        clearTimeout(task._timeoutTimer);
      }
      if (task.status === SUBAGENT_STATUS.COMPLETED) {
        this.completedTasks.push(task);
      } else {
        this.failedTasks.push(task);
      }
      this.runningTasks.delete(taskId);
      
      // 释放执行器
      const executor = this.executionPool.find(e => e.currentTask?.taskId === taskId);
      if (executor) {
        executor.busy = false;
        executor.currentTask = null;
      }
    }
  }

  _scheduleNext() {
    if (this.pendingQueue.length > 0 && 
        this.runningTasks.size < this.config.MAX_CONCURRENT) {
      const nextTask = this.pendingQueue.shift();
      this._scheduleTask(nextTask);
    }
    
    // 检查是否全部完成
    if (this.runningTasks.size === 0 && this.pendingQueue.length === 0) {
      this._emitEvent(SUBAGENT_EVENTS.ALL_COMPLETED, {
        total: this.completedTasks.length + this.failedTasks.length,
        completed: this.completedTasks.length,
        failed: this.failedTasks.length
      });
    }
  }

  _emitEvent(type, data) {
    const event = {
      type,
      ...data,
      _timestamp: Date.now()
    };
    this.eventHistory.push(event);
    this.emit(type, event);
  }

  /**
   * 获取执行器状态
   */
  getStatus() {
    return {
      config: {
        maxConcurrent: this.config.MAX_CONCURRENT,
        taskTimeout: this.config.TASK_TIMEOUT,
        schedulerPoolSize: this.config.SCHEDULER_POOL_SIZE,
        executorPoolSize: this.config.EXECUTOR_POOL_SIZE
      },
      pools: {
        scheduler: this.schedulerPool,
        executor: this.executionPool.map(e => ({
          id: e.id,
          busy: e.busy,
          currentTask: e.currentTask?.taskId
        }))
      },
      tasks: {
        running: this.runningTasks.size,
        pending: this.pendingQueue.length,
        completed: this.completedTasks.length,
        failed: this.failedTasks.length,
        total: this.runningTasks.size + this.pendingQueue.length + 
               this.completedTasks.length + this.failedTasks.length
      },
      runningTasks: Array.from(this.runningTasks.values()).map(t => t.getProgress()),
      eventHistory: this.eventHistory.slice(-20)  // 最近20个事件
    };
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const task = this.runningTasks.get(taskId) || 
                 this.pendingQueue.find(t => t.taskId === taskId);
    if (task) {
      return task.cancel();
    }
    return false;
  }

  /**
   * 获取任务结果
   */
  getTaskResult(taskId) {
    const task = this.runningTasks.get(taskId) ||
                 this.completedTasks.find(t => t.taskId === taskId) ||
                 this.failedTasks.find(t => t.taskId === taskId);
    return task ? task.toJSON() : null;
  }
}

// ============== SubAgent注册表 ==============
class SubAgentRegistry extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this._registerBuiltins();
  }

  _registerBuiltins() {
    // 借鉴DeerFlow的built-in agents
    this.register('general-purpose', {
      name: 'General Purpose Agent',
      description: '通用任务执行Agent，拥有除task外的所有工具',
      capabilities: ['search', 'code', 'write', 'analyze', 'research'],
      tools: ['*'],  // 除task外的所有工具
      systemPrompt: '你是一个多功能的AI助手，可以执行各种任务。'
    });

    this.register('bash', {
      name: 'Bash Agent',
      description: '命令执行专家，专门处理shell命令',
      capabilities: ['execute_command', 'manage_processes'],
      tools: ['bash', 'read_file', 'write_file', 'ls'],
      systemPrompt: '你是一个命令行专家，擅长执行和管理shell命令。'
    });

    this.register('researcher', {
      name: 'Research Agent',
      description: '研究专家，专门进行深度研究',
      capabilities: ['web_search', 'data_analysis', 'report_writing'],
      tools: ['search', 'fetch', 'analyze'],
      systemPrompt: '你是一个专业的研究助手，擅长深入研究和分析。'
    });

    this.register('coder', {
      name: 'Code Agent',
      description: '编程专家，专门处理代码任务',
      capabilities: ['write_code', 'debug', 'review_code', 'refactor'],
      tools: ['write_file', 'read_file', 'bash'],
      systemPrompt: '你是一个资深的软件开发工程师，擅长各种编程任务。'
    });

    this.register('writer', {
      name: 'Writer Agent',
      description: '写作专家，专门处理写作任务',
      capabilities: ['write_article', 'edit_content', 'proofread'],
      tools: ['write_file', 'read_file'],
      systemPrompt: '你是一个专业的写作助手，擅长各类文章和内容的创作。'
    });
  }

  register(type, config) {
    this.agents.set(type, {
      type,
      ...config,
      registeredAt: Date.now()
    });
    this.emit('agent_registered', { type, config });
  }

  get(type) {
    return this.agents.get(type) || null;
  }

  list() {
    return Array.from(this.agents.values());
  }

  has(type) {
    return this.agents.has(type);
  }
}

// ============== 主管理器 ==============
class EnhancedSubAgentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.executor = new SubAgentExecutor(config);
    this.registry = new SubAgentRegistry();
    this.activeTasks = new Map();
    
    // 监听执行器事件
    this.executor.on(SUBAGENT_EVENTS.TASK_STARTED, (e) => this._onTaskStarted(e));
    this.executor.on(SUBAGENT_EVENTS.TASK_COMPLETED, (e) => this._onTaskCompleted(e));
    this.executor.on(SUBAGENT_EVENTS.TASK_FAILED, (e) => this._onTaskFailed(e));
    this.executor.on(SUBAGENT_EVENTS.ALL_COMPLETED, (e) => this._onAllCompleted(e));
  }

  /**
   * 创建子Agent任务 - 借鉴DeerFlow的task()工具
   * @param {Object} config - 任务配置
   * @returns {Promise<Object>} 任务结果
   */
  async createTask(config) {
    const { type, prompt, description, context } = config;
    
    // 验证Agent类型
    if (!this.registry.has(type)) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agent = this.registry.get(type);
    
    // 创建任务
    const task = await this.executor.submitTask({
      subagentType: type,
      prompt: `${agent.systemPrompt}\n\n任务：${prompt}`,
      description: description || prompt.substring(0, 100),
      context
    });

    this.activeTasks.set(task.taskId, task);
    
    return task;
  }

  /**
   * 批量创建任务 - 借鉴DeerFlow的并行执行
   * @param {Array} configs - 任务配置数组
   * @returns {Promise<Array>} 所有任务结果
   */
  async createBatch(configs) {
    const results = [];
    for (const config of configs) {
      try {
        const task = await this.createTask(config);
        results.push(task);
      } catch (error) {
        results.push({ error: error.message, config });
      }
    }
    return results;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    return this.executor.getTaskResult(taskId);
  }

  /**
   * 获取所有任务状态
   */
  getAllStatus() {
    return this.executor.getStatus();
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const result = this.executor.cancelTask(taskId);
    if (result) {
      this.activeTasks.delete(taskId);
    }
    return result;
  }

  /**
   * 注册新Agent类型
   */
  registerAgent(type, config) {
    this.registry.register(type, config);
  }

  /**
   * 列出所有可用Agent
   */
  listAgents() {
    return this.registry.list();
  }

  _onTaskStarted(event) {
    this.emit(SUBAGENT_EVENTS.TASK_STARTED, event);
  }

  _onTaskCompleted(event) {
    this.activeTasks.delete(event.taskId);
    this.emit(SUBAGENT_EVENTS.TASK_COMPLETED, event);
  }

  _onTaskFailed(event) {
    this.activeTasks.delete(event.taskId);
    this.emit(SUBAGENT_EVENTS.TASK_FAILED, event);
  }

  _onAllCompleted(event) {
    this.emit(SUBAGENT_EVENTS.ALL_COMPLETED, event);
  }

  /**
   * 生成SSE事件流 - 借鉴DeerFlow
   */
  *generateSSEStream(taskId) {
    const task = this.activeTasks.get(taskId) || 
                 this.executor.getTaskResult(taskId);
    if (!task) return;

    const eventTypes = [
      SUBAGENT_EVENTS.TASK_STARTED,
      SUBAGENT_EVENTS.TASK_RUNNING,
      SUBAGENT_EVENTS.TASK_COMPLETED,
      SUBAGENT_EVENTS.TASK_FAILED
    ];

    for (const eventType of eventTypes) {
      task.on(eventType, (data) => {
        yield `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      });
    }
  }
}

// ============== 导出 ==============
module.exports = {
  EnhancedSubAgentManager,
  SubAgentExecutor,
  SubAgentTask,
  SubAgentRegistry,
  SUBAGENT_EVENTS,
  SUBAGENT_STATUS,
  DEFAULT_CONFIG
};
