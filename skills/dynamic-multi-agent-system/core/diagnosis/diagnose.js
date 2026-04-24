/**
 * 瓶颈诊断器 - 核心诊断逻辑
 * 
 * 借鉴 Startup Coach Workshop 理念
 * "一次解决一个主要瓶颈"
 */

const LEVELS = {
  L0: { name: '执行明确', priority: 0, readiness: 'READY' },
  L1: { name: '需求不清', priority: 1, readiness: 'NEEDS_CLARIFICATION' },
  L2: { name: '范围模糊', priority: 2, readiness: 'NEEDS_CLARIFICATION' },
  L3: { name: '实施模糊', priority: 3, readiness: 'NEEDS_CLARIFICATION' },
  L4: { name: '产品空泛', priority: 4, readiness: 'PARTIALLY_READY' },
  L5: { name: 'UX不全', priority: 5, readiness: 'PARTIALLY_READY' }
};

// 检测信号配置
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

// 澄清问题模板
const CLARIFICATION_QUESTIONS = {
  L1: [
    '你想解决什么问题？',
    '这个任务的最终目标是什么？',
    '谁会使用这个结果？',
    '如何判断成功？'
  ],
  L2: [
    '这个任务的核心交付物是什么？',
    '具体包含哪些部分？',
    '不包含哪些部分？',
    '有没有大小/长度/范围限制？'
  ],
  L3: [
    '有没有参考资料或示例？',
    '技术栈有偏好吗？',
    '预期采用什么技术路线？',
    '有没有现成方案可以参考？'
  ],
  L4: [
    '目标用户是谁？',
    '核心功能有哪些？',
    '与现有产品的差异是什么？',
    '期望的交付形式是什么？'
  ],
  L5: [
    '用户的操作流程是什么？',
    '异常/错误情况如何处理？',
    '需要哪些反馈提示？',
    '有无权限/状态管理需求？'
  ]
};

/**
 * 主诊断函数
 * @param {string} taskDescription - 用户任务描述
 * @returns {Object} 诊断结果
 */
async function diagnose(taskDescription) {
  const signals = detectSignals(taskDescription);
  const levels = calculateLevelScores(taskDescription, signals);
  const primaryLevel = selectPrimaryLevel(levels);
  const confidence = calculateConfidence(primaryLevel, signals);
  const questions = CLARIFICATION_QUESTIONS[primaryLevel] || [];
  const readiness = LEVELS[primaryLevel].readiness;
  
  return {
    diagnosis: {
      currentLevel: primaryLevel,
      levelName: LEVELS[primaryLevel].name,
      description: getLevelDescription(primaryLevel),
      confidence: confidence,
      detectedSignals: signals[primaryLevel] || [],
      clarifyingQuestions: questions.slice(0, 3),
      recommendation: getRecommendation(readiness)
    },
    taskReadiness: readiness,
    blockingIssue: readiness === 'READY' ? null : `${primaryLevel.toLowerCase()}-${LEVELS[primaryLevel].name}`,
    allLevelScores: levels
  };
}

/**
 * 检测信号
 * @param {string} text 
 * @returns {Object} 各层级检测到的信号
 */
function detectSignals(text) {
  const signals = {};
  const textLower = text.toLowerCase();
  
  for (const [level, config] of Object.entries(DETECTION_SIGNALS)) {
    const detected = [];
    
    // 跳过L0的信号检测（L0是明确的，不应有信号）
    if (level === 'L0') continue;
    
    // 关键词检测
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        detected.push(`包含关键词: "${keyword}"`);
      }
    }
    
    // 模式匹配
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        detected.push(`匹配模式: ${pattern}`);
      }
    }
    
    // 缺失检测 (反向) - 只对明确的英文概念词汇检测
    // 对于中文文本，主要依赖关键词检测，缺失检测作为辅助
    for (const item of config.missing) {
      // 只有当文本很短或确实缺少关键中文概念词时才触发
      const chineseConcepts = {
        'goal': ['目标', '目的', '想要', '解决'],
        'purpose': ['目的', '原因', '为什么'],
        'scope': ['范围', '包含', '包括', '内容'],
        'boundary': ['边界', '界限', '不包括', '除了'],
        'limit': ['限制', '最多', '最少', '不超过'],
        'approach': ['方法', '怎么', '如何', '方案'],
        'method': ['方法', '怎么做', '如何实现'],
        'technology': ['技术', '用什么', '技术栈'],
        'user': ['用户', '谁用', '给谁'],
        'feature': ['功能', '做什么', '能做什么'],
        'function': ['功能', '作用', '用途'],
        'flow': ['流程', '步骤', '顺序'],
        'error-handling': ['错误', '异常', '失败', '边界条件'],
        'feedback': ['反馈', '提示', '提示信息']
      };
      
      // 检查是否有对应的中文概念
      const chineseTerms = chineseConcepts[item] || [];
      const hasChineseConcept = chineseTerms.some(term => textLower.includes(term));
      
      // 如果文本很短且缺少关键概念，或者明确缺少某些中文词汇
      if ((text.length < 20 && !hasChineseConcept) || 
          (chineseTerms.length > 0 && !hasChineseConcept && detected.length > 0)) {
        // 只有在已经有其他信号时才报告缺失
        detected.push(`缺少: ${item}`);
      }
    }
    
    // 只有当有明确的信号（关键词或模式匹配）时才记录
    // 缺失检测作为辅助，不单独作为信号源
    const explicitSignals = detected.filter(d => d.startsWith('包含关键词') || d.startsWith('匹配模式'));
    if (explicitSignals.length > 0) {
      signals[level] = explicitSignals;
    }
    // 不再仅凭缺失检测就判定层级
  }
  
  return signals;
}

