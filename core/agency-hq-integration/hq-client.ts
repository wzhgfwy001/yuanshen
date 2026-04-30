/**
 * HQ Client - 与远程HQ服务器通信的客户端
 * 
 * 提供WebSocket连接、Agent注册、任务分发、状态同步等功能。
 * 
 * @version 1.0.0
 * @module agency-hq-integration
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// Type Definitions
// ============================================================================

export interface HQClientConfig {
  hqUrl: string;
  wsUrl: string;
  apiKey?: string;
  reconnectInterval: number;
  heartbeatInterval: number;
  timeout: number;
  maxRetries: number;
}

export interface Task {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: any;
  targetAgents?: string[];
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  createdAt: number;
  expiresAt?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  agentId: string;
}

export interface AgentState {
  agentId: string;
  status: 'online' | 'offline' | 'busy' | 'draining';
  currentLoad: number;
  avgResponseTime: number;
  successRate: number;
  capabilities: string[];
  lastUpdated: number;
}

export interface HQMessage {
  type: string;
  payload: any;
  timestamp: number;
  messageId?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: HQClientConfig = {
  hqUrl: process.env.HQ_URL || 'http://localhost:8080',
  wsUrl: process.env.WS_URL || 'ws://localhost:8080/ws',
  apiKey: process.env.HQ_API_KEY,
  reconnectInterval: 5000,
  heartbeatInterval: 30000,
  timeout: 30000,
  maxRetries: 5,
};

// ============================================================================
// HQ Client Class
// ============================================================================

export class HQClient extends EventEmitter {
  private config: HQClientConfig;
  private ws: WebSocket | null = null;
  private http: AxiosInstance;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: HQMessage[] = [];
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private messageIdCounter: number = 0;

  constructor(config: Partial<HQClientConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.http = axios.create({
      baseURL: this.config.hqUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * 连接到HQ服务器
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl, {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connection:established', { hqUrl: this.config.hqUrl });
          this.startHeartbeat();
          this.flushMessageQueue();
          this.setupWSListeners();
          resolve();
        });

        this.ws.on('error', (error) => {
          this.emit('connection:error', { error: error.message });
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('connection:lost', { code, reason: reason.toString() });
          this.scheduleReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.emit('connection:closed');
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.emit('reconnect:failed', { attempts: this.reconnectAttempts });
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.emit('reconnect:scheduled', { delay, attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Will trigger another reconnect via close handler
      }
    }, delay);
  }

  // ==========================================================================
  // WebSocket Message Handling
  // ==========================================================================

  private setupWSListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: HQMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        this.emit('error', { type: 'parse', error });
      }
    });
  }

  private handleMessage(message: HQMessage): void {
    const { type, payload, messageId } = message;

    // Handle responses to pending requests
    if (messageId && this.pendingRequests.has(messageId)) {
      const pending = this.pendingRequests.get(messageId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(messageId);
      if (type === 'error') {
        pending.reject(new Error(payload.message || 'Unknown error'));
      } else {
        pending.resolve(payload);
      }
      return;
    }

    // Emit as event
    this.emit(type, payload);
  }

  private sendMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Queue message for later
        this.messageQueue.push({ type, payload, timestamp: Date.now() });
        reject(new Error('WebSocket not connected'));
        return;
      }

      const messageId = `msg_${++this.messageIdCounter}_${Date.now()}`;
      const message: HQMessage = { type, payload, timestamp: Date.now(), messageId };

      // Set timeout for response
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request ${messageId} timed out`));
      }, this.config.timeout);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });
      this.ws.send(JSON.stringify(message));
    });
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.sendMessage(msg.type, msg.payload).catch(() => {
        // Re-queue if failed
        this.messageQueue.push(msg);
      });
    }
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        const start = Date.now();
        await this.sendMessage('heartbeat:ping', { timestamp: start });
        this.emit('heartbeat:sent', { latency: Date.now() - start });
      } catch (error) {
        this.emit('heartbeat:failed', { error });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ==========================================================================
  // Agent Management
  // ==========================================================================

  /**
   * 注册Agent到HQ
   */
  async registerAgent(agent: any): Promise<void> {
    await this.sendMessage('agent:register', agent);
    this.emit('agent:registered', { agentId: agent.id });
  }

  /**
   * 注销Agent
   */
  async unregisterAgent(agentId: string, reason?: string): Promise<void> {
    await this.sendMessage('agent:unregister', { agentId, reason });
    this.emit('agent:unregistered', { agentId });
  }

  /**
   * 注册所有Agent
   */
  async registerAllAgents(agents: any[]): Promise<void> {
    await Promise.all(agents.map(agent => this.registerAgent(agent)));
  }

  /**
   * 更新Agent状态
   */
  async updateAgentState(state: AgentState): Promise<void> {
    await this.sendMessage('agent:state-update', state);
  }

  // ==========================================================================
  // Task Management
  // ==========================================================================

  /**
   * 分发任务到HQ
   */
  async dispatchTask(task: Task): Promise<string> {
    const result = await this.sendMessage('task:dispatch', task);
    this.emit('task:dispatched', { taskId: result.taskId, task });
    return result.taskId;
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: string, result: any): Promise<void> {
    await this.sendMessage('task:complete', { taskId, result, completedAt: Date.now() });
    this.emit('task:completed', { taskId, result });
  }

  /**
   * 任务失败
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await this.sendMessage('task:failed', { taskId, error, failedAt: Date.now() });
    this.emit('task:failed', { taskId, error });
  }

  // ==========================================================================
  // State Sync
  // ==========================================================================

  /**
   * 同步状态到HQ
   */
  async syncState(state: AgentState): Promise<void> {
    await this.sendMessage('sync:state', state);
  }

  /**
   * 请求全量状态同步
   */
  async requestFullSync(): Promise<any> {
    return this.sendMessage('sync:full', {});
  }

  // ==========================================================================
  // HTTP Fallback Methods
  // ==========================================================================

  /**
   * HTTP方式发送请求 (WebSocket不可用时)
   */
  async httpPost(endpoint: string, data: any): Promise<any> {
    try {
      const response = await this.http.post(endpoint, data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.emit('http:error', { endpoint, error: axiosError.message });
      throw error;
    }
  }

  /**
   * HTTP方式获取数据
   */
  async httpGet(endpoint: string): Promise<any> {
    try {
      const response = await this.http.get(endpoint);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.emit('http:error', { endpoint, error: axiosError.message });
      throw error;
    }
  }

  // ==========================================================================
  // Status & Utilities
  // ==========================================================================

  /**
   * 是否已连接
   */
  isReady(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接状态
   */
  getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    pendingRequests: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isReady(),
      reconnectAttempts: this.reconnectAttempts,
      pendingRequests: this.pendingRequests.size,
      queuedMessages: this.messageQueue.length,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHQClient(config?: Partial<HQClientConfig>): HQClient {
  return new HQClient(config);
}

export default HQClient;
