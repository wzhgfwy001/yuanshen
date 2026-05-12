/**
 * Cattle Policy - 牛群策略实现
 * 基于 Anthropic Managed Agents 的 Pet vs Cattle 设计理念
 * 子Agent是"牛群"，不是"宠物"，失败后自动替换
 */

const fs = require('fs');
const path = require('path');

// 状态文件
const STATE_FILE = path.join(__dirname, 'cattle-state.json');

// Cattle Policy 配置
const CONFIG = {
  maxRetries: 3,           // 最大重试次数
  retryDelay: 5000,         // 重试延迟(ms)
  enableAutoReplace: true,    // 自动替换
  logFile: 'brain/cattle-recovery-log.md'
};

/**
 * Cattle Agent 封装类
 */
class CattleAgent {
  constructor(agentConfig) {
    this.id = agentConfig.id || `agent-${Date.now()}`;
    this.type = agentConfig.type || 'generic';
    this.status = 'idle';     // idle, running, failed, replaced
    this.retryCount = 0;
    this.createdAt = new Date().toISOString();
    this.lastError = null;
  }
}

/**
 * Cattle Manager - 管理所有 Cattle Agents
 */
class CattleManager {
  constructor() {
    this.agents = new Map();
    this.loadState();
  }

  /**
   * 创建新 Agent（牛群）
   */
  createAgent(config) {
    const agent = new CattleAgent(config);
    this.agents.set(agent.id, agent);
    this.saveState();
    console.log(`[Cattle] Created agent: ${agent.id}`);
    return agent;
  }

  /**
   * Agent 执行失败时的处理
   */
  async handleFailure(agentId, error) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.log(`[Cattle] Agent ${agentId} not found`);
      return null;
    }

    agent.retryCount++;
    agent.lastError = error.message || String(error);
    agent.status = 'retrying';

    if (agent.retryCount < CONFIG.maxRetries) {
      // 重试
      console.log(`[Cattle] Agent ${agentId} failed, retry ${agent.retryCount}/${CONFIG.maxRetries}`);
      
      await this.sleep(CONFIG.retryDelay);
      agent.status = 'idle';
      this.saveState();
      return { action: 'retry', agentId };
    } else {
      // 替换
      console.log(`[Cattle] Agent ${agentId} failed ${CONFIG.maxRetries} times, replacing...`);
      
      const newAgent = this.createAgent({
        type: agent.type,
        id: `${agent.type}-${Date.now()}`
      });
      
      agent.status = 'replaced';
      this.logRecovery(agent.id, newAgent.id, error);
      this.saveState();
      
      return { action: 'replace', oldAgent: agent.id, newAgent: newAgent.id };
    }
  }

  /**
   * 记录恢复日志
   */
  logRecovery(oldId, newId, error) {
    const logPath = path.join(__dirname, '..', CONFIG.logFile);
    const entry = `\n## Recovery ${new Date().toISOString()}\n- **Old Agent**: ${oldId}\n- **New Agent**: ${newId}\n- **Reason**: ${error}\n`;
    
    try {
      fs.appendFileSync(logPath, entry);
    } catch (e) {
      console.error('[Cattle] Failed to write recovery log:', e);
    }
  }

  /**
   * 获取 Agent 状态
   */
  getStatus(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有 Agent 状态
   */
  getAllStatus() {
    const status = [];
    for (const [id, agent] of this.agents) {
      status.push({
        id,
        type: agent.type,
        status: agent.status,
        retryCount: agent.retryCount
      });
    }
    return status;
  }

  /**
   * 保存状态到文件
   */
  saveState() {
    const state = Array.from(this.agents.entries()).map(([id, agent]) => ({
      id: agent.id,
      type: agent.type,
      status: agent.status,
      retryCount: agent.retryCount,
      createdAt: agent.createdAt
    }));
    
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('[Cattle] Failed to save state:', e);
    }
  }

  /**
   * 从文件加载状态
   */
  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        for (const s of state) {
          this.agents.set(s.id, new CattleAgent(s));
        }
        console.log(`[Cattle] Loaded ${this.agents.size} agents from state`);
      }
    } catch (e) {
      console.log('[Cattle] No previous state found');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
const cattleManager = new CattleManager();

module.exports = {
  cattleManager,
  CattleAgent,
  CattleManager,
  CONFIG
};

// 使用示例
if (require.main === module) {
  console.log('[Cattle Policy] Demo');
  
  // 创建 Agent
  const agent1 = cattleManager.createAgent({ type: 'search' });
  console.log('All agents:', cattleManager.getAllStatus());
  
  // 模拟失败
  cattleManager.handleFailure(agent1.id, new Error('Connection timeout'));
}