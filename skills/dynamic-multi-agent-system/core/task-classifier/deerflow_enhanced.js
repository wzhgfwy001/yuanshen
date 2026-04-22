/**
 * DeerFlow增强版任务分类器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 任务类型识别
 * 2. 复杂度评估
 * 3. 技能需求匹配
 * 4. 优先级判定
 */

const { EventEmitter } = require('events');

// ============== 常量定义 ==============
const TASK_TYPES = {
  GENERAL: 'general',
  CODING: 'coding',
  WRITING: 'writing',
  RESEARCH: 'research',
  ANALYSIS: 'analysis',
  CREATIVE: 'creative',
  QUESTION: 'question',
  CONVERSATION: 'conversation',
  DATA_PROCESSING: 'data_processing',
  AUTOMATION: 'automation'
};

const COMPLEXITY_LEVELS = {
  LOW: { level: 'low', score: 0.2, description: '简单任务' },
  MEDIUM: { level: 'medium', score: 0.5, description: '中等任务' },
  HIGH: { level: 'high', score: 0.75, description: '复杂任务' },
  VERY_HIGH: { level: 'very_high', score: 0.9, description: '非常复杂' }
};

const PRIORITY_LEVELS = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5
};

// ============== TaskProfile 类 ==============
class TaskProfile {
  constructor(classification) {
    this.type = classification.type;
    this.subtypes = classification.subtypes || [];
    this.complexity = classification.complexity;
    this.priority = classification.priority;
    this.requiredSkills = classification.requiredSkills || [];
    this.estimatedTokens = classification.estimatedTokens || 0;
    this.estimatedDuration = classification.estimatedDuration || 0;
    this.context = classification.context || {};
    this.confidence = classification.confidence || 0.5;
    this.suggestedAgents = classification.suggestedAgents || [];
    this.metadata = classification.metadata || {};
  }
}

