/**
 * DeerFlow增强版任务分解器
 * 
 * 借鉴DeerFlow的设计：
 * 1. TodoList模式 - 状态跟踪 (pending/in_progress/completed)
 * 2. 事件驱动 - task_started, task_running, task_completed/task_failed
 * 3. 结构化输出 - 清晰的任务状态机
 * 4. 并发控制 - MAX_CONCURRENT_SUBAGENTS限制
 */

const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  WAITING: 'waiting'  // 等待依赖
};

const TASK_EVENTS = {
  TASK_STARTED: 'task_started',
  TASK_RUNNING: 'task_running',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TASK_WAITING: 'task_waiting',
  ALL_COMPLETED: 'all_completed'
};

const MAX_CONCURRENT_SUBAGENTS = 3;  // 借鉴DeerFlow的并发限制

// ============== 任务项类 ==============
class TaskItem extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || this._generateId();
    this.name = config.name;
    this.description = config.description;
    this.agentRole = config.agentRole;
    this.status = TASK_STATUS.PENDING;
    this.input = config.input || [];
    this.output = null;
    this.error = null;
    this.estimatedTime = config.estimatedTime || 60;
    this.actualTime = 0;
    this.startTime = null;
    this.endTime = null;
    this.retryCount = 0;
    this.maxRetries = config.maxRetries || 3;
    this.dependencies = config.dependencies || [];
    this.metadata = config.metadata || {};
  }

  _generateId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    if (this.status !== TASK_STATUS.PENDING && this.status !== TASK_STATUS.WAITING) {
      return false;
    }
    this.status = TASK_STATUS.IN_PROGRESS;
    this.startTime = Date.now();
    this.emit(TASK_EVENTS.TASK_STARTED, this._getState());
    return true;
  }

  complete(result) {
    if (this.status !== TASK_STATUS.IN_PROGRESS) {
      return false;
    }
    this.status = TASK_STATUS.COMPLETED;
    this.output = result;
    this.endTime = Date.now();
    this.actualTime = this.endTime - this.startTime;
    this.emit(TASK_EVENTS.TASK_COMPLETED, this._getState());
    return true;
  }

  fail(error) {
    if (this.status !== TASK_STATUS.IN_PROGRESS) {
      return false;
    }
    this.retryCount++;
    if (this.retryCount < this.maxRetries) {
      this.status = TASK_STATUS.PENDING;
      this.emit(TASK_EVENTS.TASK_WAITING, { task: this._getState(), retry: true });
      return false;
    }
    this.status = TASK_STATUS.FAILED;
    this.error = error;
    this.endTime = Date.now();
    this.actualTime = this.endTime - this.startTime;
    this.emit(TASK_EVENTS.TASK_FAILED, this._getState());
    return true;
  }

  waitForDeps() {
    if (this.status === TASK_STATUS.IN_PROGRESS) {
      return false;
    }
    this.status = TASK_STATUS.WAITING;
    this.emit(TASK_EVENTS.TASK_WAITING, this._getState());
    return true;
  }

  getProgress() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      progress: this._calculateProgress(),
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      retryCount: this.retryCount
    };
  }

  _calculateProgress() {
    switch (this.status) {
      case TASK_STATUS.PENDING: return 0;
      case TASK_STATUS.WAITING: return 0;
      case TASK_STATUS.IN_PROGRESS: return 50;
      case TASK_STATUS.COMPLETED: return 100;
      case TASK_STATUS.FAILED: return -1;
      default: return 0;
    }
  }

  _getState() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      output: this.output,
      error: this.error,
      progress: this.getProgress(),
      metadata: this.metadata
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      agentRole: this.agentRole,
      status: this.status,
      input: this.input,
      output: this.output,
      error: this.error,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      retryCount: this.retryCount,
      dependencies: this.dependencies,
      metadata: this.metadata
    };
  }
}

