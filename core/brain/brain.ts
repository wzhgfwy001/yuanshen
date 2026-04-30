/**
 * Brain Core - 大脑/记忆核心模块
 * 
 * 混合动态多Agent系统的智能核心，提供记忆存储、上下文管理、
 * 模式识别和知识图谱功能。
 * 
 * @version 1.0.0
 * @module brain
 */

import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

export type MemoryType = 'working' | 'episodic' | 'longterm' | 'procedural';

export interface MemoryContent {
  type?: MemoryType;
  content: any;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: any;
  importance: number;
  relevance: number;
  timestamp: number;
  expiresAt?: number;
  tags: string[];
  embedding?: number[];
  accessCount: number;
  lastAccessed: number;
  metadata: Record<string, any>;
}

export interface MemoryQuery {
  query?: string;
  type?: MemoryType[];
  tags?: string[];
  limit?: number;
  minRelevance?: number;
  timeRange?: { start: number; end: number };
  metadata?: Record<string, any>;
}

export interface ContextWindow {
  id: string;
  sessionId: string;
  messages: Message[];
  summary: string;
  focus: string[];
  entities: Entity[];
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevanceScores: Map<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface Entity {
  name: string;
  type: string;
  mentions: number;
  firstSeen: number;
  lastSeen: number;
}

export interface RecognizedPattern {
  type: 'intent' | 'topic' | 'sentiment' | 'behavior';
  label: string;
  confidence: number;
  examples: string[];
  lastMatched: number;
}

export interface Concept {
  concept: string;
  definition: string;
  relations?: { type: string; target: string }[];
  examples?: string[];
  metadata?: Record<string, any>;
}

export interface BrainConfig {
  workingMemorySize: number;
  episodicRetention: number;
  longTermCapacity: number;
  patternThreshold: number;
  contextWindow: number;
  workingMemoryTTL: number;
  forgetThreshold: number;
  decayRate: number;
}

// ============================================================================
// Memory Store
// ============================================================================

interface MemoryStore {
  working: MemoryItem[];
  episodic: MemoryItem[];
  longterm: MemoryItem[];
  procedural: MemoryItem[];
}

// ============================================================================
// Brain Core Class
// ============================================================================

export class Brain extends EventEmitter {
  private config: BrainConfig;
  private store: MemoryStore = {
    working: [],
    episodic: [],
    longterm: [],
    procedural: [],
  };
  private contexts: Map<string, ContextWindow> = new Map();
  private currentContextId: string | null = null;
  private patterns: Map<string, RecognizedPattern> = new Map();
  private knowledgeGraph: Map<string, Concept> = new Map();
  private decayTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<BrainConfig> = {}) {
    super();

    this.config = {
      workingMemorySize: 7,
      episodicRetention: 24 * 60 * 60 * 1000,  // 24 hours
      longTermCapacity: 100000,
      patternThreshold: 0.7,
      contextWindow: 20,
      workingMemoryTTL: 5 * 60 * 1000,  // 5 minutes
      forgetThreshold: 0.2,
      decayRate: 0.01,
      ...config,
    };

    this.startDecayProcess();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    this.emit('brain:initialized');
    this.createContext('default');
  }

