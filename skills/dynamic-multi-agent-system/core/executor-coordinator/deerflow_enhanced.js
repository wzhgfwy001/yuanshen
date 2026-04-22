/**
 * DeerFlow增强版执行协调器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多阶段执行编排
 * 2. 资源协调
 * 3. 失败恢复
 * 4. 执行计划优化
 */

const { EventEmitter } = require('events');

// ============== 执行阶段类 ==============
class ExecutionPhase extends EventEmitter {
  constructor(name, config) {
    super();
    this.name = name;
    this.executor = config.executor;
    this.dependencies = config.dependencies || [];
    this.timeout = config.timeout || 60000;
    this.retryCount = config.retryCount || 0;
    this.fallback = config.fallback || null;
    this.status = 'pending';
    this.result = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
  }

  async execute(context) {
    this.status = 'running';
    this.startedAt = Date.now();
    this.emit('phase_started', { phase: this.name });

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const result = await Promise.race([
          this.executor(context),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Phase timeout')), this.timeout)
          )
        ]);

        this.status = 'completed';
        this.result = result;
        this.completedAt = Date.now();
        this.emit('phase_completed', { phase: this.name, result });

        return result;

      } catch (error) {
        if (attempt < this.retryCount) {
          this.emit('phase_retry', { phase: this.name, attempt: attempt + 1 });
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          if (this.fallback) {
            try {
              this.result = await this.fallback(context, error);
              this.status = 'completed_with_fallback';
              this.emit('phase_fallback', { phase: this.name, fallback: this.result });
            } catch (fallbackError) {
              this.error = error;
              this.status = 'failed';
              this.emit('phase_failed', { phase: this.name, error });
            }
          } else {
            this.error = error;
            this.status = 'failed';
            this.emit('phase_failed', { phase: this.name, error });
          }
        }
      }
    }
  }
}

// ============== ExecutionPlan 类 ==============
class ExecutionPlan extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.phases = new Map();
    this.parallelGroups = [];
    this.context = {};
  }

  addPhase(phase) {
    this.phases.set(phase.name, phase);
    return this;
  }

  addParallelGroup(name, phaseNames) {
    this.parallelGroups.push({ name, phaseNames });
    return this;
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  getPhase(name) {
    return this.phases.get(name);
  }

  getExecutionOrder() {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (phaseName) => {
      if (visited.has(phaseName)) return;
      if (visiting.has(phaseName)) {
        throw new Error(`Circular dependency detected: ${phaseName}`);
      }

      visiting.add(phaseName);
      const phase = this.phases.get(phaseName);
      
      if (phase) {
        for (const dep of phase.dependencies) {
          visit(dep);
        }
        order.push(phaseName);
      }

      visiting.delete(phaseName);
      visited.add(phaseName);
    };

    for (const phaseName of this.phases.keys()) {
      visit(phaseName);
    }

    return order;
  }
}

// ============== ExecutorCoordinator 主类 ==============
class ExecutorCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      enableOptimization: config.enableOptimization !== false,
      ...config
    };

    this.plans = new Map();
    this.activeExecutions = new Map();
    this.executionHistory = [];
  }

  /**
   * 创建执行计划
   */
  createPlan(name) {
    const plan = new ExecutionPlan(name);
    this.plans.set(name, plan);
    return plan;
  }

  /**
   * 执行计划
   */
  async executePlan(planName, initialContext = {}) {
    const plan = this.plans.get(planName);
    if (!plan) {
      throw new Error(`Plan not found: ${planName}`);
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const context = { ...plan.context, ...initialContext };
    
    const execution = {
      id: executionId,
      planName,
      status: 'running',
      startTime: Date.now(),
      phases: {},
      results: {}
    };

    this.activeExecutions.set(executionId, execution);
    this.emit('execution_started', execution);

    try {
      // 获取执行顺序
      const order = plan.getExecutionOrder();

      // 执行阶段
      for (const phaseName of order) {
        const phase = plan.getPhase(phaseName);
        
        // 检查依赖是否都已完成
        const depsCompleted = phase.dependencies.every(
          dep => execution.phases[dep]?.status === 'completed'
        );

        if (!depsCompleted) {
          throw new Error(`Dependencies not met for phase: ${phaseName}`);
        }

        execution.phases[phaseName] = { status: 'running' };

        const result = await phase.execute(context);
        context[phaseName] = result;
        execution.results[phaseName] = result;
        execution.phases[phaseName] = { status: 'completed', result };
      }

      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      this.emit('execution_completed', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      this.emit('execution_failed', execution);
    }

    this.activeExecutions.delete(executionId);
    this.executionHistory.push(execution);

    return execution;
  }

  /**
   * 并行执行优化
   */
  async executeParallel(phases, context) {
    const results = await Promise.all(
      phases.map(phase => phase.execute(context))
    );
    return results;
  }

  /**
   * 获取执行状态
   */
  getExecutionStatus(executionId) {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * 获取执行历史
   */
  getHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * 获取统计
   */
  getStats() {
    const total = this.executionHistory.length;
    const completed = this.executionHistory.filter(e => e.status === 'completed').length;
    const failed = this.executionHistory.filter(e => e.status === 'failed').length;
    const avgDuration = total > 0
      ? this.executionHistory.reduce((sum, e) => sum + (e.duration || 0), 0) / total
      : 0;

    return {
      total,
      completed,
      failed,
      active: this.activeExecutions.size,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : 'N/A',
      avgDuration: Math.round(avgDuration) + 'ms'
    };
  }
}

// ============== 导出 ==============
module.exports = {
  ExecutorCoordinator,
  ExecutionPlan,
  ExecutionPhase
};