// ============== 任务队列管理器 ==============
class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || MAX_CONCURRENT_SUBAGENTS;
    this.runningTasks = new Map();
    this.pendingQueue = [];
    this.completedTasks = [];
    this.failedTasks = [];
  }

  addTask(taskItem) {
    this.pendingQueue.push(taskItem);
    taskItem.on(TASK_EVENTS.TASK_STARTED, (state) => this._onTaskStarted(state));
    taskItem.on(TASK_EVENTS.TASK_COMPLETED, (state) => this._onTaskCompleted(state));
    taskItem.on(TASK_EVENTS.TASK_FAILED, (state) => this._onTaskFailed(state));
    taskItem.on(TASK_EVENTS.TASK_WAITING, (data) => this._onTaskWaiting(data));
    this._trySchedule();
  }

  _onTaskStarted(state) {
    this.runningTasks.set(state.id, state);
    this.emit(TASK_EVENTS.TASK_RUNNING, {
      runningCount: this.runningTasks.size,
      task: state
    });
  }

  _onTaskCompleted(state) {
    this.runningTasks.delete(state.id);
    this.completedTasks.push(state);
    this.emit(TASK_EVENTS.TASK_COMPLETED, {
      completedCount: this.completedTasks.length,
      task: state
    });
    this._trySchedule();
    this._checkAllCompleted();
  }

  _onTaskFailed(state) {
    this.runningTasks.delete(state.id);
    this.failedTasks.push(state);
    this.emit(TASK_EVENTS.TASK_FAILED, {
      failedCount: this.failedTasks.length,
      task: state
    });
    this._trySchedule();
    this._checkAllCompleted();
  }

  _onTaskWaiting(data) {
    if (data.retry) {
      // 重试等待后重新入队
      setTimeout(() => this._trySchedule(), 1000);
    }
  }

  _trySchedule() {
    while (
      this.runningTasks.size < this.maxConcurrent &&
      this.pendingQueue.length > 0
    ) {
      const task = this.pendingQueue.shift();
      const canStart = this._checkDependencies(task);
      if (canStart) {
        task.start();
      } else {
        task.waitForDeps();
        // 重新检查依赖，等待依赖完成后再次尝试
        this.pendingQueue.unshift(task);
        break;
      }
    }
  }

  _checkDependencies(task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    return task.dependencies.every(depId => {
      const depTask = this.completedTasks.find(t => t.id === depId);
      return depTask && depTask.status === TASK_STATUS.COMPLETED;
    });
  }

  _checkAllCompleted() {
    const totalTasks = this.pendingQueue.length + this.runningTasks.size + 
                       this.completedTasks.length + this.failedTasks.length;
    if (this.pendingQueue.length === 0 && this.runningTasks.size === 0) {
      this.emit(TASK_EVENTS.ALL_COMPLETED, {
        total: totalTasks,
        completed: this.completedTasks.length,
        failed: this.failedTasks.length,
        results: this.completedTasks.map(t => t.output)
      });
    }
  }

  getStatus() {
    return {
      maxConcurrent: this.maxConcurrent,
      running: this.runningTasks.size,
      pending: this.pendingQueue.length,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      runningTasks: Array.from(this.runningTasks.values()),
      progress: this._calculateOverallProgress()
    };
  }

  _calculateOverallProgress() {
    const total = this.completedTasks.length + this.failedTasks.length + 
                  this.runningTasks.size + this.pendingQueue.length;
    if (total === 0) return 0;
    const completed = this.completedTasks.length;
    const partial = this.runningTasks.size * 0.5;  // 运行中的任务计50%
    return Math.round(((completed + partial) / total) * 100);
  }
}

// ============== DeerFlow增强版任务分解器 ==============
class EnhancedTaskDecomposer {
  constructor(options = {}) {
    this.queue = new TaskQueue({
      maxConcurrent: options.maxConcurrent || MAX_CONCURRENT_SUBAGENTS
    });
    this.taskTemplates = this._loadTemplates();
  }