  private createContext(sessionId: string): ContextWindow {
    const ctx: ContextWindow = {
      id: uuidv4(),
      sessionId,
      messages: [],
      summary: '',
      focus: [],
      entities: [],
      intent: 'unknown',
      sentiment: 'neutral',
      relevanceScores: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.contexts.set(sessionId, ctx);
    return ctx;
  }

  // ==========================================================================
  // Memory Operations
  // ==========================================================================

  /**
   * 存储记忆
   */
  async remember(content: MemoryContent): Promise<MemoryItem> {
    const type = content.type || this.decideMemoryType(content);
    const importance = content.importance ?? this.assessImportance(content);

    const item: MemoryItem = {
      id: uuidv4(),
      type,
      content: content.content,
      importance,
      relevance: 1.0,
      timestamp: Date.now(),
      tags: content.tags || [],
      metadata: content.metadata || {},
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Add to appropriate store
    this.store[type].push(item);

    // Enforce capacity limits
    await this.enforceCapacity(type);

    // If important, consider promoting to long-term
    if (importance > 0.8 && type !== 'longterm') {
      this.potentiallyPromote(item);
    }

    this.emit('memory:stored', item);
    return item;
  }

  /**
   * 检索记忆
   */
  async recall(query: MemoryQuery): Promise<MemoryItem[]> {
    let results: MemoryItem[] = [];

    // Search each type
    const typesToSearch = query.type || ['working', 'episodic', 'longterm', 'procedural'];

    for (const type of typesToSearch) {
      let items = this.store[type];

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        items = items.filter(item =>
          query.tags!.some(tag => item.tags.includes(tag))
        );
      }

      // Filter by time range
      if (query.timeRange) {
        items = items.filter(item =>
          item.timestamp >= query.timeRange!.start &&
          item.timestamp <= query.timeRange!.end
        );
      }

      // Filter by metadata
      if (query.metadata) {
        items = items.filter(item =>
          Object.entries(query.metadata!).every(([k, v]) => item.metadata[k] === v)
        );
      }

      // Calculate relevance scores
      if (query.query) {
        items = items.map(item => ({
          ...item,
          relevance: this.calculateRelevance(item, query.query!),
        })).filter(item => item.relevance >= (query.minRelevance || 0));
      }

      results = results.concat(items);
    }

    // Sort by relevance and importance
    results.sort((a, b) => {
      const scoreA = a.relevance * 0.6 + a.importance * 0.4;
      const scoreB = b.relevance * 0.6 + b.importance * 0.4;
      return scoreB - scoreA;
    });

    // Update access stats
    const limited = results.slice(0, query.limit || 10);
    limited.forEach(item => {
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.emit('memory:retrieved', item);
    });

    return limited;
  }

  /**
   * 遗忘记忆
   */
  async forget(memoryId: string, reason?: string): Promise<boolean> {
    for (const [type, items] of Object.entries(this.store) as [MemoryType, MemoryItem[]][]) {
      const index = items.findIndex(item => item.id === memoryId);
      if (index !== -1) {
        items.splice(index, 1);
        this.emit('memory:forgotten', { id: memoryId, reason, type });
        return true;
      }
    }
    return false;
  }

  /**
   * 更新记忆
   */
  async updateMemory(memoryId: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    for (const items of Object.values(this.store) as [MemoryItem[]][]) {
      const item = items.find(i => i.id === memoryId);
      if (item) {
        Object.assign(item, updates);
        this.emit('memory:updated', item);
        return item;
      }
    }
    return null;
  }

  // ==========================================================================
  // Context Management
  // ==========================================================================

  /**
   * 更新上下文
   */
  updateContext(messages: Message[], sessionId: string = 'default'): void {
    let ctx = this.contexts.get(sessionId);
    if (!ctx) {
      ctx = this.createContext(sessionId);
    }

    // Add new messages
    ctx.messages.push(...messages.map(m => ({
      ...m,
      timestamp: m.timestamp || Date.now(),
    })));

    // Trim to window size
    if (ctx.messages.length > this.config.contextWindow) {
      const trimmed = ctx.messages.slice(-this.config.contextWindow);
      ctx.summary = this.summarizeMessages(ctx.messages.slice(0, -this.config.contextWindow));
      ctx.messages = trimmed;
    }

    // Update focus and entities
    ctx.focus = this.extractFocus(ctx.messages);
    ctx.entities = this.extractEntities(ctx.messages);
    ctx.intent = this.detectIntent(ctx.messages);
    ctx.sentiment = this.analyzeSentiment(ctx.messages);
    ctx.updatedAt = Date.now();

    this.emit('context:updated', ctx);
  }

  /**
   * 获取当前上下文
   */
  getCurrentContext(sessionId: string = 'default'): ContextWindow | null {
    return this.contexts.get(sessionId) || null;
  }

  /**
   * 切换上下文
   */
  switchContext(sessionId: string): ContextWindow {
    this.currentContextId = sessionId;
    let ctx = this.contexts.get(sessionId);
    if (!ctx) {
      ctx = this.createContext(sessionId);
    }
    this.emit('context:switched', { sessionId, context: ctx });
    return ctx;
  }

  // ==========================================================================
  // Pattern Recognition
  // ==========================================================================

  /**
   * 模式识别
   */
  recognizePattern(input: { type: 'intent' | 'sentiment'; input: string }): RecognizedPattern | null {
    const { type, input: text } = input;

    if (type === 'intent') {
      return this.recognizeIntent(text);
    } else if (type === 'sentiment') {
      return this.recognizeSentiment(text);
    }

    return null;
  }

  private recognizeIntent(text: string): RecognizedPattern {
    const intents = [
      { label: 'greeting', patterns: ['你好', 'hi', 'hello', '嗨', 'hey'], examples: [] },
      { label: 'question', patterns: ['什么是', '怎么', '如何', '为什么', 'what', 'how', 'why'], examples: [] },
      { label: 'request', patterns: ['帮我', '请', '能不能', 'could you', 'please', 'help'], examples: [] },
      { label: 'command', patterns: ['执行', '做', '去', 'go', 'do', 'execute', 'run'], examples: [] },
      { label: 'information', patterns: ['告诉', '查一下', '找', 'find', 'search', 'look up'], examples: [] },
    ];

    let bestMatch = { label: 'unknown', confidence: 0, patterns: [] };

    for (const intent of intents) {
      for (const pattern of intent.patterns) {
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          const confidence = intent.patterns.indexOf(pattern) === 0 ? 0.9 : 0.7;
          if (confidence > bestMatch.confidence) {
            bestMatch = { ...intent, confidence };
          }
        }
      }
    }

    const pattern: RecognizedPattern = {
      type: 'intent',
      label: bestMatch.label,
      confidence: bestMatch.confidence,
      examples: [text],
      lastMatched: Date.now(),
    };

    this.emit('pattern:recognized', pattern);
    return pattern;
  }

