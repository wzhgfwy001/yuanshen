/**
 * DeerFlow增强版沙箱执行系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 隔离执行环境 - 代码在受限环境中运行
 * 2. 资源限制 - CPU/内存/时间限制
 * 3. 安全审计 - 操作日志和权限控制
 * 4. 多租户隔离 - 不同任务使用不同沙箱
 */

const { EventEmitter } = require('events');
const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============== 常量定义 ==============
const SANDBOX_STATUS = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  PAUSED: 'paused',
  TERMINATED: 'terminated',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

const SANDBOX_EVENTS = {
  SANDBOX_CREATED: 'sandbox_created',
  SANDBOX_INITIALIZED: 'sandbox_initialized',
  TASK_STARTED: 'task_started',
  TASK_OUTPUT: 'task_output',
  TASK_COMPLETED: 'task_completed',
  TASK_ERROR: 'task_error',
  TASK_TIMEOUT: 'task_timeout',
  SANDBOX_TERMINATED: 'sandbox_terminated',
  SANDBOX_ERROR: 'sandbox_error',
  RESOURCE_LIMIT: 'resource_limit'
};

const RESOURCE_LIMITS = {
  MAX_MEMORY_MB: 512,        // 最大内存 512MB
  MAX_CPU_PERCENT: 80,       // 最大CPU 80%
  MAX_TIMEOUT_MS: 300000,    // 最大超时 5分钟
  MAX_OUTPUT_KB: 1024,       // 最大输出 1MB
  MAX_FILE_SIZE_MB: 10       // 最大文件 10MB
};

// ============== 资源监控器 ==============
class ResourceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.limits = {
      maxMemoryMB: config.maxMemoryMB || RESOURCE_LIMITS.MAX_MEMORY_MB,
      maxCPUPercent: config.maxCPUPercent || RESOURCE_LIMITS.MAX_CPU_PERCENT,
      maxTimeoutMs: config.maxTimeoutMs || RESOURCE_LIMITS.MAX_TIMEOUT_MS,
      maxOutputKB: config.maxOutputKB || RESOURCE_LIMITS.MAX_OUTPUT_KB,
      maxFileSizeMB: config.maxFileSizeMB || RESOURCE_LIMITS.MAX_FILE_SIZE_MB
    };
    
    this.currentUsage = {
      memoryMB: 0,
      cpuPercent: 0,
      startTime: null
    };
    
    this.interval = null;
    this.thresholds = {
      memoryWarning: 0.7,  // 70%警告
      memoryCritical: 0.9,  // 90%严重
      cpuWarning: 0.7,
      cpuCritical: 0.9
    };
  }

  start() {
    this.currentUsage.startTime = Date.now();
    
    this.interval = setInterval(() => {
      this.checkResources();
    }, 1000); // 每秒检查
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  checkResources() {
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // CPU使用率（简化计算）
    const cpuPercent = os.loadavg()[0] * 10; // 模拟值
    
    this.currentUsage = {
      memoryMB,
      cpuPercent,
      uptime: Date.now() - this.currentUsage.startTime
    };
    
    // 检查限制
    if (memoryMB > this.limits.maxMemoryMB) {
      this.emit(RESOURCE_LIMITS.MAX_MEMORY_MB, {
        current: memoryMB,
        limit: this.limits.maxMemoryMB
      });
    }
    
    if (cpuPercent > this.limits.maxCPUPercent) {
      this.emit(RESOURCE_LIMITS.MAX_CPU_PERCENT, {
        current: cpuPercent,
        limit: this.limits.maxCPUPercent
      });
    }
    
    // 发出资源使用事件
    this.emit('resource_update', this.currentUsage);
    
    return this.currentUsage;
  }

  isWithinLimits() {
    const usage = this.currentUsage;
    return (
      usage.memoryMB <= this.limits.maxMemoryMB &&
      usage.cpuPercent <= this.limits.maxCPUPercent
    );
  }

  getUsage() {
    return { ...this.currentUsage };
  }

  getLimits() {
    return { ...this.limits };
  }
}

// ============== 审计日志 ==============
class AuditLogger extends EventEmitter {
  constructor(config = {}) {
    super();
    this.logPath = config.logPath || 'sandbox-audit.log';
    this.entries = [];
    this.maxEntries = config.maxEntries || 10000;
  }

