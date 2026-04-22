/**
 * 瓶颈诊断器 - 核心诊断逻辑 v2.0
 * 基于DeerFlow架构优化：
 * 1. 结构化状态
 * 2. 中间件管道
 * 3. 结果缓存
 * 4. 事件系统
 */

const crypto = require('crypto');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class DiagnosisResult {
  constructor(level, diagnosis) {
    this.level = level;
    this.levelName = diagnosis.levelName;
    this.description = diagnosis.description;
    this.confidence = diagnosis.confidence;
    this.detectedSignals = diagnosis.detectedSignals || [];
    this.clarifyingQuestions = diagnosis.clarifyingQuestions || [];
    this.recommendation = diagnosis.recommendation;
  }

  toJSON() {
    return {
      level: this.level,
      levelName: this.levelName,
      description: this.description,
      confidence: this.confidence,
      detectedSignals: this.detectedSignals,
      clarifyingQuestions: this.clarifyingQuestions,
      recommendation: this.recommendation
    };
  }
}

class DiagnosisMetadata {
  constructor() {
    this.version = '2.0';
    this.timestamp = new Date().toISOString();
    this.durationMs = 0;
    this.cacheHit = false;
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class DiagnosisEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[DiagnosisEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new DiagnosisEmitter();

// 事件类型
const EVENTS = {
  DIAGNOSIS_COMPLETE: 'diagnosis_complete',
  READY_TO_PROCEED: 'ready_to_proceed',
  NEEDS_CLARIFICATION: 'needs_clarification'
};

emitter.on(EVENTS.READY_TO_PROCEED, (result) => {
  console.log(`[Diagnosis] ✅ 任务就绪，可以执行 (置信度: ${(result.confidence * 100).toFixed(0)}%)`);
});

emitter.on(EVENTS.NEEDS_CLARIFICATION, (result) => {
  console.log(`[Diagnosis] ⚠️ 需要澄清 (层级: ${result.level})`);
});

// ==================== DeerFlow借鉴: 中间件管道 ====================

class DiagnosisMiddleware {
  beforeDiagnose(text, context) { return { text, context }; }
  afterDiagnose(result, context) { return result; }
}

class DiagnosisPipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  execute(text, context, diagnoseFn) {
    let ctx = { text, context, errors: [] };

    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeDiagnose(ctx.text, ctx.context);
        ctx.text = result.text;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    let result;
    try {
      result = diagnoseFn(ctx.text, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      result = new DiagnosisResult('L0', {
        levelName: '诊断错误',
        description: e.message,
        confidence: 0,
        recommendation: 'ERROR'
      });
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterDiagnose(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    if (ctx.errors.length > 0) {
      result.errors = ctx.errors;
    }

    return result;
  }
}

class NormalizationMiddleware extends DiagnosisMiddleware {
  beforeDiagnose(text, context) {
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      context
    };
  }
}

class MetadataMiddleware extends DiagnosisMiddleware {
  afterDiagnose(result, context) {
    result.metadata = new DiagnosisMetadata();
    result.metadata.version = '2.0';
    return result;
  }
}

// ==================== 配置 ====================

const LEVELS = {
  L0: { name: '执行明确', priority: 0, readiness: 'READY' },
  L1: { name: '需求不清', priority: 1, readiness: 'NEEDS_CLARIFICATION' },
  L2: { name: '范围模糊', priority: 2, readiness: 'NEEDS_CLARIFICATION' },
  L3: { name: '实施模糊', priority: 3, readiness: 'NEEDS_CLARIFICATION' },
  L4: { name: '产品空泛', priority: 4, readiness: 'PARTIALLY_READY' },
  L5: { name: 'UX不全', priority: 5, readiness: 'PARTIALLY_READY' }
};

const DETECTION_SIGNALS = {
  L1: {
    keywords: ['不太清楚', '不知道', '你觉得', '随便', '无所谓', '都可以'],
    patterns: [/\?$/, /不是很确定/i, /大概.*吧/i],
    missing: ['goal', 'purpose']
  },
  L2: {
    keywords: ['等等', '还有', '以及', '还要', '再加', '另外'],
    patterns: [/, ?等等/],
    missing: ['scope', 'boundary', 'limit']
  },
  L3: {
    keywords: ['程序', '代码', '算法', '数据库', '接口', '系统', '分析', '处理', '开发', '设计'],
    patterns: [/怎么做/i, /怎么实现/i, /用什么技术/i, /如何实现/i],
    missing: ['approach', 'method', 'technology']
  },
  L4: {
    keywords: ['app', '应用', '网站', '平台', '产品', '网站', '软件'],
    patterns: [/做个.*(app|应用|网站|产品)/i],
    missing: ['user', 'feature', 'function']
  },
  L5: {
    keywords: ['功能', '登录', '注册', '界面', '按钮', '交互'],
    patterns: [/用户体验/i, /交互/i],
    missing: ['flow', 'error-handling', 'feedback']
  }
};

const CLARIFICATION_QUESTIONS = {
  L1: ['你想解决什么问题？', '这个任务的最终目标是什么？', '谁会使用这个结果？', '如何判断成功？'],
  L2: ['这个任务的核心交付物是什么？', '具体包含哪些部分？', '不包含哪些部分？', '有没有大小/长度/范围限制？'],
  L3: ['有没有参考资料或示例？', '技术栈有偏好吗？', '预期采用什么技术路线？', '有没有现成方案可以参考？'],
  L4: ['目标用户是谁？', '核心功能有哪些？', '与现有产品的差异是什么？', '期望的交付形式是什么？'],
  L5: ['用户的操作流程是什么？', '异常/错误情况如何处理？', '需要哪些反馈提示？', '有无权限/状态管理需求？']
};

// ==================== 缓存 ====================

class DiagnosisCache {
  constructor(ttlSeconds = 300) {
    this._cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  _makeKey(text) {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return hash;
  }

  get(text) {
    const key = this._makeKey(text);
    const entry = this._cache.get(key);
    
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      entry.result.metadata = new DiagnosisMetadata();
      entry.result.metadata.cacheHit = true;
      return entry.result;
    }
    
    this._cache.delete(key);
    return null;
  }

  set(text, result) {
    const key = this._makeKey(text);
    this._cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // 限制缓存大小
    if (this._cache.size > 100) {
      const oldest = [...this._cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this._cache.delete(oldest[0]);
    }
  }

  clear() {
    this._cache.clear();
  }
}

// ==================== 诊断器 ====================

class Diagnostician {
  constructor(options = {}) {
    this.pipeline = new DiagnosisPipeline();
    this.pipeline.use(new NormalizationMiddleware());
    this.pipeline.use(new MetadataMiddleware());
    
    this.cache = options.cache !== false ? new DiagnosisCache() : null;
    this.options = options;
  }

  diagnose(taskDescription) {
    // 缓存检查
    if (this.cache) {
      const cached = this.cache.get(taskDescription);
      if (cached) return cached;
    }

    // 使用管道执行诊断
    const result = this.pipeline.execute(
      taskDescription,
      {},
      (text) => this._doDiagnose(text)
    );

    // 缓存结果
    if (this.cache && result.confidence > 0) {
      this.cache.set(taskDescription, result);
    }

    // 触发事件
    emitter.emit(EVENTS.DIAGNOSIS_COMPLETE, result);
    if (result.recommendation === 'PROCEED') {
      emitter.emit(EVENTS.READY_TO_PROCEED, result);
    } else {
      emitter.emit(EVENTS.NEEDS_CLARIFICATION, result);
    }

    return result;
  }

  _doDiagnose(text) {
    const signals = this._detectSignals(text);
    const levels = this._calculateLevelScores(signals);
    const primaryLevel = this._selectPrimaryLevel(levels, signals);
    const confidence = this._calculateConfidence(primaryLevel, signals);
    const questions = CLARIFICATION_QUESTIONS[primaryLevel] || [];
    const readiness = LEVELS[primaryLevel].readiness;

    const diagnosis = new DiagnosisResult(primaryLevel, {
      levelName: LEVELS[primaryLevel].name,
      description: this._getLevelDescription(primaryLevel),
      confidence,
      detectedSignals: signals[primaryLevel] || [],
      clarifyingQuestions: questions.slice(0, 3),
      recommendation: this._getRecommendation(readiness)
    });

    return diagnosis;
  }

  _detectSignals(text) {
    const signals = {};
    const textLower = text.toLowerCase();

    for (const [level, config] of Object.entries(DETECTION_SIGNALS)) {
      if (level === 'L0') continue;

      const detected = [];

      for (const keyword of config.keywords) {
        if (text.includes(keyword)) {
          detected.push(`包含关键词: "${keyword}"`);
        }
      }

      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          detected.push(`匹配模式: ${pattern}`);
        }
      }

      const explicitSignals = detected.filter(d => d.startsWith('包含关键词') || d.startsWith('匹配模式'));
      if (explicitSignals.length > 0) {
        signals[level] = explicitSignals;
      }
    }

    return signals;
  }

  _calculateLevelScores(signals) {
    const scores = {};

    for (const [level, detected] of Object.entries(signals)) {
      const baseScore = LEVELS[level].priority === 0 ? 0.9 : 0.5;
      const signalBonus = Math.min(detected.length * 0.1, 0.4);
      scores[level] = baseScore + signalBonus;
    }

    if (Object.keys(scores).length === 0) {
      scores['L0'] = 0.95;
    }

    return scores;
  }

  _selectPrimaryLevel(scores, signals) {
    let primary = null;
    let bestScore = 0;

    for (const [level, score] of Object.entries(scores)) {
      if (score < 0.6) continue;

      if (primary === null) {
        primary = level;
        bestScore = score;
      } else {
        const levelPriority = LEVELS[level].priority;
        const primaryPriority = LEVELS[primary].priority;

        if (levelPriority < primaryPriority) {
          primary = level;
          bestScore = score;
        } else if (levelPriority === primaryPriority && score > bestScore) {
          primary = level;
          bestScore = score;
        }
      }
    }

    return primary || 'L0';
  }

  _calculateConfidence(level, signals) {
    const baseConfidence = {
      'L0': 0.90, 'L1': 0.80, 'L2': 0.75,
      'L3': 0.70, 'L4': 0.70, 'L5': 0.65
    };

    let confidence = baseConfidence[level] || 0.7;
    const levelSignals = signals[level] || [];

    if (levelSignals.length >= 3) confidence += 0.1;
    else if (levelSignals.length >= 2) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  _getLevelDescription(level) {
    const descriptions = {
      'L0': '问题描述清晰，可以直接执行',
      'L1': '需求不够清晰，需要进一步澄清目标',
      'L2': '任务范围不够明确，需要界定边界',
      'L3': '实现路径不清晰，需要提供方向或参考',
      'L4': '产品形态不够具体，需要明确用户和功能',
      'L5': '用户体验考虑不完整，需要补充交互细节'
    };
    return descriptions[level] || '未知层级';
  }

  _getRecommendation(readiness) {
    const recommendations = {
      'READY': 'PROCEED',
      'NEEDS_CLARIFICATION': 'MUST_CLARIFY',
      'PARTIALLY_READY': 'CLARIFY_AND_PROCEED'
    };
    return recommendations[readiness] || 'MUST_CLARIFY';
  }
}

// 默认诊断器实例
const defaultDiagnostician = new Diagnostician();

/**
 * 主诊断函数
 */
async function diagnose(taskDescription) {
  return defaultDiagnostician.diagnose(taskDescription);
}

/**
 * 生成诊断报告
 */
function generateReport(diagnosisResult) {
  const result = diagnosisResult;

  if (result.recommendation === 'PROCEED') {
    return `✅ **诊断通过**

**问题层级：** ${result.level} - ${result.levelName}
**任务就绪：** 是
**置信度：** ${(result.confidence * 100).toFixed(0)}%

---

开始任务分类...`;
  }

  const signalsText = result.detectedSignals.length > 0
    ? result.detectedSignals.map(s => `- ${s}`).join('\n')
    : '- 无明显信号';

  const questionsText = result.clarifyingQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  return `📋 **瓶颈诊断结果**

**当前瓶颈层级：** ${result.level} - ${result.levelName}
**置信度：** ${(result.confidence * 100).toFixed(0)}%

**检测到的信号：**
${signalsText}

**需要澄清的问题：**
${questionsText}

**建议：** ${result.recommendation === 'MUST_CLARIFY' ? '先明确问题，再继续执行' : '处理清晰部分，明确模糊部分'}

---

请回答以上澄清问题，我将为您继续服务。`;
}

// 导出
module.exports = {
  diagnose,
  generateReport,
  Diagnostician,
  DiagnosisResult,
  DiagnosisCache,
  DiagnosisPipeline,
  emitter,
  EVENTS,
  LEVELS,
  DETECTION_SIGNALS,
  CLARIFICATION_QUESTIONS
};