  private recognizeSentiment(text: string): RecognizedPattern {
    const positive = ['好', '棒', '优秀', '喜欢', '谢谢', 'good', 'great', 'excellent', 'love', 'thanks'];
    const negative = ['差', '烂', '不喜欢', '讨厌', '坏', 'bad', 'terrible', 'hate', 'awful', 'worst'];

    let score = 0;
    const lower = text.toLowerCase();

    for (const word of positive) {
      if (lower.includes(word)) score += 0.2;
    }
    for (const word of negative) {
      if (lower.includes(word)) score -= 0.2;
    }

    const sentiment = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';

    return {
      type: 'sentiment',
      label: sentiment,
      confidence: Math.abs(score),
      examples: [text],
      lastMatched: Date.now(),
    };
  }

  // ==========================================================================
  // Knowledge Management
  // ==========================================================================

  /**
   * 学习新概念
   */
  async learn(concept: Concept): Promise<void> {
    this.knowledgeGraph.set(concept.concept, {
      ...concept,
      metadata: {
        ...concept.metadata,
        learnedAt: Date.now(),
      },
    });

    // Store in long-term memory
    await this.remember({
      type: 'longterm',
      content: concept,
      importance: 0.9,
      tags: ['knowledge', 'concept', concept.concept],
    });

    this.emit('learning:complete', concept);
    this.emit('knowledge:updated', { concept, action: 'learned' });
  }

  /**
   * 查询知识
   */
  queryKnowledge(concept: string): Concept | null {
    return this.knowledgeGraph.get(concept) || null;
  }

  /**
   * 获取相关知识
   */
  getRelatedKnowledge(concept: string): Concept[] {
    const target = this.knowledgeGraph.get(concept);
    if (!target || !target.relations) return [];

    return target.relations
      .map(rel => this.knowledgeGraph.get(rel.target))
      .filter((c): c is Concept => c !== undefined);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private decideMemoryType(content: MemoryContent): MemoryType {
    if (content.metadata?.skill || content.metadata?.procedure) {
      return 'procedural';
    }
    if (content.importance && content.importance > 0.7) {
      return 'longterm';
    }
    return 'episodic';
  }

  private assessImportance(content: MemoryContent): number {
    let score = 0.5;

    if (content.tags) {
      if (content.tags.includes('important')) score += 0.2;
      if (content.tags.includes('user-preference')) score += 0.2;
      if (content.tags.includes('error') || content.tags.includes('failure')) score += 0.3;
    }

    if (content.metadata) {
      if (content.metadata.repeated > 3) score += 0.2;
      if (content.metadata.userRated === 'high') score += 0.2;
    }

    return Math.min(1, Math.max(0, score));
  }

  private calculateRelevance(item: MemoryItem, query: string): number {
    // Simple relevance based on content match and tags
    let score = 0;

    const queryLower = query.toLowerCase();
    const contentStr = typeof item.content === 'string'
      ? item.content.toLowerCase()
      : JSON.stringify(item.content).toLowerCase();

    // Content match
    if (contentStr.includes(queryLower)) {
      score += 0.5;
      // Exact match bonus
      if (contentStr === queryLower) score += 0.3;
    }

    // Tag match
    const matchingTags = item.tags.filter(tag =>
      tag.toLowerCase().includes(queryLower)
    ).length;
    score += matchingTags * 0.1;

    // Recency bonus
    const hoursSinceAccess = (Date.now() - item.lastAccessed) / (1000 * 60 * 60);
    if (hoursSinceAccess < 1) score += 0.1;
    else if (hoursSinceAccess < 24) score += 0.05;

    return Math.min(1, score);
  }

  private async enforceCapacity(type: MemoryType): Promise<void> {
    const store = this.store[type];
    const limits: Record<MemoryType, number> = {
      working: this.config.workingMemorySize,
      episodic: 1000,
      longterm: this.config.longTermCapacity,
      procedural: 10000,
    };

    const limit = limits[type];

    while (store.length > limit) {
      // Remove least important/relevant
      store.sort((a, b) => {
        const scoreA = a.importance * a.relevance;
        const scoreB = b.importance * b.relevance;
        return scoreA - scoreB;
      });

      const removed = store.shift();
      if (removed) {
        this.emit('memory:forgotten', { id: removed.id, reason: 'capacity_limit', type });
      }
    }
  }

  private potentiallyPromote(item: MemoryItem): void {
    // Check if already in long-term
    if (item.type === 'longterm') return;

    // Remove from current store
    const currentStore = this.store[item.type];
    const index = currentStore.findIndex(i => i.id === item.id);
    if (index !== -1) {
      currentStore.splice(index, 1);
    }

    // Add to long-term
    item.type = 'longterm';
    this.store.longterm.push(item);

    this.emit('memory:consolidated', { item, from: item.type, to: 'longterm' });
  }

  private extractFocus(messages: Message[]): string[] {
    // Extract topics from recent messages
    const topics: Map<string, number> = new Map();

    for (const msg of messages.slice(-5)) {
      const words = msg.content.split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        topics.set(word, (topics.get(word) || 0) + 1);
      });
    }