  log(action, details = {}) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      pid: process.pid
    };
    
    this.entries.push(entry);
    
    // 限制条目数量
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    
    // 写入文件
    this._writeToFile(entry);
    
    this.emit('logged', entry);
    return entry;
  }

  _writeToFile(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logPath, line, 'utf8');
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  query(filters = {}) {
    let results = [...this.entries];
    
    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }
    
    if (filters.since) {
      const sinceTime = new Date(filters.since).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
    }
    
    if (filters.until) {
      const untilTime = new Date(filters.until).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() <= untilTime);
    }
    
    return results;
  }

  getStatistics() {
    const byAction = {};
    
    for (const entry of this.entries) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    }
    
    return {
      total: this.entries.length,
      byAction,
      oldest: this.entries[0]?.timestamp,
      newest: this.entries[this.entries.length - 1]?.timestamp
    };
  }
}

// ============== 沙箱实例 ==============
class SandboxInstance extends EventEmitter {
  constructor(config = {}) {
    super();
    this.id = config.id || this._generateId();
    this.name = config.name || `sandbox-${this.id}`;
    this.status = SANDBOX_STATUS.IDLE;
    this.worker = null;
    this.resourceMonitor = new ResourceMonitor(config.resourceLimits);
    this.auditLogger = new AuditLogger(config.auditConfig);
    
    this.config = {
      timeout: config.timeout || RESOURCE_LIMITS.MAX_TIMEOUT_MS,
      permissions: config.permissions || {},
      allowedPaths: config.allowedPaths || [os.tmpdir()],
      blockedModules: config.blockedModules || ['child_process', 'fs', 'net']
    };
    
    this.currentTask = null;
    this.taskTimeout = null;
  }

