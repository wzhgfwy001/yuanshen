/**
 * Context Manager - 上下文管理模块
 * 
 * 管理对话上下文窗口、注意力过滤、相关性评分和摘要生成。
 * 
 * @version 1.0.0
 * @module brain
 */

import { v4 as uuidv4 } from 'uuid';
import { Message, Entity, ContextWindow } from './brain';

// ============================================================================
// Context Manager Configuration
// ============================================================================

export interface ContextManagerConfig {
  windowSize: number;
  summaryThreshold: number;
  relevanceThreshold: number;
  focusRetentionSize: number;
  entityTrackingLimit: number;
  autoSummarize: boolean;
}

// ============================================================================
// Relevance Scoring Weights
// ============================================================================

interface ScoringWeights {
  recency: number;
  topicMatch: number;
  entityMatch: number;
  intentMatch: number;
  explicit: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.3,
  topicMatch: 0.25,
  entityMatch: 0.2,
  intentMatch: 0.15,
  explicit: 0.1,
};

// ============================================================================
// Context Manager Class
// ============================================================================

export class ContextManager {
  private contexts: Map<string, ContextWindow> = new Map();
  private config: ContextManagerConfig;
  private weights: ScoringWeights;

  constructor(config?: Partial<ContextManagerConfig>, weights?: Partial<ScoringWeights>) {
    this.config = {
      windowSize: 20,
      summaryThreshold: 10,
      relevanceThreshold: 0.5,
      focusRetentionSize: 3,
      entityTrackingLimit: 50,
      autoSummarize: true,
      ...config,
    };

    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  // ==========================================================================
  // Context Operations
  // ==========================================================================

  /**
   * 创建新上下文
   */
  createContext(sessionId: string): ContextWindow {
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

  /**
   * 获取上下文
   */
  getContext(sessionId: string): ContextWindow | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * 删除上下文
   */
  deleteContext(sessionId: string): boolean {
    return this.contexts.delete(sessionId);
  }

  /**
   * 获取或创建上下文
   */
  getOrCreateContext(sessionId: string): ContextWindow {
    return this.contexts.get(sessionId) || this.createContext(sessionId);
  }

  // ==========================================================================
  // Message Management
  // ==========================================================================

  /**
   * 添加消息到上下文
   */
  addMessages(sessionId: string, messages: Message[]): ContextWindow {
    const ctx = this.getOrCreateContext(sessionId);

    // Add new messages
    const newMessages = messages.map(m => ({
      ...m,
      timestamp: m.timestamp || Date.now(),
    }));

    ctx.messages.push(...newMessages);

    // Trim if exceeds window size
    if (ctx.messages.length > this.config.windowSize) {
      const excess = ctx.messages.length - this.config.windowSize;
      const oldMessages = ctx.messages.slice(0, excess);

      // Generate summary if auto-summarize enabled
      if (this.config.autoSummarize && oldMessages.length >= this.config.summaryThreshold) {
        ctx.summary = this.generateSummary(oldMessages);
      }

      // Keep only recent messages
      ctx.messages = ctx.messages.slice(-this.config.windowSize);
    }

    // Update focus and entities
    ctx.focus = this.updateFocus(ctx.messages);
    ctx.entities = this.updateEntities(ctx.messages, ctx.entities);
    ctx.intent = this.detectIntent(ctx.messages);
    ctx.sentiment = this.analyzeSentiment(ctx.messages);
    ctx.updatedAt = Date.now();

    return ctx;
  }

  /**
   * 清空上下文消息
   */
  clearMessages(sessionId: string): void {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      ctx.messages = [];
      ctx.summary = '';
      ctx.updatedAt = Date.now();
    }
  }

  // ==========================================================================
  // Focus & Entity Management
  // ==========================================================================

  /**
   * 更新焦点话题
   */
  private updateFocus(messages: Message[]): string[] {
    const wordFreq: Map<string, number> = new Map();
    const stopWords = new Set(['的', '了', '是', '在', '我', '你', '他', '她', '它', '们', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'in', 'that', 'this']);

    const recentMessages = messages.slice(-5);

    for (const msg of recentMessages) {
      const words = msg.content.split(/\s+/).filter(w =>
        w.length > 2 && !stopWords.has(w.toLowerCase())
      );

      words.forEach(word => {
        const clean = word.replace(/[^\w\u4e00-\u9fff]/g, '');
        if (clean.length > 2) {
          wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
        }
      });
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.focusRetentionSize)
      .map(([word]) => word);
  }

  /**
   * 更新实体追踪
   */
  private updateEntities(messages: Message[], existing: Entity[]): Entity[] {
    const entityMap = new Map(existing.map(e => [e.name, e]));

    for (const msg of messages.slice(-10)) {
      // Simple entity extraction (proper nouns, capitalized words)
      const patterns = [
        /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,  // English proper nouns
        /[\u4e00-\u9fff]{2,}/g,  // Chinese words
      ];

      for (const pattern of patterns) {
        const matches = msg.content.match(pattern) || [];
        for (const match of matches) {
          const existing = entityMap.get(match);
          if (existing) {
            existing.mentions++;
            existing.lastSeen = Date.now();
          } else {
            entityMap.set(match, {
              name: match,
              type: 'unknown',
              mentions: 1,
              firstSeen: Date.now(),
              lastSeen: Date.now(),
            });
          }
        }
      }
    }

    // Limit total entities
    const entities = Array.from(entityMap.values());
    if (entities.length > this.config.entityTrackingLimit) {
      return entities
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, this.config.entityTrackingLimit);
    }

    return entities;
  }

