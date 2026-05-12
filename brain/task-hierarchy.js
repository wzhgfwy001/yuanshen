/**
 * Task Hierarchy - 任务分层系统
 * 基于 Claude Code 的 src/tasks/ 设计理念
 * 支持本地/远程/Agent三种任务类型
 */

const fs = require('fs');
const path = require('path');

// 状态文件
const STATE_FILE = path.join(__dirname, 'task-state.json');

/**
 * 任务优先级
 */
const PRIORITY = { P0: 0, P1: 1, P2: 2, P3: 3 };

/**
 * 任务状态
 */
const TASK_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * 任务类型
 */
const TASK_TYPE = {
  LOCAL: 'local',      // 同步任务
  REMOTE: 'remote',     // 异步回调任务
  AGENT: 'agent'       // 子Agent任务
};

/**
 * 任务类
 */
class Task {
  constructor(config) {
    this.id = config.id || `t-${Date.now()}`;
    this.type = config.type || TASK_TYPE.LOCAL;
    this.priority = config.priority || 'P2';
    this.status = TASK_STATUS.PENDING;
    this.description = config.description || '';
    this.data = config.data || null;
    this.result = null;
    this.error = null;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.callback = config.callback || null;  // 远程任务的回调URL
    this.agentId = config.agentId || null;      // Agent任务的Agent ID
    this.dependsOn = config.dependsOn || [];    // 依赖的任务ID
  }
}

/**
 * Task Manager
 */
class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.localQueue = [];
    this.remoteQueue = [];
    this.agentQueue = [];
    this.loadState();
  }

  /**
   * 添加任务
   */
  addTask(config) {
    const task = new Task(config);
    this.tasks.set(task.id, task);
    
    // 根据类型加入对应队列
    switch (task.type) {
      case TASK_TYPE.LOCAL:
        this.localQueue.push(task.id);
        break;
      case TASK_TYPE.REMOTE:
        this.remoteQueue.push(task.id);
        break;
      case TASK_TYPE.AGENT:
        this.agentQueue.push(task.id);
        break;
    }
    
    // 按优先级排序
    this.sortQueue(this.localQueue);
    this.sortQueue(this.remoteQueue);
    this.sortQueue(this.agentQueue);
    
    this.saveState();
    console.log(`[Task] Created ${task.type} task: ${task.id}`);
    return task;
  }

  /**
   * 优先级排序
   */
  sortQueue(queue) {
    queue.sort((a, b) => {
      const taskA = this.tasks.get(a);
      const taskB = this.tasks.get(b);
      return (PRIORITY[taskA.priority] || 2) - (PRIORITY[taskB.priority] || 2);
    });
  }

  /**
   * 获取下一个可执行的任务
   */
  dequeue(type = TASK_TYPE.LOCAL) {
    let queue;
    switch (type) {
      case TASK_TYPE.LOCAL: queue = this.localQueue; break;
      case TASK_TYPE.REMOTE: queue = this.remoteQueue; break;
      case TASK_TYPE.AGENT: queue = this.agentQueue; break;
      default: return null;
    }
    
    while (queue.length > 0) {
      const taskId = queue.shift();
      const task = this.tasks.get(taskId);
      
      if (!task) continue;
      
      // 检查依赖是否满足
      if (this.checkDependencies(task)) {
        task.status = TASK_STATUS.RUNNING;
        task.startedAt = new Date().toISOString();
        this.saveState();
        return task;
      }
    }
    
    return null;
  }

  /**
   * 检查依赖是否满足
   */
  checkDependencies(task) {
    for (const depId of task.dependsOn) {
      const dep = this.tasks.get(depId);
      if (!dep || dep.status !== TASK_STATUS.COMPLETED) {
        return false;
      }
    }
    return true;
  }

  /**
   * 更新任务状态
   */
  updateStatus(taskId, status, result = null, error = null) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.status = status;
    task.result = result;
    task.error = error;
    
    if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.FAILED) {
      task.completedAt = new Date().toISOString();
    }
    
    this.saveState();
    return task;
  }

  /**
   * 获取任务状态
   */
  getStatus(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务（可选过滤）
   */
  getAllTasks(filter = {}) {
    const result = [];
    for (const task of this.tasks.values()) {
      let match = true;
      
      if (filter.status && task.status !== filter.status) match = false;
      if (filter.type && task.type !== filter.type) match = false;
      if (filter.priority && task.priority !== filter.priority) match = false;
      
      if (match) result.push(task);
    }
    return result;
  }

  /**
   * 取消任务
   */
  cancel(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    task.status = TASK_STATUS.CANCELLED;
    task.completedAt = new Date().toISOString();
    
    // 从队列中移除
    this.removeFromQueue(taskId);
    
    this.saveState();
    return true;
  }

  removeFromQueue(taskId) {
    this.localQueue = this.localQueue.filter(id => id !== taskId);
    this.remoteQueue = this.remoteQueue.filter(id => id !== taskId);
    this.agentQueue = this.agentQueue.filter(id => id !== taskId);
  }

  /**
   * 统计信息
   */
  stats() {
    const counts = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    
    for (const task of this.tasks.values()) {
      counts[task.status] = (counts[task.status] || 0) + 1;
    }
    
    return {
      total: this.tasks.size,
      queues: {
        local: this.localQueue.length,
        remote: this.remoteQueue.length,
        agent: this.agentQueue.length
      },
      counts
    };
  }

  /**
   * 保存状态
   */
  saveState() {
    const state = {
      tasks: Array.from(this.tasks.entries()),
      queues: {
        local: this.localQueue,
        remote: this.remoteQueue,
        agent: this.agentQueue
      },
      savedAt: new Date().toISOString()
    };
    
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('[Task] Failed to save state:', e);
    }
  }

  /**
   * 加载状态
   */
  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        
        this.tasks = new Map(state.tasks);
        this.localQueue = state.queues.local || [];
        this.remoteQueue = state.queues.remote || [];
        this.agentQueue = state.queues.agent || [];
        
        console.log(`[Task] Loaded ${this.tasks.size} tasks from state`);
      }
    } catch (e) {
      console.log('[Task] No previous state found');
    }
  }
}

const taskManager = new TaskManager();

module.exports = {
  taskManager,
  Task,
  TaskManager,
  TASK_STATUS,
  TASK_TYPE,
  PRIORITY
};

// 使用示例
if (require.main === module) {
  // 创建任务
  const task1 = taskManager.addTask({
    type: 'local',
    priority: 'P1',
    description: '搜索文件'
  });
  
  const task2 = taskManager.addTask({
    type: 'agent',
    priority: 'P2',
    description: '深度研究'
  });
  
  console.log('Stats:', taskManager.stats());
  console.log('Task 1:', taskManager.getStatus(task1.id));
}
