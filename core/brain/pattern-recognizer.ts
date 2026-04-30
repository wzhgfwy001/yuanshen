/**
 * Pattern Recognizer - 模式识别模块
 * 
 * 提供意图检测、话题跟踪、情感分析和行为预测功能。
 * 
 * @version 1.0.0
 * @module brain
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Type Definitions
// ============================================================================

export type PatternType = 'intent' | 'topic' | 'sentiment' | 'behavior';

export interface RecognizedPattern {
  id: string;
  type: PatternType;
  label: string;
  confidence: number;
  examples: string[];
  lastMatched: number;
  matchCount: number;
  metadata?: Record<string, any>;
}

export interface PatternConfig {
  intentThreshold: number;
  sentimentThreshold: number;
  topicThreshold: number;
  behaviorThreshold: number;
  maxPatterns: number;
  decayRate: number;
}

// ============================================================================
// Intent Patterns
// ============================================================================

interface IntentPattern {
  label: string;
  patterns: string[];
  examples: string[];
  metadata?: Record<string, any>;
}

const DEFAULT_INTENT_PATTERNS: IntentPattern[] = [
  {
    label: 'greeting',
    patterns: ['你好', 'hi', 'hello', '嗨', 'hey', '早上好', '晚上好', 'good morning', 'good evening'],
    examples: ['你好', 'hello world', '早上好'],
  },
  {
    label: 'question',
    patterns: ['什么', '怎么', '如何', '为什么', '哪里', 'who', 'what', 'how', 'why', 'where', 'when', '?', '？'],
    examples: ['什么是量子计算', '怎么学习编程', '为什么天空是蓝色的'],
  },
  {
    label: 'request',
    patterns: ['帮我', '请', '能不能', 'could', 'please', 'help', '帮我做', '麻烦'],
    examples: ['帮我写代码', '请帮我查一下', '能不能告诉我'],
  },
  {
    label: 'command',
    patterns: ['执行', '做', '去', 'go', 'do', 'run', 'execute', 'start', 'stop', '创建', '删除'],
    examples: ['执行这个任务', '做一下分析', '创建新文件'],
  },
  {
    label: 'information',
    patterns: ['告诉', '查', '找', '搜索', 'find', 'search', 'look', 'look up', '查询'],
    examples: ['告诉我结果', '查一下天气', '搜索相关内容'],
  },
  {
    label: 'opinion',
    patterns: ['觉得', '认为', '看法', 'think', 'believe', 'opinion', '感觉', '以为'],
    examples: ['你觉得怎么样', '我认为', '这是什么看法'],
  },
  {
    label: 'clarification',
    patterns: ['解释', '说明', '详细', 'explain', 'clarify', '详细说明', '具体'],
    examples: ['解释一下', '详细说明', '具体是什么'],
  },
  {
    label: 'confirmation',
    patterns: ['对', '是的', '正确', 'yes', 'correct', 'right', '没错', '确认'],
    examples: ['对的', '是的', '你说的正确'],
  },
  {
    label: 'negation',
    patterns: ['不', 'no', 'not', '错', '不对', '不是', 'wrong', 'incorrect'],
    examples: ['不对', '不是这样', 'no'],
  },
  {
    label: 'gratitude',
    patterns: ['谢谢', '感谢', 'thanks', 'thank you', '多谢', '感恩'],
    examples: ['谢谢', '感谢你的帮助', 'thanks'],
  },
  {
    label: 'apology',
    patterns: ['对不起', '抱歉', 'sorry', 'apologize', '不好意思'],
    examples: ['对不起', '抱歉打扰', 'sorry'],
  },
  {
    label: 'farewell',
    patterns: ['再见', '拜拜', 'bye', 'goodbye', '下次见', '回头见'],
    examples: ['再见', '拜拜', 'bye'],
  },
];

// ============================================================================
// Sentiment Words
// ============================================================================

const POSITIVE_WORDS = [
  '好', '棒', '优秀', '喜欢', '爱', '赞', '完美', '出色', '太好了',
  'good', 'great', 'excellent', 'love', 'amazing', 'wonderful', 'fantastic',
  'happy', 'joy', 'best', 'awesome', 'perfect', 'beautiful', '😊', '👍', '❤️',
];

const NEGATIVE_WORDS = [
  '差', '烂', '坏', '不喜欢', '讨厌', '垃圾', '糟糕', '可恶', '失望',
  'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'sad',
  'angry', 'mad', 'disappointed', 'frustrated', '😠', '👎', '💔',
];

const INTENSIFIERS = ['非常', '特别', '极其', '十分', 'very', 'really', 'extremely', 'so', '超级'];
const NEGATORS = ['不', '没', '无', '非', 'not', 'no', 'never', 'neither'];

// ============================================================================
// Pattern Recognizer Class
// ============================================================================

export class PatternRecognizer {
  private patterns: Map<string, RecognizedPattern> = new Map();
  private config: PatternConfig;
  private intentPatterns: IntentPattern[];
  private recentlyMatched: Set<string> = new Set();

  constructor(
    config?: Partial<PatternConfig>,
    intentPatterns?: IntentPattern[]
  ) {
    this.config = {
      intentThreshold: 0.6,
      sentimentThreshold: 0.5,
      topicThreshold: 0.5,
      behaviorThreshold: 0.7,
      maxPatterns: 500,
      decayRate: 0.01,
      ...config,
    };

    this.intentPatterns = intentPatterns || DEFAULT_INTENT_PATTERNS;
  }

  // ==========================================================================
  // Intent Recognition
  // ==========================================================================

  /**
   * 识别意图
   */
  recognizeIntent(text: string): RecognizedPattern {
    const lowerText = text.toLowerCase();
    let bestMatch: RecognizedPattern | null = null;
    let bestScore = 0;

    for (const intent of this.intentPatterns) {
      let matchCount = 0;
      const matchedPatterns: string[] = [];

      for (const pattern of intent.patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          matchCount++;
          matchedPatterns.push(pattern);
        }
      }

      if (matchCount > 0) {
        // Calculate confidence based on match ratio
        const ratio = matchCount / intent.patterns.length;
        const confidence = Math.min(0.95, 0.5 + ratio * 0.3 + (matchCount > 1 ? 0.1 : 0));

        if (confidence > bestScore) {
          bestScore = confidence;
          bestMatch = {
            id: uuidv4(),
            type: 'intent',
            label: intent.label,
            confidence,
            examples: matchedPatterns,
            lastMatched: Date.now(),
            matchCount: 1,
            metadata: { fullExamples: intent.examples },
          };
        }
      }
    }

    // If no match found, detect as 'other'
    if (!bestMatch || bestScore < this.config.intentThreshold) {
      bestMatch = {
        id: uuidv4(),
        type: 'intent',
        label: 'other',
        confidence: 0.3,
        examples: [text.slice(0, 50)],
        lastMatched: Date.now(),
        matchCount: 1,
      };
    }

    // Store or update pattern
    this.updatePattern(bestMatch);

    return bestMatch;
  }

  /**
   * 批量识别意图
   */
  recognizeIntents(texts: string[]): RecognizedPattern[] {
    return texts.map(text => this.recognizeIntent(text));
  }

  // ==========================================================================
  // Sentiment Analysis
  // ==========================================================================

  /**
   * 分析情感
   */
  analyzeSentiment(text: string): RecognizedPattern {
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];

    const words = lowerText.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : '';
      const isNegated = NEGATORS.some(n => prevWord.includes(n));
      const isIntensified = INTENSIFIERS.some(int => prevWord.includes(int));

      // Check positive words
      const posMatch = POSITIVE_WORDS.find(p => word.includes(p.toLowerCase()));
      if (posMatch) {
        const score = isNegated ? -0.3 : (isIntensified ? 0.5 : 0.3);
        if (isNegated) {
          negativeScore += Math.abs(score);
          matchedNegative.push(posMatch);
        } else {
          positiveScore += score;
          matchedPositive.push(posMatch);
        }
      }

      // Check negative words
      const negMatch = NEGATIVE_WORDS.find(n => word.includes(n.toLowerCase()));
      if (negMatch) {
        const score = isNegated ? -0.3 : (isIntensified ? 0.5 : 0.3);
        if (isNegated) {
          positiveScore += Math.abs(score);
          matchedPositive.push(negMatch);
        } else {
          negativeScore += score;
          matchedNegative.push(negMatch);
        }
      }
    }

    // Determine sentiment label
    let label: 'positive' | 'neutral' | 'negative';
    let confidence: number;

    const diff = positiveScore - negativeScore;

    if (Math.abs(diff) < 0.3) {
      label = 'neutral';
      confidence = 0.5;
    } else if (diff > 0) {
      label = 'positive';
      confidence = Math.min(0.95, 0.5 + diff * 0.2);
    } else {
      label = 'negative';
      confidence = Math.min(0.95, 0.5 + Math.abs(diff) * 0.2);
    }

    const pattern: RecognizedPattern = {
      id: uuidv4(),
      type: 'sentiment',
      label,
      confidence,
      examples: [...matchedPositive.slice(0, 3), ...matchedNegative.slice(0, 3)],
      lastMatched: Date.now(),
      matchCount: 1,
      metadata: {
        positiveScore,
        negativeScore,
        matchedPositive,
        matchedNegative,
      },
    };

    this.updatePattern(pattern);
    return pattern;
  }

  /**
   * 批量分析情感
   */
  analyzeSentiments(texts: string[]): RecognizedPattern[] {
    return texts.map(text => this.analyzeSentiment(text));
  }

  // ==========================================================================
  // Topic Tracking
  // ==========================================================================

  /**
   * 识别话题
   */
  recognizeTopic(text: string): RecognizedPattern[] {
    const topics: RecognizedPattern[] = [];

    // Predefined topic keywords
    const topicKeywords: Record<string, string[]> = {
      'technology': ['技术', '科技', '电脑', '手机', 'software', 'hardware', 'ai', 'computer', 'phone'],
      'business': ['商业', '公司', '投资', '市场', 'business', 'company', 'market', 'investment', 'money'],
      'science': ['科学', '研究', '实验', 'science', 'research', 'study', 'experiment'],
      'education': ['学习', '教育', '学校', '课程', 'learn', 'education', 'school', 'course', 'study'],
      'entertainment': ['娱乐', '电影', '音乐', '游戏', 'movie', 'music', 'game', 'film', 'entertainment'],
      'health': ['健康', '医疗', '疾病', 'health', 'medical', 'disease', 'doctor', '医院'],
      'travel': ['旅行', '旅游', '酒店', 'travel', 'trip', 'hotel', 'flight'],
      'food': ['食物', '餐厅', '美食', 'food', 'restaurant', 'eat', 'meal'],
      'sports': ['运动', '比赛', '足球', '篮球', 'sports', 'game', 'football', 'basketball'],
      'news': ['新闻', '事件', '报道', 'news', 'event', 'report', 'happening'],
    };

    const lowerText = text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      let matchCount = 0;
      const matched: string[] = [];

      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchCount++;
          matched.push(keyword);
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(0.9, 0.4 + matchCount * 0.1);

        if (confidence >= this.config.topicThreshold) {
          topics.push({
            id: uuidv4(),
            type: 'topic',
            label: topic,
            confidence,
            examples: matched.slice(0, 3),
            lastMatched: Date.now(),
            matchCount: 1,
          });
        }
      }
    }

    return topics;
  }

  /**
   * 更新话题模式
   */
  private updateTopicPatterns(topics: RecognizedPattern[]): void {
    for (const topic of topics) {
      const existingKey = `topic:${topic.label}`;
      const existing = this.patterns.get(existingKey);

      if (existing) {
        existing.confidence = Math.min(0.95, (existing.confidence + topic.confidence) / 2 + 0.1);
        existing.matchCount++;
        existing.lastMatched = Date.now();
        existing.examples = [...new Set([...existing.examples, ...topic.examples])].slice(0, 10);
      } else {
        this.patterns.set(existingKey, { ...topic, examples: topic.examples.slice(0, 5) });
      }
    }
  }

  // ==========================================================================
  // Behavior Prediction
  // ==========================================================================

  /**
   * 预测行为
   */
  predictBehavior(context: { recentIntents?: string[]; recentTopics?: string[] }): RecognizedPattern[] {
    const predictions: RecognizedPattern[] = [];

    // Simple behavior patterns based on intent sequences
    const behaviorPatterns: Record<string, { sequence: string[]; nextIntent: string; confidence: number }> = {
      'question_then_request': {
        sequence: ['question', 'request'],
        nextIntent: 'request',
        confidence: 0.7,
      },
      'greeting_then_question': {
        sequence: ['greeting', 'question'],
        nextIntent: 'question',
        confidence: 0.8,
      },
      'request_then_confirmation': {
        sequence: ['request', 'confirmation'],
        nextIntent: 'other',
        confidence: 0.6,
      },
    };

    if (context.recentIntents && context.recentIntents.length >= 2) {
      const recent = context.recentIntents.slice(-2);
      const seqKey = recent.join('_then_');

      for (const [key, pattern] of Object.entries(behaviorPatterns)) {
        if (seqKey === key) {
          predictions.push({
            id: uuidv4(),
            type: 'behavior',
            label: `likely_${pattern.nextIntent}`,
            confidence: pattern.confidence,
            examples: [recent.join(' → ')],
            lastMatched: Date.now(),
            matchCount: 1,
            metadata: { pattern: key },
          });
        }
      }
    }

    return predictions;
  }

  // ==========================================================================
  // Pattern Management
  // ==========================================================================

  /**
   * 更新模式
   */
  private updatePattern(pattern: RecognizedPattern): void {
    const key = `${pattern.type}:${pattern.label}`;
    const existing = this.patterns.get(key);

    if (existing) {
      existing.confidence = Math.min(0.95, (existing.confidence + pattern.confidence) / 2 + 0.05);
      existing.matchCount++;
      existing.lastMatched = Date.now();
      existing.examples = [...new Set([...existing.examples, ...pattern.examples])].slice(0, 20);
    } else {
      if (this.patterns.size >= this.config.maxPatterns) {
        // Remove least recently used
        let oldest: RecognizedPattern | null = null;
        let oldestKey: string | null = null;
        for (const [k, p] of this.patterns) {
          if (!oldest || p.lastMatched < oldest.lastMatched) {
            oldest = p;
            oldestKey = k;
          }
        }
        if (oldestKey) this.patterns.delete(oldestKey);
      }
      this.patterns.set(key, { ...pattern });
    }

    this.recentlyMatched.add(key);

    // Clear recently matched after a short delay
    setTimeout(() => {
      this.recentlyMatched.delete(key);
    }, 5000);
  }

  /**
   * 获取模式
   */
  getPattern(type: PatternType, label: string): RecognizedPattern | undefined {
    return this.patterns.get(`${type}:${label}`);
  }

  /**
   * 获取所有模式
   */
  getAllPatterns(type?: PatternType): RecognizedPattern[] {
    if (type) {
      return Array.from(this.patterns.values()).filter(p => p.type === type);
    }
    return Array.from(this.patterns.values());
  }

  /**
   * 获取高频模式
   */
  getFrequentPatterns(type: PatternType, minCount: number = 5): RecognizedPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.type === type && p.matchCount >= minCount)
      .sort((a, b) => b.matchCount - a.matchCount);
  }

  /**
   * 清除旧模式
   */
  clearOldPatterns(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let cleared = 0;

    for (const [key, pattern] of this.patterns) {
      if (pattern.lastMatched < cutoff) {
        this.patterns.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * 综合分析
   */
  analyze(text: string): {
    intent: RecognizedPattern;
    sentiment: RecognizedPattern;
    topics: RecognizedPattern[];
  } {
    return {
      intent: this.recognizeIntent(text),
      sentiment: this.analyzeSentiment(text),
      topics: this.recognizeTopic(text),
    };
  }

  /**
   * 获取统计
   */
  getStats(): {
    totalPatterns: number;
    byType: Record<PatternType, number>;
    topPatterns: { label: string; count: number }[];
  } {
    const byType: Record<PatternType, number> = {
      intent: 0,
      topic: 0,
      sentiment: 0,
      behavior: 0,
    };

    for (const pattern of this.patterns.values()) {
      byType[pattern.type]++;
    }

    const topPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10)
      .map(p => ({ label: `${p.type}:${p.label}`, count: p.matchCount }));

    return {
      totalPatterns: this.patterns.size,
      byType,
      topPatterns,
    };
  }
}

export default PatternRecognizer;
