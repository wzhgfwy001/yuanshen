/**
 * Agency HQ Integration - Agent Registry Configuration
 * 
 * 定义所有本地Agent的配置信息，用于注册到HQ并进行任务分发。
 * 基于DMAGS (Dynamic Multi-Agent System) 架构。
 * 
 * @version 1.0.0
 * @module agency-hq-integration
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export type AgentType = 
  | 'code-review' 
  | 'data-analysis' 
  | 'research' 
  | 'writing' 
  | 'planning' 
  | 'execution' 
  | 'coordination';

export type AgentStatus = 'online' | 'offline' | 'busy' | 'draining';

export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface AgentConfig {
  /** Agent唯一标识 */
  id: string;
  /** Agent显示名称 */
  name: string;
  /** Agent类型 */
  type: AgentType;
  /** 能力列表 */
  capabilities: string[];
  /** 能力详细信息 */
  capabilityDetails?: AgentCapability[];
  /** 最大并发任务数 */
  maxConcurrent: number;
  /** 当前正在执行的任务数 */
  currentLoad: number;
  /** 优先级 (1-10, 越高越优先) */
  priority: number;
  /** 当前状态 */
  status: AgentStatus;
  /** 端点地址 (可选) */
  endpoint?: string;
  /** 额外元数据 */
  metadata?: Record<string, any>;
  /** 创建时间 */
  createdAt: number;
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 标签 */
  tags?: string[];
}

export interface Task {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: any;
  targetAgents?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  createdAt: number;
  expiresAt?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface AgentState {
  agentId: string;
  status: AgentStatus;
  currentLoad: number;
  avgResponseTime: number;
  successRate: number;
  capabilities: string[];
  lastUpdated: number;
}

// ============================================================================
// Default Agent Registry
// ============================================================================

export const DMAGS_CONFIG_VERSION = '1.0.0';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
};

export const DEFAULT_CAPABILITIES: Record<AgentType, string[]> = {
  'code-review': ['code-review', 'static-analysis', 'security-scan', 'lint'],
  'data-analysis': ['data-analysis', 'visualization', 'statistics', 'ml-insights'],
  'research': ['web-search', 'document-analysis', 'summarization', 'citation'],
  'writing': ['content-creation', 'editing', 'translation', 'formatting'],
  'planning': ['task-decomposition', 'resource-planning', 'risk-assessment', 'scheduling'],
  'execution': ['code-execution', 'shell-commands', 'file-operations', 'api-calls'],
  'coordination': ['task-routing', 'load-balancing', 'conflict-resolution', 'aggregation'],
};

/**
 * 默认Agent注册表
 */
export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'agent-coordinator-001',
    name: 'CoordinatorAgent',
    type: 'coordination',
    capabilities: ['task-routing', 'load-balancing', 'conflict-resolution', 'aggregation', 'priority-queue'],
    maxConcurrent: 10,
    currentLoad: 0,
    priority: 10,
    status: 'online',
    endpoint: 'http://localhost:3001',
    metadata: {
      role: 'main-coordinator',
      maxTasksPerMinute: 100,
    },
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    tags: ['coordinator', 'router'],
  },
  {
    id: 'agent-code-review-001',
    name: 'CodeReviewAgent',
    type: 'code-review',
    capabilities: ['code-review', 'static-analysis', 'security-scan', 'lint', 'format-check'],
    maxConcurrent: 5,
    currentLoad: 0,
    priority: 8,
    status: 'online',
    endpoint: 'http://localhost:3002',
    metadata: {
      languages: ['typescript', 'javascript', 'python', 'java'],
      ruleSets: ['eslint', 'prettier', 'security-audit'],
    },
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    tags: ['code-review', 'quality'],
  },
  {
    id: 'agent-data-analysis-001',
    name: 'DataAnalysisAgent',
    type: 'data-analysis',
    capabilities: ['data-analysis', 'visualization', 'statistics', 'ml-insights', 'data-cleaning'],
    maxConcurrent: 3,
    currentLoad: 0,
    priority: 7,
    status: 'online',
    endpoint: 'http://localhost:3003',
    metadata: {
      visualizationLibraries: ['chart.js', 'd3.js', 'plotly'],
      statisticalMethods: ['regression', 'clustering', 'pca'],
    },
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    tags: ['data', 'analytics'],
  },
  {
    id: 'agent-research-001',
    name: 'ResearchAgent',
    type: 'research',
    capabilities: ['web-search', 'document-analysis', 'summarization', 'citation', 'fact-check'],
    maxConcurrent: 8,
    currentLoad: 0,
    priority: 6,
    status: 'online',
    endpoint: 'http://localhost:3004',
    metadata: {
      searchEngines: ['google', 'bing', 'arxiv'],
      maxSourcesPerQuery: 10,
    },
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    tags: ['research', 'search'],
  },
  {
    id: 'agent-writing-001',
    name: 'WritingAgent',
    type: 'writing',
    capabilities: ['content-creation', 'editing', 'translation', 'formatting', 'tone-adjustment'],
    maxConcurrent: 5,
    currentLoad: 0,
    priority: 6,
    status: 'online',
    endpoint: 'http://localhost:3005',
    metadata: {
      languages: ['zh', 'en', 'ja'],
      contentTypes: ['blog', 'documentation', 'report', 'social-media'],
    },
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    tags: ['writing', 'content'],
  },
];