  /**
   * 显式设置焦点
   */
  setFocus(sessionId: string, focus: string[]): void {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      ctx.focus = focus.slice(0, this.config.focusRetentionSize);
      ctx.updatedAt = Date.now();
    }
  }

  /**
   * 添加焦点话题
   */
  addFocus(sessionId: string, topic: string): void {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      ctx.focus = [topic, ...ctx.focus.filter(t => t !== topic)]
        .slice(0, this.config.focusRetentionSize);
      ctx.updatedAt = Date.now();
    }
  }

  // ==========================================================================
  // Intent & Sentiment
  // ==========================================================================

  /**
   * 检测意图
   */
  private detectIntent(messages: Message[]): string {
    if (messages.length === 0) return 'unknown';

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return 'unknown';

    const content = lastUserMsg.content.toLowerCase();

    // Intent patterns
    const intents = [
      { label: 'greeting', patterns: ['你好', 'hi', 'hello', '嗨', 'hey', '早上好', '晚上好'] },
      { label: 'question', patterns: ['什么', '怎么', '如何', '为什么', '哪里', 'who', 'what', 'how', 'why', 'where', 'when'] },
      { label: 'request', patterns: ['帮我', '请', '能不能', 'could', 'please', 'help'] },
      { label: 'command', patterns: ['执行', '做', '去', 'go', 'do', 'run', 'execute'] },
      { label: 'information', patterns: ['告诉', '查', '找', 'find', 'search', 'look'] },
      { label: 'opinion', patterns: ['觉得', '认为', 'think', 'believe', 'opinion'] },
      { label: 'clarification', patterns: ['解释', '说明', 'explain', 'clarify'] },
    ];

    for (const intent of intents) {
      for (const pattern of intent.patterns) {
        if (content.includes(pattern)) {
          return intent.label;
        }
      }
    }

    return 'unknown';
  }

  /**
   * 分析情感
   */
  private analyzeSentiment(messages: Message[]): 'positive' | 'neutral' | 'negative' {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return 'neutral';

    const recentMsgs = userMsgs.slice(-3);
    let totalScore = 0;

    for (const msg of recentMsgs) {
      const content = msg.content.toLowerCase();

      const positive = ['好', '棒', '优秀', '喜欢', '谢谢', 'good', 'great', 'excellent', 'love', 'thanks', '👍', '❤️'];
      const negative = ['差', '烂', '不喜欢', '讨厌', '坏', 'bad', 'terrible', 'hate', 'awful', '😠', '👎'];

      for (const word of positive) {
        if (content.includes(word)) totalScore += 0.3;
      }
      for (const word of negative) {
        if (content.includes(word)) totalScore -= 0.3;
      }
    }

    if (totalScore > 0.2) return 'positive';
    if (totalScore < -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * 显式设置情感
   */
  setSentiment(sessionId: string, sentiment: 'positive' | 'neutral' | 'negative'): void {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      ctx.sentiment = sentiment;
      ctx.updatedAt = Date.now();
    }
  }

  // ==========================================================================
  // Relevance & Filtering
  // ==========================================================================

  /**
   * 计算消息相关性分数
   */
  calculateRelevance(sessionId: string, query: string): Map<string, number> {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) return new Map();

    const scores = new Map<string, number>();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    for (const msg of ctx.messages) {
      const content = msg.content.toLowerCase();
      let score = 0;

      // Term matching
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 0.2;
        }
      }

      // Focus match bonus
      for (const focus of ctx.focus) {
        if (content.includes(focus.toLowerCase())) {
          score += 0.15;
        }
      }

      // Entity match bonus
      for (const entity of ctx.entities) {
        if (content.includes(entity.name.toLowerCase())) {
          score += 0.1;
        }
      }

      // Recency bonus
      const age = Date.now() - (msg.timestamp || Date.now());
      if (age < 5 * 60 * 1000) score += 0.2;  // Last 5 min
      else if (age < 30 * 60 * 1000) score += 0.1;  // Last 30 min

      scores.set(msg.content, Math.min(1, score));
    }

    ctx.relevanceScores = scores;
    return scores;
  }

  /**
   * 获取过滤后的消息
   */
  getFilteredMessages(sessionId: string, query?: string): Message[] {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) return [];

    if (!query) {
      return ctx.messages;
    }

    const scores = this.calculateRelevance(sessionId, query);
    return ctx.messages
      .filter(msg => (scores.get(msg.content) || 0) >= this.config.relevanceThreshold)
      .sort((a, b) => {
        const scoreA = scores.get(a.content) || 0;
        const scoreB = scores.get(b.content) || 0;
        return scoreB - scoreA;
      });
  }

  // ==========================================================================
  // Summary Generation
  // ==========================================================================

  /**
   * 生成摘要
   */
  generateSummary(messages: Message[]): string {
    if (messages.length === 0) return '';

    // Simple extractive summary: first message, key topics, last message
    const first = messages[0];
    const last = messages[messages.length - 1];

    // Extract key topics
    const wordFreq: Map<string, number> = new Map();
    const stopWords = new Set(['的', '了', '是', '在', '我', '你', 'the', 'a', 'is', 'are']);

    for (const msg of messages) {
      const words = msg.content.split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[^\w\u4e00-\u9fff]/g, '').toLowerCase();
        if (clean.length > 2 && !stopWords.has(clean)) {
          wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
        }
      }
    }

    const topTopics = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    return `[${messages.length}条消息摘要] ` +
      `主题: ${topTopics.join(', ')}; ` +
      `首: ${first.content.slice(0, 30)}...; ` +
      `末: ${last.content.slice(0, 30)}...`;
  }

  /**
   * 获取完整上下文文本
   */
  getFullContext(sessionId: string, includeSummary: boolean = true): string {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) return '';

    const parts: string[] = [];

    if (includeSummary && ctx.summary) {
      parts.push(`[摘要] ${ctx.summary}`);
    }

    if (ctx.focus.length > 0) {
      parts.push(`[焦点] ${ctx.focus.join(', ')}`);
    }

    if (ctx.intent !== 'unknown') {
      parts.push(`[意图] ${ctx.intent}`);
    }

    parts.push('[对话]');
    for (const msg of ctx.messages) {
      const role = msg.role === 'user' ? '用户' : '助手';
      parts.push(`${role}: ${msg.content}`);
    }

    return parts.join('\n');
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * 获取所有上下文ID
   */
  getAllContextIds(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * 获取上下文统计
   */
  getStats(): {
    contextCount: number;
    totalMessages: number;
    avgMessagesPerContext: number;
  } {
    const contexts = Array.from(this.contexts.values());
    const totalMessages = contexts.reduce((sum, ctx) => sum + ctx.messages.length, 0);

    return {
      contextCount: contexts.length,
      totalMessages,
      avgMessagesPerContext: contexts.length > 0 ? totalMessages / contexts.length : 0,
    };
  }
}

export default ContextManager;