  _loadTemplates() {
    return {
      'creative-writing': {
        name: '创意写作',
        subtasks: [
          { name: '素材收集', agentRole: '搜索专家', estimatedTime: 60 },
          { name: '大纲设计', agentRole: '大纲专家', estimatedTime: 120, dependencies: ['素材收集'] },
          { name: '内容撰写', agentRole: '写作专家', estimatedTime: 300, dependencies: ['大纲设计'] },
          { name: '质量审查', agentRole: '审查专家', estimatedTime: 60, dependencies: ['内容撰写'] }
        ]
      },
      'data-analysis': {
        name: '数据分析',
        subtasks: [
          { name: '数据获取', agentRole: '数据专家', estimatedTime: 60 },
          { name: '数据清洗', agentRole: '清洗专家', estimatedTime: 120, dependencies: ['数据获取'] },
          { name: '数据分析', agentRole: '分析专家', estimatedTime: 180, dependencies: ['数据清洗'] },
          { name: '可视化', agentRole: '图表专家', estimatedTime: 120, dependencies: ['数据分析'] },
          { name: '报告撰写', agentRole: '写作专家', estimatedTime: 120, dependencies: ['可视化'] }
        ]
      },
      'code-development': {
        name: '代码开发',
        subtasks: [
          { name: '需求分析', agentRole: '需求专家', estimatedTime: 60 },
          { name: '架构设计', agentRole: '架构专家', estimatedTime: 120, dependencies: ['需求分析'] },
          { name: '编码实现', agentRole: '开发专家', estimatedTime: 300, dependencies: ['架构设计'] },
          { name: '测试验证', agentRole: '测试专家', estimatedTime: 120, dependencies: ['编码实现'] },
          { name: '部署上线', agentRole: '运维专家', estimatedTime: 60, dependencies: ['测试验证'] }
        ]
      }
    };
  }

  /**
   * 分解任务 - 借鉴DeerFlow的结构化分解
   * @param {Object} taskConfig - 任务配置
   * @param {string} taskConfig.task - 任务描述
   * @param {string} taskConfig.type - 任务类型
   * @param {Object} taskConfig.context - 上下文信息
   * @returns {Object} 分解结果
   */
  decompose(taskConfig) {
    const { task, type, context = {} } = taskConfig;
    
    // 1. 任务理解
    const taskUnderstanding = this._understandTask(task, type);
    
    // 2. 选择模板或智能分解
    let subtasks;
    if (type && this.taskTemplates[type]) {
      subtasks = this._applyTemplate(this.taskTemplates[type], context);
    } else {
      subtasks = this._smartDecompose(task, taskUnderstanding);
    }
    
    // 3. 构建依赖图
    const dependencyGraph = this._buildDependencyGraph(subtasks);
    
    // 4. 生成执行计划
    const executionPlan = this._generateExecutionPlan(subtasks, dependencyGraph);
    
    // 5. 创建任务队列
    const taskItems = subtasks.map(st => new TaskItem({
      name: st.name,
      description: st.description,
      agentRole: st.agentRole,
      estimatedTime: st.estimatedTime,
      dependencies: st.dependencies || [],
      maxRetries: st.maxRetries || 3,
      metadata: st.metadata || {}
    }));

    // 6. 返回分解结果
    return {
      taskId: `decomp-${Date.now()}`,
      originalTask: task,
      taskUnderstanding,
      subtasks: subtasks.map(st => ({
        id: st.id,
        name: st.name,
        description: st.description,
        agentRole: st.agentRole,
        estimatedTime: st.estimatedTime,
        dependencies: st.dependencies || [],
        status: TASK_STATUS.PENDING
      })),
      dependencyGraph,
      executionPlan,
      taskQueue: this.queue,
      taskItems
    };
  }

  _understandTask(task, type) {
    // 借鉴DeerFlow的任务理解逻辑
    return {
      verb: this._extractVerb(task),
      object: this._extractObject(task),
      modifiers: this._extractModifiers(task),
      constraints: this._extractConstraints(task),
      suggestedType: type || this._inferType(task)
    };
  }

  _extractVerb(task) {
    const verbs = ['写', '开发', '分析', '设计', '研究', '创建', '生成', '优化', '审查', '收集'];
    for (const v of verbs) {
      if (task.includes(v)) return v;
    }
    return '执行';
  }

