/**
 * DeerFlow增强版Agent注册表
 * 
 * 借鉴DeerFlow的设计：
 * 1. Agent注册与发现
 * 2. 能力注册
 * 3. 负载均衡
 * 4. 健康监控
 */

const { EventEmitter } = require('events');

// ============== Agent注册项 ==============
class AgentRegistration {
  constructor(agentId, config) {
    this.agentId = agentId;
    this.name = config.name || agentId;
    this.type = config.type || 'general';
    this.capabilities = config.capabilities || [];
    this.status = 'active'; // active, busy, unavailable
    this.load = 0;
    this.maxLoad = config.maxLoad || 10;
    this.metadata = config.metadata || {};
    this.registeredAt = Date.now();
    this.lastHeartbeat = Date.now();
    this.taskCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  isAvailable() {
    return this.status === 'active' && this.load < this.maxLoad;
  }

  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  incrementLoad() {
    this.load++;
    this.taskCount++;
    if (this.load >= this.maxLoad) {
      this.status = 'busy';
    }
  }

  decrementLoad() {
    this.load = Math.max(0, this.load - 1);
    if (this.status === 'busy' && this.load < this.maxLoad) {
      this.status = 'active';
    }
  }

  recordSuccess() {
    this.successCount++;
    this.decrementLoad();
  }

  recordFailure() {
    this.failureCount++;
    this.decrementLoad();
  }

  getSuccessRate() {
    const total = this.successCount + this.failureCount;
    return total > 0 ? this.successCount / total : 0;
  }
}

// ============== AgencyRegistry 主类 ==============
class AgencyRegistry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      heartbeatTimeout: config.heartbeatTimeout || 60000,
      maxAgents: config.maxAgents || 100,
      loadBalancing: config.loadBalancing || 'least_loaded', // round_robin, least_loaded, random
      ...config
    };

    this.agents = new Map();
    this.capabilityIndex = new Map();
    this.roundRobinIndex = new Map();
    this.stats = {
      totalRegistrations: 0,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0
    };
  }

  /**
   * 注册Agent
   */
  register(agentId, config) {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error('Agent registry is full');
    }

    if (this.agents.has(agentId)) {
      // 更新现有注册
      const existing = this.agents.get(agentId);
      Object.assign(existing, config);
      existing.updateHeartbeat();
      this.emit('agent_updated', existing);
      return existing;
    }

    const registration = new AgentRegistration(agentId, config);
    this.agents.set(agentId, registration);

    // 更新能力索引
    for (const capability of registration.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability).add(agentId);
    }

    // 初始化轮询索引
    if (!this.roundRobinIndex.has(capability)) {
      this.roundRobinIndex.set(capability, 0);
    }

    this.stats.totalRegistrations++;
    this.emit('agent_registered', registration);

    return registration;
  }

  /**
   * 注销Agent
   */
  unregister(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // 从能力索引中移除
    for (const capability of agent.capabilities) {
      const index = this.capabilityIndex.get(capability);
      if (index) {
        index.delete(agentId);
      }
    }

    this.agents.delete(agentId);
    this.emit('agent_unregistered', { agentId });

    return true;
  }

  /**
   * 更新Agent状态
   */
  updateStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.status = status;
    this.emit('agent_status_changed', { agentId, status });

    return true;
  }

  /**
   * 心跳
   */
  heartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.updateHeartbeat();
    return true;
  }

  /**
   * 查找Agent
   */
  findAgents(capability, options = {}) {
    const agentIds = this.capabilityIndex.get(capability) || new Set();
    let agents = [];

    for (const id of agentIds) {
      const agent = this.agents.get(id);
      if (agent && agent.isAvailable()) {
        if (options.type && agent.type !== options.type) continue;
        agents.push(agent);
      }
    }

    // 过滤不可用的
    agents = agents.filter(a => a.isAvailable());

    // 排序
    if (options.sortBy === 'load') {
      agents.sort((a, b) => a.load - b.load);
    } else if (options.sortBy === 'success_rate') {
      agents.sort((a, b) => b.getSuccessRate() - a.getSuccessRate());
    } else if (options.sortBy === 'least_loaded') {
      agents.sort((a, b) => a.load - b.load);
    }

    if (options.limit) {
      agents = agents.slice(0, options.limit);
    }

    return agents;
  }

  /**
   * 选择Agent (负载均衡)
   */
  selectAgent(capability, options = {}) {
    const candidates = this.findAgents(capability, options);
    
    if (candidates.length === 0) {
      return null;
    }

    let selected;

    switch (this.config.loadBalancing) {
      case 'round_robin':
        const index = this.roundRobinIndex.get(capability) || 0;
        selected = candidates[index % candidates.length];
        this.roundRobinIndex.set(capability, index + 1);
        break;

      case 'least_loaded':
        selected = candidates.sort((a, b) => a.load - b.load)[0];
        break;

      case 'random':
        selected = candidates[Math.floor(Math.random() * candidates.length)];
        break;

      default:
        selected = candidates[0];
    }

    if (selected) {
      selected.incrementLoad();
      this.stats.totalTasks++;
      this.emit('agent_selected', { agentId: selected.agentId, capability });
    }

    return selected;
  }

  /**
   * 记录任务结果
   */
  recordTaskResult(agentId, success) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (success) {
      agent.recordSuccess();
      this.stats.successfulTasks++;
    } else {
      agent.recordFailure();
      this.stats.failedTasks++;
    }
  }

  /**
   * 获取Agent
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * 列出所有Agent
   */
  listAgents(options = {}) {
    let agents = Array.from(this.agents.values());

    if (options.type) {
      agents = agents.filter(a => a.type === options.type);
    }

    if (options.status) {
      agents = agents.filter(a => a.status === options.status);
    }

    if (options.capability) {
      const agentIds = this.capabilityIndex.get(options.capability) || new Set();
      agents = agents.filter(a => agentIds.has(a.agentId));
    }

    return agents.map(a => ({
      agentId: a.agentId,
      name: a.name,
      type: a.type,
      capabilities: a.capabilities,
      status: a.status,
      load: a.load,
      maxLoad: a.maxLoad,
      successRate: a.getSuccessRate(),
      taskCount: a.taskCount,
      lastHeartbeat: a.lastHeartbeat
    }));
  }

  /**
   * 检查超时Agent
   */
  checkTimeouts() {
    const now = Date.now();
    const timedOut = [];

    for (const [agentId, agent] of this.agents) {
      if (now - agent.lastHeartbeat > this.config.heartbeatTimeout) {
        agent.status = 'unavailable';
        timedOut.push(agentId);
      }
    }

    if (timedOut.length > 0) {
      this.emit('agents_timed_out', { agentIds: timedOut });
    }

    return timedOut;
  }

  /**
   * 获取统计
   */
  getStats() {
    const agents = Array.from(this.agents.values());
    const available = agents.filter(a => a.isAvailable()).length;

    return {
      ...this.stats,
      totalAgents: agents.length,
      availableAgents: available,
      busyAgents: agents.filter(a => a.status === 'busy').length,
      unavailableAgents: agents.filter(a => a.status === 'unavailable').length,
      capabilityCount: this.capabilityIndex.size
    };
  }
}

// ============== 导出 ==============
module.exports = {
  AgencyRegistry,
  AgentRegistration
};