/**
 * 计算各层级得分
 * @param {string} text 
 * @param {Object} signals 
 * @returns {Object} 各层级得分
 */
function calculateLevelScores(text, signals) {
  const scores = {};
  
  for (const [level, detected] of Object.entries(signals)) {
    // 基础分 + 信号加分
    const baseScore = LEVELS[level].priority === 0 ? 0.9 : 0.5;
    const signalBonus = Math.min(detected.length * 0.1, 0.4);
    scores[level] = baseScore + signalBonus;
  }
  
  // 如果没有任何信号，默认L0
  if (Object.keys(scores).length === 0) {
    scores['L0'] = 0.95;
  }
  
  return scores;
}

/**
 * 选择主要层级
 * @param {Object} scores 
 * @returns {string} 主要层级
 */
function selectPrimaryLevel(scores) {
  // 找出得分最高的有效层级
  // 优先级规则：数字越小优先级越高，但必须有足够的信号支撑
  // 如果某层级得分低于0.6，说明信号不足，不应被选中
  
  let primary = null;
  let bestScore = 0;
  
  for (const [level, score] of Object.entries(scores)) {
    // 过滤掉信号不足的层级（得分 < 0.6）
    if (score < 0.6) continue;
    
    // 优先级高（数字小）的层级优先
    if (primary === null) {
      primary = level;
      bestScore = score;
    } else {
      const levelPriority = LEVELS[level].priority;
      const primaryPriority = LEVELS[primary].priority;
      
      if (levelPriority < primaryPriority) {
        // 更高优先级的层级
        primary = level;
        bestScore = score;
      } else if (levelPriority === primaryPriority && score > bestScore) {
        // 同优先级，选择得分更高的
        primary = level;
        bestScore = score;
      }
    }
  }
  
  // 如果没有有效层级，选择L0（默认执行明确）
  return primary || 'L0';
}

/**
 * 计算置信度
 * @param {string} level 
 * @param {Object} signals 
 * @returns {number}
 */
function calculateConfidence(level, signals) {
  const baseConfidence = {
    'L0': 0.90,
    'L1': 0.80,
    'L2': 0.75,
    'L3': 0.70,
    'L4': 0.70,
    'L5': 0.65
  };
  
  let confidence = baseConfidence[level] || 0.7;
  const levelSignals = signals[level] || [];
  
  // 信号越多置信度越高
  if (levelSignals.length >= 3) {
    confidence += 0.1;
  } else if (levelSignals.length >= 2) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 0.95);
}

/**
 * 获取层级描述
 * @param {string} level 
 * @returns {string}
 */
function getLevelDescription(level) {
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

/**
 * 获取建议
 * @param {string} readiness 
 * @returns {string}
 */
function getRecommendation(readiness) {
  const recommendations = {
    'READY': 'PROCEED',
    'NEEDS_CLARIFICATION': 'MUST_CLARIFY',
    'PARTIALLY_READY': 'CLARIFY_AND_PROCEED'
  };
  return recommendations[readiness] || 'MUST_CLARIFY';
}

/**
 * 生成诊断报告（用于输出）
 * @param {Object} diagnosisResult 
 * @returns {string} 格式化报告
 */
function generateReport(diagnosisResult) {
  const { diagnosis, taskReadiness } = diagnosisResult;
  
  if (taskReadiness === 'READY') {
    return `✅ **诊断通过**

**问题层级：** ${diagnosis.currentLevel} - ${diagnosis.levelName}
**任务就绪：** 是
**置信度：** ${(diagnosis.confidence * 100).toFixed(0)}%

---

开始任务分类...`;
  }
  
  const signalsText = diagnosis.detectedSignals.length > 0
    ? diagnosis.detectedSignals.map(s => `- ${s}`).join('\n')
    : '- 无明显信号';
  
  const questionsText = diagnosis.clarifyingQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');
  
  return `📋 **瓶颈诊断结果**

**当前瓶颈层级：** ${diagnosis.currentLevel} - ${diagnosis.levelName}
**置信度：** ${(diagnosis.confidence * 100).toFixed(0)}%

**检测到的信号：**
${signalsText}

**需要澄清的问题：**
${questionsText}

**建议：** ${diagnosis.recommendation === 'MUST_CLARIFY' ? '先明确问题，再继续执行' : '处理清晰部分，明确模糊部分'}

---

请回答以上澄清问题，我将为您继续服务。`;
}

// 导出
module.exports = {
  diagnose,
  generateReport,
  LEVELS,
  DETECTION_SIGNALS,
  CLARIFICATION_QUESTIONS
};