    return Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractEntities(messages: Message[]): Entity[] {
    // Simple entity extraction (placeholder)
    const entities: Map<string, Entity> = new Map();

    for (const msg of messages) {
      // Very basic: extract capitalized words as entities
      const matches = msg.content.match(/[A-Z][a-z]+/g) || [];
      matches.forEach(match => {
        const existing = entities.get(match);
        if (existing) {
          existing.mentions++;
          existing.lastSeen = Date.now();
        } else {
          entities.set(match, {
            name: match,
            type: 'unknown',
            mentions: 1,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
          });
        }
      });
    }

    return Array.from(entities.values());
  }

  private detectIntent(messages: Message[]): string {
    const recentMessages = messages.slice(-3);
    const lastMessage = recentMessages[recentMessages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') return 'unknown';

    const pattern = this.recognizeIntent(lastMessage.content);
    return pattern?.label || 'unknown';
  }

  private analyzeSentiment(messages: Message[]): 'positive' | 'neutral' | 'negative' {
    const userMessages = messages.filter(m => m.role === 'user');
    const recentMessages = userMessages.slice(-3);

    let totalScore = 0;

    for (const msg of recentMessages) {
      const pattern = this.recognizeSentiment(msg.content);
      if (pattern.label === 'positive') totalScore += pattern.confidence;
      else if (pattern.label === 'negative') totalScore -= pattern.confidence;
    }

    if (totalScore > 0.2) return 'positive';
    if (totalScore < -0.2) return 'negative';
    return 'neutral';
  }

  private summarizeMessages(messages: Message[]): string {
    if (messages.length === 0) return '';
    // Simple summarization: first + last + key topics
    const first = messages[0].content.slice(0, 50);
    const last = messages[messages.length - 1].content.slice(0, 50);
    return `[Summary of ${messages.length} messages] First: ${first}... Last: ${last}...`;
  }

  private startDecayProcess(): void {
    this.decayTimer = setInterval(() => {
      // Decay episodic memory importance
      for (const item of this.store.episodic) {
        const hoursElapsed = (Date.now() - item.timestamp) / (1000 * 60 * 60);
        const decay = this.config.decayRate * hoursElapsed;
        item.importance = Math.max(0, item.importance - decay);

        // Forget if below threshold
        if (item.importance < this.config.forgetThreshold) {
          this.forget(item.id, 'importance_decay');
        }
      }
    }, 60 * 60 * 1000);  // Run every hour
  }

  /**
   * 获取记忆统计
   */
  getStats(): {
    totalMemories: number;
    byType: Record<MemoryType, number>;
    knowledgeCount: number;
    contextCount: number;
  } {
    return {
      totalMemories: Object.values(this.store).reduce((sum, arr) => sum + arr.length, 0),
      byType: {
        working: this.store.working.length,
        episodic: this.store.episodic.length,
        longterm: this.store.longterm.length,
        procedural: this.store.procedural.length,
      },
      knowledgeCount: this.knowledgeGraph.size,
      contextCount: this.contexts.size,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
    this.removeAllListeners();
  }
}

export default Brain;