/**
 * Agent注册表类
 */
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private version: string = DMAGS_CONFIG_VERSION;
  private loadBalancing: 'random' | 'round-robin' | 'least-loaded' = 'least-loaded';
  private roundRobinIndex: number = 0;

  constructor(agents: AgentConfig[] = []) {
    super();
    agents.forEach(agent => this.register(agent));
  }

  /**
   * 注册一个Agent
   */
  register(agent: AgentConfig): void {
    const config: AgentConfig = {
      ...agent,
      currentLoad: agent.currentLoad || 0,
      createdAt: agent.createdAt || Date.now(),
      lastHeartbeat: agent.lastHeartbeat || Date.now(),
    };
    this.agents.set(config.id, config);
    this.emit('agent:registered', config);
  }

  /**
   * 注销一个Agent
   */
  unregister(agentId: string, reason?: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emit('agent:unregistered', { agentId, reason, agent });
    }
  }

  /**
   * 根据ID获取Agent
   */
  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有Agent
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * 根据类型获取Agent
   */
  getAgentsByType(type: AgentType): AgentConfig[] {
    return this.getAllAgents().filter(a => a.type === type);
  }

  /**
   * 根据能力获取Agent
   */
  getAgentsByCapability(capability: string): AgentConfig[] {
    return this.getAllAgents().filter(
      a => a.capabilities.includes(capability) && a.status === 'online'
    );
  }

  /**
   * 更新Agent状态
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = Date.now();
      this.emit('agent:status-changed', { agentId, status });
    }
  }

  /**
   * 更新Agent负载
   */
  updateAgentLoad(agentId: string, load: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentLoad = Math.max(0, Math.min(load, agent.maxConcurrent));
      this.emit('agent:load-changed', { agentId, load, available: agent.maxConcurrent - agent.currentLoad });
    }
  }

  /**
   * 选择最佳Agent (基于负载均衡策略)
   */
  selectAgent(task: Task): AgentConfig | null {
    const candidates = task.targetAgents
      ? this.getAllAgents().filter(a => task.targetAgents!.includes(a.id))
      : this.getAllAgents().filter(a => a.status === 'online' && a.currentLoad < a.maxConcurrent);

    if (candidates.length === 0) return null;

    switch (this.loadBalancing) {
      case 'random':
        return candidates[Math.floor(Math.random() * candidates.length)];
      case 'round-robin':
        const agent = candidates[this.roundRobinIndex % candidates.length];
        this.roundRobinIndex++;
        return agent;
      case 'least-loaded':
        return candidates.reduce((best, current) => 
          (current.currentLoad / current.maxConcurrent) < (best.currentLoad / best.maxConcurrent) 
            ? current 
            : best
        );
      default:
        return candidates[0];
    }
  }

  /**
   * 获取在线Agent数量
   */
  getOnlineCount(): number {
    return this.getAllAgents().filter(a => a.status === 'online').length;
  }

  /**
   * 获取总负载
   */
  getTotalLoad(): number {
    return this.getAllAgents().reduce((sum, a) => sum + a.currentLoad, 0);
  }

  /**
   * 获取总容量
   */
  getTotalCapacity(): number {
    return this.getAllAgents().reduce((sum, a) => sum + a.maxConcurrent, 0);
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus(): {
    onlineAgents: number;
    totalAgents: number;
    totalLoad: number;
    totalCapacity: number;
    utilizationPercent: number;
  } {
    const onlineAgents = this.getOnlineCount();
    const totalAgents = this.agents.size;
    const totalLoad = this.getTotalLoad();
    const totalCapacity = this.getTotalCapacity();
    return {
      onlineAgents,
      totalAgents,
      totalLoad,
      totalCapacity,
      utilizationPercent: totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0,
    };
  }

  /**
   * 导出配置
   */
  exportConfig(): { version: string; agents: AgentConfig[]; healthStatus: ReturnType<AgentRegistry['getHealthStatus']> } {
    return {
      version: this.version,
      agents: this.getAllAgents(),
      healthStatus: this.getHealthStatus(),
    };
  }

  /**
   * 从配置导入
   */
  importConfig(config: { agents: AgentConfig[] }): void {
    this.agents.clear();
    config.agents.forEach(agent => this.register(agent));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const agentRegistry = new AgentRegistry(DEFAULT_AGENTS);

// ============================================================================
// Default Export
// ============================================================================

export default agentRegistry;