// ============== TaskClassifier 主类 ==============
class TaskClassifier extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      enableAutoClassification: config.enableAutoClassification !== false,
      complexityThreshold: config.complexityThreshold || 0.6,
      confidenceThreshold: config.confidenceThreshold || 0.5,
      ...config
    };
    
    this.typePatterns = this._buildTypePatterns();
    this.skillKeywords = this._buildSkillKeywords();
  }

  /**
   * 分类任务
   */
  classify(taskInput, context = {}) {
    const text = this._extractText(taskInput);
    const type = this._classifyType(text, context);
    const complexity = this._assessComplexity(text, type, context);
    const priority = this._determinePriority(type, complexity, context);
    const requiredSkills = this._identifyRequiredSkills(text, type);
    const estimatedTokens = this._estimateTokens(text);
    const estimatedDuration = this._estimateDuration(type, complexity);
    const confidence = this._calculateConfidence(text, type);
    const suggestedAgents = this._suggestAgents(type, requiredSkills);

    const classification = {
      type,
      subtypes: this._identifySubtypes(text, type),
      complexity,
      priority,
      requiredSkills,
      estimatedTokens,
      estimatedDuration,
      confidence,
      suggestedAgents,
      context,
      metadata: {
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        classifiedAt: new Date().toISOString()
      }
    };

    const profile = new TaskProfile(classification);
    
    this.emit('task_classified', profile);
    
    return profile;
  }

  /**
   * 批量分类
   */
  classifyBatch(tasks) {
    return tasks.map(task => this.classify(task.input || task, task.context || {}));
  }

  // ============== 私有方法 ==============

  _extractText(taskInput) {
    if (typeof taskInput === 'string') {
      return taskInput;
    }
    if (taskInput.text) {
      return taskInput.text;
    }
    if (taskInput.prompt) {
      return taskInput.prompt;
    }
    if (taskInput.description) {
      return taskInput.description;
    }
    return String(taskInput);
  }

  _classifyType(text, context) {
    const lowerText = text.toLowerCase();
    
    // 代码相关
    if (this._matchesPatterns(lowerText, [
      /code|编程|程序|函数|class|def |import |export |=>|{}/
    ])) {
      return TASK_TYPES.CODING;
    }
    
    // 写作相关
    if (this._matchesPatterns(lowerText, [
      /写|文章|报告|文档|小说|story|write|article|blog/
    ])) {
      return TASK_TYPES.WRITING;
    }
    
    // 研究相关
    if (this._matchesPatterns(lowerText, [
      /研究|调研|调查|research|survey|study|analyze|分析/
    ])) {
      return TASK_TYPES.RESEARCH;
    }
    
    // 分析相关
    if (this._matchesPatterns(lowerText, [
      /分析|对比|评估|compare|evaluate|assess|review|分析/
    ])) {
      return TASK_TYPES.ANALYSIS;
    }
    
    // 创意相关
    if (this._matchesPatterns(lowerText, [
      /创意|想象|设计|creative|imagine|design|发明|invent/
    ])) {
      return TASK_TYPES.CREATIVE;
    }
    
    // 问答相关
    if (this._matchesPatterns(lowerText, [
      /什么是|如何|怎么|what is|how to|why|为什么|怎么办/
    ])) {
      return TASK_TYPES.QUESTION;
    }
    
    // 数据处理
    if (this._matchesPatterns(lowerText, [
      /数据|处理|清洗|统计|转换|data|process|transform|clean/
    ])) {
      return TASK_TYPES.DATA_PROCESSING;
    }
    
    // 自动化
    if (this._matchesPatterns(lowerText, [
      /自动|批量|脚本|automation|script|batch|批量处理/
    ])) {
      return TASK_TYPES.AUTOMATION;
    }
    
    // 对话
    if (this._matchesPatterns(lowerText, [
      /聊天|对话|告诉|解释|talk|chat|explain|对话/
    ])) {
      return TASK_TYPES.CONVERSATION;
    }
    
    return TASK_TYPES.GENERAL;
  }

  _identifySubtypes(text, mainType) {
    const subtypes = [];
    const lowerText = text.toLowerCase();
    
    switch (mainType) {
      case TASK_TYPES.CODING:
        if (/debug|bug|修复/.test(lowerText)) subtypes.push('debugging');
        if (/test|测试/.test(lowerText)) subtypes.push('testing');
        if (/refactor|重构/.test(lowerText)) subtypes.push('refactoring');
        if (/api|接口/.test(lowerText)) subtypes.push('api_development');
        break;
        
      case TASK_TYPES.WRITING:
        if (/技术|文档|technical|docs/.test(lowerText)) subtypes.push('technical_writing');
        if (/创意|小说|fiction|novel/.test(lowerText)) subtypes.push('creative_writing');
        if (/营销|推广|marketing/.test(lowerText)) subtypes.push('copywriting');
        break;
        
      case TASK_TYPES.RESEARCH:
        if (/市场|market/.test(lowerText)) subtypes.push('market_research');
        if (/学术|academic|paper/.test(lowerText)) subtypes.push('academic_research');
        break;
    }
    
    return subtypes;
  }

  _assessComplexity(text, type, context) {
    let score = 0.3; // 基础分数
    
    // 文本长度因素
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 1000) score += 0.2;
    else if (wordCount > 500) score += 0.1;
    else if (wordCount < 50) score -= 0.1;
    
    // 类型复杂度
    switch (type) {
      case TASK_TYPES.CODING:
        if (/multiple|多个|复杂|complex/.test(text.toLowerCase())) score += 0.3;
        if (/simple|简单/.test(text.toLowerCase())) score -= 0.2;
        break;
      case TASK_TYPES.RESEARCH:
      case TASK_TYPES.ANALYSIS:
        score += 0.2;
        break;
      case TASK_TYPES.CREATIVE:
        score += 0.15;
        break;
    }
    
    // 上下文因素
    if (context.historyLength > 10) score += 0.1;
    if (context.multiStep) score += 0.15;
    
    // 边界处理
    score = Math.max(0.1, Math.min(1.0, score));
    
    if (score >= 0.8) return COMPLEXITY_LEVELS.VERY_HIGH;
    if (score >= 0.6) return COMPLEXITY_LEVELS.HIGH;
    if (score >= 0.4) return COMPLEXITY_LEVELS.MEDIUM;
    return COMPLEXITY_LEVELS.LOW;
  }

  _determinePriority(type, complexity, context) {
    let priority = PRIORITY_LEVELS.NORMAL;
    
    // 类型优先级
    switch (type) {
      case TASK_TYPES.AUTOMATION:
      case TASK_TYPES.DATA_PROCESSING:
        priority = PRIORITY_LEVELS.LOW;
        break;
      case TASK_TYPES.QUESTION:
      case TASK_TYPES.CONVERSATION:
        priority = PRIORITY_LEVELS.NORMAL;
        break;
      case TASK_TYPES.CODING:
      case TASK_TYPES.WRITING:
        priority = PRIORITY_LEVELS.HIGH;
        break;
    }
    
    // 复杂度调整
    if (complexity.level === 'very_high') {
      priority = Math.min(PRIORITY_LEVELS.CRITICAL, priority + 1);
    }
    
    // 上下文调整
    if (context.urgent) priority = PRIORITY_LEVELS.URGENT;
    if (context.deadline) priority = Math.min(PRIORITY_LEVELS.CRITICAL, priority + 1);
    
    return priority;
  }

  _identifyRequiredSkills(text, type) {
    const skills = [];
    const lowerText = text.toLowerCase();
    
    // 通用技能
    skills.push('general-purpose');
    
    // 根据关键词添加技能
    const skillMap = {
      'javascript': ['js', 'web'],
      'python': ['data-science', 'ml'],
      'react': ['frontend', 'web'],
      'database': ['db', 'sql'],
      'api': ['backend', 'integration'],
      'machine learning': ['ml', 'ai'],
      'data analysis': ['analytics', 'visualization'],
      '写作': ['writing', 'content'],
      '代码': ['coding', 'programming']
    };
    
    for (const [keyword, skillList] of Object.entries(skillMap)) {
      if (lowerText.includes(keyword)) {
        skills.push(...skillList);
      }
    }
    
    // 根据类型添加默认技能
    switch (type) {
      case TASK_TYPES.CODING:
        skills.push('coder');
        break;
      case TASK_TYPES.WRITING:
        skills.push('writer');
        break;
      case TASK_TYPES.RESEARCH:
        skills.push('researcher');
        break;
      case TASK_TYPES.ANALYSIS:
        skills.push('analyst');
        break;
    }
    
    return [...new Set(skills)]; // 去重
  }

  _estimateTokens(text) {
    // 简单估算: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  _estimateDuration(type, complexity) {
    // 基础时长 (毫秒)
    const baseDuration = {
      [TASK_TYPES.GENERAL]: 30000,
      [TASK_TYPES.QUESTION]: 10000,
      [TASK_TYPES.CONVERSATION]: 20000,
      [TASK_TYPES.WRITING]: 60000,
      [TASK_TYPES.CODING]: 120000,
      [TASK_TYPES.RESEARCH]: 180000,
      [TASK_TYPES.ANALYSIS]: 120000,
      [TASK_TYPES.CREATIVE]: 90000,
      [TASK_TYPES.DATA_PROCESSING]: 60000,
      [TASK_TYPES.AUTOMATION]: 150000
    };
    
    const base = baseDuration[type] || 60000;
    const multiplier = complexity.score;
    
    return Math.round(base * multiplier);
  }

  _calculateConfidence(text, type) {
    let confidence = 0.5;
    
    // 关键词匹配度
    const keywordMatches = this._countKeywordMatches(text, type);
    confidence += keywordMatches * 0.1;
    
    // 文本长度
    if (text.length > 100 && text.length < 5000) {
      confidence += 0.2;
    }
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  _suggestAgents(type, skills) {
    const agents = [];
    
    // 基于类型选择Agent
    switch (type) {
      case TASK_TYPES.CODING:
        agents.push('coder', 'debugger');
        break;
      case TASK_TYPES.WRITING:
        agents.push('writer', 'editor');
        break;
      case TASK_TYPES.RESEARCH:
        agents.push('researcher', 'analyst');
        break;
      case TASK_TYPES.ANALYSIS:
        agents.push('analyst', 'data-expert');
        break;
      case TASK_TYPES.CREATIVE:
        agents.push('creative-writer', 'brainstormer');
        break;
      default:
        agents.push('general-purpose');
    }
    
    return [...new Set([...agents, ...skills])];
  }

  _countKeywordMatches(text, type) {
    const typeKeywords = this.typePatterns[type] || [];
    let count = 0;
    
    for (const pattern of typeKeywords) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        count++;
      }
    }
    
    return count;
  }

  _matchesPatterns(text, patterns) {
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (text.includes(pattern)) return true;
      } else if (pattern instanceof RegExp) {
        if (pattern.test(text)) return true;
      }
    }
    return false;
  }

  _buildTypePatterns() {
    return {
      [TASK_TYPES.CODING]: ['code', 'programming', 'function', 'debug', 'api', 'algorithm'],
      [TASK_TYPES.WRITING]: ['write', 'article', 'blog', 'report', 'documentation'],
      [TASK_TYPES.RESEARCH]: ['research', 'survey', 'investigate', 'study', 'analyze'],
      [TASK_TYPES.ANALYSIS]: ['analyze', 'evaluate', 'compare', 'assess', 'review'],
      [TASK_TYPES.CREATIVE]: ['creative', 'imagine', 'design', 'innovate', 'brainstorm'],
      [TASK_TYPES.QUESTION]: ['what', 'how', 'why', 'explain', 'define'],
      [TASK_TYPES.CONVERSATION]: ['chat', 'talk', 'discuss', 'tell me about'],
      [TASK_TYPES.DATA_PROCESSING]: ['data', 'process', 'transform', 'clean', 'extract'],
      [TASK_TYPES.AUTOMATION]: ['automate', 'batch', 'script', 'schedule', 'workflow']
    };
  }

  _buildSkillKeywords() {
    return {
      'js': ['javascript', 'node', 'react', 'vue'],
      'python': ['python', 'django', 'flask', 'data'],
      'web': ['html', 'css', 'frontend', 'website'],
      'backend': ['api', 'server', 'database', 'sql'],
      'ml': ['machine learning', 'ai', 'tensorflow', 'pytorch'],
      'data-science': ['pandas', 'numpy', 'visualization'],
      'writing': ['writing', 'content', 'copy'],
      'research': ['research', 'survey', 'investigation']
    };
  }
}

// ============== 导出 ==============
module.exports = {
  TaskClassifier,
  TaskProfile,
  TASK_TYPES,
  COMPLEXITY_LEVELS,
  PRIORITY_LEVELS
};