  _extractObject(task) {
    const objects = ['小说', '文章', '代码', '报告', '系统', '应用', '数据', '大纲', '内容', 'PPT'];
    for (const o of objects) {
      if (task.includes(o)) return o;
    }
    return '任务';
  }

  _extractModifiers(task) {
    const modifiers = [];
    const patterns = [
      /(\d+)[章节页个]/g,
      /(专业|详细|简洁|快速)/g,
      /(暴风雪|悬疑|科幻|爱情)/g
    ];
    for (const p of patterns) {
      const matches = task.match(p);
      if (matches) modifiers.push(...matches);
    }
    return modifiers;
  }

  _extractConstraints(task) {
    const constraints = [];
    if (task.includes('不') || task.includes('禁止') || task.includes('避免')) {
      constraints.push('有约束条件');
    }
    if (task.includes('必须') || task.includes('一定')) {
      constraints.push('强制性要求');
    }
    return constraints;
  }

  _inferType(task) {
    if (task.includes('写') && (task.includes('小说') || task.includes('文章') || task.includes('内容'))) {
      return 'creative-writing';
    }
    if (task.includes('分析') || task.includes('数据')) {
      return 'data-analysis';
    }
    if (task.includes('开发') || task.includes('代码') || task.includes('程序')) {
      return 'code-development';
    }
    return 'general';
  }

  _applyTemplate(template, context) {
    return template.subtasks.map((st, index) => ({
      id: `subtask-${index + 1}`,
      name: st.name,
      description: `${st.name} - ${context.topic || ''}`,
      agentRole: st.agentRole,
      estimatedTime: st.estimatedTime,
      dependencies: st.dependencies ? [] : [], // 依赖通过ID引用
      maxRetries: 3,
      metadata: {}
    }));
  }

  _smartDecompose(task, understanding) {
    // 智能分解 - 根据任务理解自动生成子任务
    const subtasks = [];
    let idCounter = 1;

    // 根据动词和对象决定分解方式
    const { verb, object } = understanding;

    if (verb === '写' && object === '小说') {
      subtasks.push(
        { id: `subtask-${idCounter++}`, name: '素材收集', agentRole: '搜索专家', estimatedTime: 60 },
        { id: `subtask-${idCounter++}`, name: '大纲设计', agentRole: '大纲专家', estimatedTime: 120, dependencies: ['subtask-1'] },
        { id: `subtask-${idCounter++}`, name: '章节撰写', agentRole: '写作专家', estimatedTime: 300, dependencies: ['subtask-2'] },
        { id: `subtask-${idCounter++}`, name: '质量审查', agentRole: '审查专家', estimatedTime: 60, dependencies: ['subtask-3'] }
      );
    } else if (verb === '分析') {
      subtasks.push(
        { id: `subtask-${idCounter++}`, name: '数据获取', agentRole: '数据专家', estimatedTime: 60 },
        { id: `subtask-${idCounter++}`, name: '数据分析', agentRole: '分析专家', estimatedTime: 120, dependencies: ['subtask-1'] },
        { id: `subtask-${idCounter++}`, name: '报告生成', agentRole: '写作专家', estimatedTime: 60, dependencies: ['subtask-2'] }
      );
    } else {
      // 默认分解
      subtasks.push(
        { id: `subtask-${idCounter++}`, name: '准备', agentRole: '助手', estimatedTime: 30 },
        { id: `subtask-${idCounter++}`, name: '执行', agentRole: '专家', estimatedTime: 120, dependencies: ['subtask-1'] },
        { id: `subtask-${idCounter++}`, name: '验证', agentRole: '审查专家', estimatedTime: 30, dependencies: ['subtask-2'] }
      );
    }

    return subtasks;
  }

