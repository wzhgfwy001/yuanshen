/**
 * Warmup Strategy - 预热系统
 * 目标：降低 TTFT（首 token 延迟）
 */

const fs = require('fs');
const path = require('path');

// Warmup 组件状态
const WARMUP_STATE = {
  COLD: 'cold',      // 未初始化
  WARMING: 'warming',  // 预热中
  HOT: 'hot',        // 就绪
  IDLE: 'idle',      // 空闲（可快速唤醒）
  RELEASING: 'releasing'  // 释放中
};

/**
 * Warmup 配置
 */
const WARMUP_CONFIG = {
  // 预热组件
  components: {
    // 工具预热
    tools: { enabled: true, timeout: 5000 },
    // 子Agent池预热
    agents: { enabled: true, idleTimeout: 30000 },
    // 上下文缓存
    context: { enabled: true, maxAge: 3600000 }  // 1小时
  },
  // 空闲超时（毫秒）
  idleTimeout: 1800000,  // 30分钟
  // 内存限制
  memoryLimit: 100 * 1024 * 1024  // 100MB
};

/**
 * 单个预热组件
 */
class WarmupComponent {
  constructor(name, initFn, config = {}) {
    this.name = name;
    this.initFn = initFn;
    this.config = config;
    this.state = WARMUP_STATE.COLD;
    this.instance = null;
    this.lastActive = null;
    this.loadedAt = null;
  }
  
  async warmup() {
    if (this.state === WARMUP_STATE.HOT || this.state === WARMUP_STATE.WARMING) {
      return this.state;
    }
    
    this.state = WARMUP_STATE.WARMING;
    
    try {
      this.instance = await Promise.race([
        this.initFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout || 5000)
        )
      ]);
      
      this.state = WARMUP_STATE.HOT;
      this.loadedAt = Date.now();
      this.lastActive = Date.now();
      console.log(`[Warmup] ${this.name} ready`);
      return WARMUP_STATE.HOT;
    } catch (error) {
      this.state = WARMUP_STATE.COLD;
      console.error(`[Warmup] ${this.name} failed:`, error.message);
      return WARMUP_STATE.COLD;
    }
  }
  
  async get() {
    if (this.state === WARMUP_STATE.COLD) {
      await this.warmup();
    }
    this.lastActive = Date.now();
    return this.instance;
  }
  
  idle() {
    this.state = WARMUP_STATE.IDLE;
  }
  
  release() {
    this.state = WARMUP_STATE.RELEASING;
    this.instance = null;
    this.state = WARMUP_STATE.COLD;
    console.log(`[Warmup] ${this.name} released`);
  }
}

/**
 * Warmup Manager
 */
class WarmupManager {
  constructor() {
    this.components = new Map();
    this.enabled = true;
    this.memoryUsage = 0;
    this.initDefaultComponents();
  }
  
  initDefaultComponents() {
    // 文件搜索组件
    this.register('search', async () => {
      // 初始化搜索索引
      return { search: true };
    }, { timeout: 3000 });
    
    // 上下文缓存
    this.register('context', async () => {
      return new Map();  // 缓存上下文
    }, { timeout: 1000 });
    
    // 常用工具
    this.register('tools', async () => {
      return { exec: true, read: true, write: true };
    }, { timeout: 2000 });
  }
  
  /**
   * 注册预热组件
   */
  register(name, initFn, config) {
    this.components.set(name, new WarmupComponent(name, initFn, config));
  }
  
  /**
   * 预热所有组件
   */
  async warmup() {
    const results = {};
    
    for (const [name, comp] of this.components) {
      results[name] = await comp.warmup();
    }
    
    return results;
  }
  
  /**
   * 获取预热组件
   */
  async get(name) {
    const comp = this.components.get(name);
    if (!comp) return null;
    return await comp.get();
  }
  
  /**
   * 空闲计时器
   */
  startIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    
    this.idleTimer = setTimeout(() => {
      console.log('[Warmup] Idle timeout, releasing resources...');
      this.release();
    }, WARMUP_CONFIG.idleTimeout);
  }
  
  /**
   * 释放所有预热资源
   */
  release() {
    for (const comp of this.components.values()) {
      comp.release();
    }
    this.enabled = false;
  }
  
  /**
   * 获取状态
   */
  getStatus() {
    const status = {};
    for (const [name, comp] of this.components) {
      status[name] = {
        state: comp.state,
        loadedAt: comp.loadedAt,
        lastActive: comp.lastActive
      };
    }
    return {
      enabled: this.enabled,
      memoryUsage: this.memoryUsage,
      components: status
    };
  }
  
  /**
   * 检查内存
   */
  checkMemory() {
    // 简单内存检查
    const used = process.memoryUsage();
    this.memoryUsage = used.heapUsed;
    return used.heapUsed < WARMUP_CONFIG.memoryLimit;
  }
}

const warmupManager = new WarmupManager();

module.exports = { warmupManager, WARMUP_STATE, WARMUP_CONFIG };

// 使用示例
if (require.main === module) {
  console.log('[Warmup] Status:', warmupManager.getStatus());
  
  warmupManager.warmup().then(r => {
    console.log('[Warmup] All warmed up:', r);
  });
}