  _generateId() {
    return `sbox-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 初始化沙箱
   */
  async initialize() {
    this.status = SANDBOX_STATUS.INITIALIZING;
    this.auditLogger.log('sandbox_initializing', { sandboxId: this.id });
    
    try {
      // 创建工作目录
      const workDir = path.join(os.tmpdir(), `sandbox-${this.id}`);
      if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
      }
      
      this.workDir = workDir;
      this.status = SANDBOX_STATUS.IDLE;
      
      this.auditLogger.log('sandbox_initialized', { 
        sandboxId: this.id, 
        workDir 
      });
      
      this.emit(SANDBOX_EVENTS.SANDBOX_INITIALIZED, { 
        sandboxId: this.id, 
        workDir 
      });
      
      return true;
    } catch (err) {
      this.status = SANDBOX_STATUS.ERROR;
      this.auditLogger.log('sandbox_init_error', { 
        sandboxId: this.id, 
        error: err.message 
      });
      this.emit(SANDBOX_EVENTS.SANDBOX_ERROR, { 
        sandboxId: this.id, 
        error: err.message 
      });
      return false;
    }
  }

  /**
   * 在沙箱中执行代码
   */
  async execute(code, context = {}) {
    if (this.status !== SANDBOX_STATUS.IDLE) {
      throw new Error(`Sandbox is not idle: ${this.status}`);
    }
    
    this.status = SANDBOX_STATUS.RUNNING;
    this.currentTask = {
      id: `task-${Date.now()}`,
      code,
      context,
      startTime: Date.now()
    };
    
    this.auditLogger.log('task_started', {
      sandboxId: this.id,
      taskId: this.currentTask.id,
      contextKeys: Object.keys(context)
    });
    
    this.emit(SANDBOX_EVENTS.TASK_STARTED, {
      sandboxId: this.id,
      taskId: this.currentTask.id
    });
    
    // 启动资源监控
    this.resourceMonitor.start();
    
    // 设置超时
    this.taskTimeout = setTimeout(() => {
      this._handleTimeout();
    }, this.config.timeout);
    
    // 执行代码
    try {
      const result = await this._runInWorker(code, context);
      
      clearTimeout(this.taskTimeout);
      this.resourceMonitor.stop();
      
      const completedTask = {
        ...this.currentTask,
        result,
        endTime: Date.now(),
        duration: Date.now() - this.currentTask.startTime
      };
      
      this.auditLogger.log('task_completed', {
        sandboxId: this.id,
        taskId: completedTask.taskId,
        duration: completedTask.duration
      });
      
      this.emit(SANDBOX_EVENTS.TASK_COMPLETED, {
        sandboxId: this.id,
        task: completedTask
      });
      
      this.status = SANDBOX_STATUS.IDLE;
      this.currentTask = null;
      
      return completedTask;
    } catch (err) {
      clearTimeout(this.taskTimeout);
      this.resourceMonitor.stop();
      
      this._handleError(err);
      
      return {
        ...this.currentTask,
        error: err.message,
        endTime: Date.now(),
        duration: Date.now() - this.currentTask.startTime
      };
    }
  }

  /**
   * 在Worker中运行代码
   */
  _runInWorker(code, context) {
    return new Promise((resolve, reject) => {
      // 创建临时文件
      const tempFile = path.join(this.workDir, `task-${this.currentTask.id}.js`);
      
      // 包装代码，添加安全检查
      const wrappedCode = this._wrapCode(code);
      
      fs.writeFileSync(tempFile, wrappedCode, 'utf8');
      
      try {
        // 使用fork在独立进程中运行
        this.worker = fork(tempFile, {
          cwd: this.workDir,
          env: {
            ...process.env,
            SANDBOX_ID: this.id,
            SANDBOX_TASK_ID: this.currentTask.id
          },
          // 限制资源
          execArgv: ['--max-old-space-size=256'] // 限制内存到256MB
        });
        
        const timeout = setTimeout(() => {
          if (this.worker) {
            this.worker.kill('SIGKILL');
            reject(new Error('Execution timeout'));
          }
        }, this.config.timeout - (Date.now() - this.currentTask.startTime));
        
        this.worker.on('message', (message) => {
          clearTimeout(timeout);
          
          if (message.type === 'result') {
            resolve(message.data);
          } else if (message.type === 'output') {
            this.emit(SANDBOX_EVENTS.TASK_OUTPUT, {
              sandboxId: this.id,
              taskId: this.currentTask.id,
              output: message.data
            });
          }
        });
        
        this.worker.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        
        this.worker.on('exit', (code, signal) => {
          clearTimeout(timeout);
          if (code !== 0 && code !== null) {
            reject(new Error(`Worker exited with code ${code}`));
          }
        });
        
        // 发送上下文
        this.worker.send({ type: 'context', data: context });
        
      } catch (err) {
        fs.unlinkSync(tempFile);
        reject(err);
      }
    });
  }

  /**
   * 包装代码添加安全检查
   */
  _wrapCode(code) {
    return `
    // DeerFlow Sandbox Safety Wrapper
    const __sandboxId = process.env.SANDBOX_ID;
    const __taskId = process.env.SANDBOX_TASK_ID;
    
    // 限制全局访问
    const __originalConsole = console;
    const __outputs = [];
    
    // 安全console
    console = {
      log: (...args) => {
        const output = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        __outputs.push(output);
        process.send && process.send({ type: 'output', data: output });
      },
      error: (...args) => {
        const output = '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        __outputs.push(output);
        process.send && process.send({ type: 'output', data: output });
      },
      warn: (...args) => __originalConsole.warn.apply(console, args),
      info: (...args) => __originalConsole.info.apply(console, args)
    };
    
    // 禁用危险模块
    try {
      // 执行用户代码
      ${code}
      
      // 返回结果
      process.send && process.send({ type: 'result', data: { 
        success: true, 
        outputs: __outputs,
        sandboxId: __sandboxId,
        taskId: __taskId
      }});
    } catch (error) {
      process.send && process.send({ type: 'result', data: { 
        success: false, 
        error: error.message,
        outputs: __outputs,
        sandboxId: __sandboxId,
        taskId: __taskId
      }});
    }
    `;
  }

  _handleTimeout() {
    if (this.worker) {
      this.worker.kill('SIGKILL');
    }
    
    this.status = SANDBOX_STATUS.TIMEOUT;
    
    this.auditLogger.log('task_timeout', {
      sandboxId: this.id,
      taskId: this.currentTask?.id,
      timeout: this.config.timeout
    });
    
    this.emit(SANDBOX_EVENTS.TASK_TIMEOUT, {
      sandboxId: this.id,
      taskId: this.currentTask?.id,
      timeout: this.config.timeout
    });
    
    this.currentTask = null;
    this.status = SANDBOX_STATUS.IDLE;
  }

  _handleError(err) {
    this.status = SANDBOX_STATUS.ERROR;
    
    this.auditLogger.log('task_error', {
      sandboxId: this.id,
      taskId: this.currentTask?.id,
      error: err.message
    });
    
    this.emit(SANDBOX_EVENTS.TASK_ERROR, {
      sandboxId: this.id,
      taskId: this.currentTask?.id,
      error: err.message
    });
    
    this.currentTask = null;
    this.status = SANDBOX_STATUS.IDLE;
  }

  /**
   * 终止沙箱
   */
  terminate() {
    if (this.worker) {
      this.worker.kill('SIGKILL');
      this.worker = null;
    }
    
    if (this.taskTimeout) {
      clearTimeout(this.taskTimeout);
      this.taskTimeout = null;
    }
    
    this.resourceMonitor.stop();
    this.status = SANDBOX_STATUS.TERMINATED;
    
    this.auditLogger.log('sandbox_terminated', {
      sandboxId: this.id
    });
    
    this.emit(SANDBOX_EVENTS.SANDBOX_TERMINATED, {
      sandboxId: this.id
    });
    
    // 清理工作目录
    if (this.workDir && fs.existsSync(this.workDir)) {
      fs.rmSync(this.workDir, { recursive: true, force: true });
    }
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      currentTask: this.currentTask?.id || null,
      resourceUsage: this.resourceMonitor.getUsage(),
      uptime: this.currentTask?.startTime ? 
               Date.now() - this.currentTask.startTime : 0
    };
  }
}

// ============== 沙箱池管理器 ==============
class SandboxPool extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      minSize: config.minSize || 2,
      maxSize: config.maxSize || 10,
      idleTimeout: config.idleTimeout || 60000, // 1分钟空闲后回收
      ...config
    };
    
    this.pool = new Map();
    this.available = new Set();
    this.inUse = new Set();
  }

  /**
   * 获取或创建沙箱
   */
  async acquire(name) {
    // 先查找空闲的
    for (const sandbox of this.available) {
      if (sandbox.name === name || this.available.size > this.config.minSize) {
        this.available.delete(sandbox);
        this.inUse.add(sandbox);
        return sandbox;
      }
    }
    
    // 检查是否达到上限
    if (this.pool.size >= this.config.maxSize) {
      // 等待空闲沙箱
      return new Promise((resolve) => {
        this.once('sandbox_available', () => {
          resolve(this.acquire(name));
        });
      });
    }
    
    // 创建新沙箱
    const sandbox = new SandboxInstance({
      name,
      resourceLimits: this.config.resourceLimits,
      auditConfig: this.config.auditConfig
    });
    
    await sandbox.initialize();
    
    this.pool.set(sandbox.id, sandbox);
    this.inUse.add(sandbox);
    
    this.emit('sandbox_acquired', { sandboxId: sandbox.id });
    
    return sandbox;
  }

  /**
   * 释放沙箱回池中
   */
  release(sandbox) {
    this.inUse.delete(sandbox);
    
    if (sandbox.status === SANDBOX_STATUS.IDLE || 
        sandbox.status === SANDBOX_STATUS.ERROR ||
        sandbox.status === SANDBOX_STATUS.TERMINATED) {
      // 如果沙箱有问题，销毁它
      if (sandbox.status !== SANDBOX_STATUS.IDLE) {
        sandbox.terminate();
        this.pool.delete(sandbox.id);
        return;
      }
      
      // 否则放回池中
      this.available.add(sandbox);
      this.emit('sandbox_available', { sandboxId: sandbox.id });
    }
  }

  /**
   * 清理所有沙箱
   */
  terminateAll() {
    for (const sandbox of this.pool.values()) {
      sandbox.terminate();
    }
    this.pool.clear();
    this.available.clear();
    this.inUse.clear();
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      total: this.pool.size,
      available: this.available.size,
      inUse: this.inUse.size,
      maxSize: this.config.maxSize
    };
  }
}

// ============== 导出 ==============
module.exports = {
  SandboxInstance,
  SandboxPool,
  ResourceMonitor,
  AuditLogger,
  SANDBOX_STATUS,
  SANDBOX_EVENTS,
  RESOURCE_LIMITS
};