  _buildDependencyGraph(subtasks) {
    const nodes = subtasks.map(st => st.id);
    const edges = [];
    const parallelGroups = [];

    subtasks.forEach(st => {
      if (st.dependencies) {
        st.dependencies.forEach(dep => {
          edges.push({ from: dep, to: st.id });
        });
      }
    });

    // 识别并行组
    const levels = this._calculateLevels(subtasks, edges);
    levels.forEach((levelTasks, index) => {
      parallelGroups.push(levelTasks.map(t => t.id));
    });

    return {
      nodes,
      edges,
      parallelGroups,
      totalSubtasks: subtasks.length
    };
  }

  _calculateLevels(subtasks, edges) {
    const levels = [];
    const assigned = new Set();
    const remaining = new Set(subtasks.map(st => st.id));

    while (remaining.size > 0) {
      const levelTasks = subtasks.filter(st => {
        if (!remaining.has(st.id)) return false;
        if (!st.dependencies || st.dependencies.length === 0) return true;
        return st.dependencies.every(dep => assigned.has(dep));
      });

      if (levelTasks.length === 0) break;

      levels.push(levelTasks);
      levelTasks.forEach(st => {
        assigned.add(st.id);
        remaining.delete(st.id);
      });
    }

    return levels;
  }

  _generateExecutionPlan(subtasks, dependencyGraph) {
    const criticalPath = this._findCriticalPath(subtasks, dependencyGraph);
    const totalEstimatedTime = criticalPath.reduce((sum, id) => {
      const st = subtasks.find(s => s.id === id);
      return sum + (st ? st.estimatedTime : 0);
    }, 0);

    return {
      totalEstimatedTime,
      criticalPath,
      parallelismDegree: Math.max(...dependencyGraph.parallelGroups.map(g => g.length)),
      estimatedCost: this._estimateCost(subtasks)
    };
  }

  _findCriticalPath(subtasks, dependencyGraph) {
    // 简化版关键路径计算
    if (dependencyGraph.parallelGroups.length === 0) return [];
    
    // 沿最长路径返回第一个并行组的任务作为起点
    const firstGroup = dependencyGraph.parallelGroups[0];
    if (!firstGroup || firstGroup.length === 0) return [];
    
    return [firstGroup[0]];
  }

  _estimateCost(subtasks) {
    const baseCost = subtasks.reduce((sum, st) => sum + st.estimatedTime, 0);
    return {
      tokenEstimate: Math.round(baseCost * 100),  // 粗略估算
      dollarEstimate: (baseCost / 60) * 0.01  // 假设每分钟$0.01
    };
  }

  /**
   * 执行分解后的任务队列
   * @param {Object} decomposition - 分解结果
   * @param {Function} executor - 执行器函数 (task) => Promise(result)
   */
  async execute(decomposition, executor) {
    const { taskItems, taskQueue } = decomposition;

    // 添加所有任务到队列
    taskItems.forEach(item => taskQueue.addTask(item));

    // 设置完成监听
    return new Promise((resolve, reject) => {
      taskQueue.on(TASK_EVENTS.ALL_COMPLETED, (result) => {
        resolve({
          success: result.failed === 0,
          total: result.total,
          completed: result.completed,
          failed: result.failed,
          results: result.results
        });
      });

      // 开始执行
      taskQueue.on(TASK_EVENTS.TASK_STARTED, async (taskState) => {
        const taskItem = taskItems.find(t => t.id === taskState.id);
        if (!taskItem) return;

        try {
          const result = await executor(taskItem);
          taskItem.complete(result);
        } catch (error) {
          taskItem.fail(error.message || String(error));
        }
      });

      // 初始化调度
      taskQueue.getStatus(); // 触发初始调度
    });
  }

  /**
   * 获取当前执行状态
   */
  getExecutionStatus() {
    return this.queue.getStatus();
  }

  /**
   * 监听任务事件
   */
  on(event, handler) {
    this.queue.on(event, handler);
    return this;
  }
}

// ============== 导出 ==============
module.exports = {
  EnhancedTaskDecomposer,
  TaskItem,
  TaskQueue,
  TASK_STATUS,
  TASK_EVENTS,
  MAX_CONCURRENT_SUBAGENTS
};
