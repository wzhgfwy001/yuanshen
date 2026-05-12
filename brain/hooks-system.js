/**
 * Hook System - Hook 管理器
 * 基于 Claude Code 的 src/hooks 设计理念
 * 在关键节点插入逻辑
 */

const fs = require('fs');
const path = require('path');

// Hook 类型
const HOOK_TYPES = {
  BEFORE_TASK: 'before-task',
  AFTER_TASK: 'after-task',
  ON_ERROR: 'on-error',
  ON_TIMEOUT: 'on-timeout',
  BEFORE_EXIT: 'before-exit',
  AFTER_EXIT: 'after-exit'
};

/**
 * Hook 函数包装
 */
class Hook {
  constructor(name, fn, config = {}) {
    this.id = `hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.name = name;
    this.fn = fn;
    this.enabled = config.enabled !== false;
    this.once = config.once || false;
    this.priority = config.priority || 0;
    this.filter = config.filter || null;
  }
  
  async call(context) {
    if (!this.enabled) return null;
    
    try {
      const result = await this.fn(context);
      return { success: true, result, hookId: this.id };
    } catch (error) {
      return { success: false, error: error.message, hookId: this.id };
    }
  }
}

/**
 * Hook Manager
 */
class HookManager {
  constructor() {
    this.hooks = new Map();
    this.logs = [];
    this.initDefaultHooks();
  }

  initDefaultHooks() {
    // 初始化默认 Hook 类型
    for (const type of Object.values(HOOK_TYPES)) {
      this.hooks.set(type, []);
    }
    
    // 注册默认 Hooks
    this.register(HOOK_TYPES.BEFORE_TASK, async (task) => {
      console.log(`[Hook] Before task: ${task.id}`);
    });
    
    this.register(HOOK_TYPES.AFTER_TASK, async (task) => {
      console.log(`[Hook] After task: ${task.id}`);
      await this.saveCheckpoint(task);
    });
    
    this.register(HOOK_TYPES.ON_ERROR, async ({ task, error }) => {
      console.error(`[Hook] Error on task ${task.id}:`, error);
      await this.logError(task, error);
    });
  }

  /**
   * 注册 Hook
   */
  register(type, fn, config = {}) {
    if (!this.hooks.has(type)) {
      this.hooks.set(type, []);
    }
    
    const hook = new Hook(fn.name || `anonymous-${type}`, fn, config);
    const hooks = this.hooks.get(type);
    hooks.push(hook);
    
    // 按优先级排序
    hooks.sort((a, b) => b.priority - a.priority);
    
    console.log(`[Hook] Registered: ${type} -> ${hook.name}`);
    return hook.id;
  }

  /**
   * 触发 Hooks
   */
  async trigger(type, context) {
    const hooks = this.hooks.get(type) || [];
    const results = [];
    
    for (const hook of hooks) {
      if (!hook.enabled) continue;
      
      const result = await hook.call(context);
      results.push(result);
      
      // 如果是一次性 Hook，禁用
      if (hook.once) {
        hook.enabled = false;
      }
    }
    
    return results;
  }

  /**
   * 取消注册
   */
  unregister(hookId) {
    for (const [type, hooks] of this.hooks) {
      const index = hooks.findIndex(h => h.id === hookId);
      if (index !== -1) {
        hooks.splice(index, 1);
        console.log(`[Hook] Unregistered: ${hookId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * 启用/禁用 Hook
   */
  setEnabled(hookId, enabled) {
    for (const hooks of this.hooks.values()) {
      const hook = hooks.find(h => h.id === hookId);
      if (hook) {
        hook.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  /**
   * 保存 checkpoint（由 after-task Hook 调用）
   */
  async saveCheckpoint(task) {
    const checkpointDir = path.join(__dirname, 'tasks', task.id);
    const checkpointFile = path.join(checkpointDir, 'checkpoint.json');
    
    try {
      fs.mkdirSync(checkpointDir, { recursive: true });
      fs.writeFileSync(checkpointFile, JSON.stringify({
        taskId: task.id,
        status: task.status,
        result: task.result,
        savedAt: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      console.error('[Hook] Failed to save checkpoint:', e);
    }
  }

  /**
   * 记录错误（由 on-error Hook 调用）
   */
  async logError(task, error) {
    const errorLog = path.join(__dirname, 'errors.md');
    const entry = `\n## ${new Date().toISOString()}\nTask: ${task.id}\nError: ${error}\n`;
    
    try {
      fs.appendFileSync(errorLog, entry);
    } catch (e) {
      console.error('[Hook] Failed to log error:', e);
    }
  }

  /**
   * 获取 Hook 状态
   */
  getStatus() {
    const status = {};
    for (const [type, hooks] of this.hooks) {
      status[type] = hooks.filter(h => h.enabled).length;
    }
    return status;
  }

  /**
   * 获取所有 Hooks 详情
   */
  getAll() {
    const all = [];
    for (const [type, hooks] of this.hooks) {
      for (const hook of hooks) {
        all.push({
          id: hook.id,
          type,
          name: hook.name,
          enabled: hook.enabled,
          once: hook.once,
          priority: hook.priority
        });
      }
    }
    return all;
  }
}

const hookManager = new HookManager();

module.exports = {
  hookManager,
  HookManager,
  Hook,
  HOOK_TYPES
};

// 使用示例
if (require.main === module) {
  console.log('Hook status:', hookManager.getStatus());
  
  // 注册自定义 Hook
  hookManager.register(HOOK_TYPES.BEFORE_TASK, async (task) => {
    console.log('Custom before-task hook');
  }, { priority: 10 });
  
  // 触发 Hooks
  hookManager.trigger(HOOK_TYPES.BEFORE_TASK, { id: 'test-task' });
}
