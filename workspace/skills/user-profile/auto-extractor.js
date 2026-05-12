/**
 * User Profile Auto-Extractor
 * 从对话历史中自动提取用户画像
 * 
 * 版本: v1.0.0
 * 更新时间: 2026-04-17
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  confidenceThreshold: 0.6,
  maxSourceMessages: 3,
  stateFile: path.join(process.cwd(), 'state', 'user-profile.json'),
  patternsFile: path.join(__dirname, 'extraction-patterns.json')
};

// 提取规则定义
const EXTRACTION_RULES = {
  communication_style: {
    patterns: [
      { regex: /(详细|展开|具体)/gi, style: '详细展开', weight: 0.8 },
      { regex: /(简洁|简短|扼要|一句话)/gi, style: '简洁回复', weight: 0.8 },
      { regex: /(分步|步骤|第一步|第二步|逐步)/gi, style: '分步说明', weight: 0.7 },
      { regex: /(直接给|给我|答案|结果)/gi, style: '直接给答案', weight: 0.6 }
    ],
    default: '未知'
  },
  
  preferred_language: {
    keywords: {
      '中文': ['中文', '汉语', '中文说'],
      '英文': ['英文', '英语', '用English']
    },
    default: '中文'
  },
  
  tech_familiarity: {
    expert_indicators: [
      'API', 'SDK', '架构', '源码', '算法', '数据结构',
      '异步', '并发', '多线程', '设计模式', '重构'
    ],
    novice_indicators: [
      '什么是', '怎么用', '入门', '基础', '小白',
      '不太懂', '不太会', '新手', '萌新'
    ],
    levels: {
      expert: { min: 5, label: '技术专家' },
      familiar: { min: 2, label: '技术熟悉' },
      general: { min: 0, label: '技术一般' },
      novice: { min: 3, label: '技术小白' }
    }
  },
  
  decision_style: {
    deliberate_indicators: [
      '对比', '比较', '优缺点', '利弊', '哪个好',
      '权衡', '考虑', '想想', '分析一下'
    ],
    quick_indicators: [
      '直接', '赶紧', '快点', '马上', '立刻',
      '就这样', '行', '可以', '决定了'
    ],
    styles: ['深思熟虑+多方案对比', '快速决策', '谨慎验证', '数据驱动', '混合型']
  },
  
  work_type: {
    keywords: {
      '技术开发': ['代码', '开发', '编程', '写代码', '程序员', '全栈', '前端', '后端'],
      '产品设计': ['产品', '需求', '功能', '设计', 'UI', 'UE', '原型'],
      '数据分析': ['分析', '数据', '报表', '统计', '可视化'],
      '市场运营': ['运营', '推广', '营销', '增长', '用户'],
      '管理': ['管理', '团队', '项目', '协调', '安排']
    }
  },
  
  active_hours: {
    // 通过消息时间戳分析
  },
  
  feedback_style: {
    perfectionist_indicators: [
      '不对', '不对不对', '错了', '改', '修改',
      '重写', '再来', '不满意', '不够好'
    ],
    accommodating_indicators: [
      '可以', '行', '好', '不错', '挺好', '就这样'
    ]
  }
};

/**
 * 主提取函数
 * @param {Array} messages - 对话消息数组
 * @param {string} userId - 用户ID
 * @returns {Object} 提取结果
 */
function extract(messages, userId = 'unknown') {
  const startTime = Date.now();
  
  // 初始化结果结构
  const result = {
    user_id: userId,
    extracted_at: new Date().toISOString(),
    confidence_threshold: CONFIG.confidenceThreshold,
    patterns_detected: [],
    preferences: {
      communication_style: { primary: '未知', secondary: '未知', evidence_count: 0 },
      preferred_language: '中文',
      active_hours: { typical: '未知', timezone: 'Asia/Shanghai', days_of_week: [] },
      tech_familiarity: { level: '未知', tech_topics: [], indicators: [] },
      work_type: { category: '未知', detail: '', industry: '' },
      decision_style: { primary: '未知', options_need: 2, confidence_indicator: '中', evidence: [] },
      feedback_style: { style: '未知', evidence: [] },
      long_term_goals: { goals: [], priority_order: [] },
      ui_preference: '未知',
      response_format: '未知'
    },
    meta: {
      extraction_version: '1.0.0',
      model_used: 'rule-based',
      messages_analyzed: messages.length,
      extraction_duration_ms: 0,
      warnings: []
    }
  };
  
  if (!messages || messages.length === 0) {
    result.meta.warnings.push('没有消息可分析');
    return result;
  }
  
  // 执行各项提取
  const patternResults = [];
  
  patternResults.push(...extractCommunicationStyle(messages));
  patternResults.push(...extractPreferredLanguage(messages, result.preferences));
  patternResults.push(...extractTechFamiliarity(messages, result.preferences));
  patternResults.push(...extractWorkType(messages, result.preferences));
  patternResults.push(...extractDecisionStyle(messages, result.preferences));
  patternResults.push(...extractFeedbackStyle(messages, result.preferences));
  patternResults.push(...extractLongTermGoals(messages, result.preferences));
  patternResults.push(...extractActiveHours(messages, result.preferences));
  
  // 过滤低置信度模式
  result.patterns_detected = patternResults.filter(p => p.confidence >= CONFIG.confidenceThreshold);
  
  // 填充meta
  result.meta.extraction_duration_ms = Date.now() - startTime;
  
  if (result.patterns_detected.length === 0) {
    result.meta.warnings.push('未检测到足够置信度的模式');
  }
  
  return result;
}

/**
 * 提取沟通风格
 */
function extractCommunicationStyle(messages) {
  const counts = {
    '详细展开': 0,
    '简洁回复': 0,
    '分步说明': 0,
    '直接给答案': 0
  };
  
  const sourceMessages = [];
  
  messages.forEach((msg, idx) => {
    const content = msg.content || msg.text || '';
    
    Object.entries(EXTRACTION_RULES.communication_style.patterns).forEach(([patternKey, rule]) => {
      const matches = content.match(rule.regex);
      if (matches) {
        counts[rule.style] += matches.length;
        if (sourceMessages.length < CONFIG.maxSourceMessages && counts[rule.style] === 1) {
          sourceMessages.push({
            message_id: msg.id || `msg_${idx}`,
            content: content.substring(0, 100),
            timestamp: msg.timestamp || msg.time || new Date().toISOString()
          });
        }
      }
    });
  });
  
  // 排序获取主要和次要风格
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  if (sorted[0][1] === 0) return [];
  
  return [{
    pattern: sorted[0][0],
    pattern_key: `comm_style_${sorted[0][0]}`,
    source: `用户消息中出现 ${sorted[0][1]} 次相关表达`,
    source_messages: sourceMessages,
    confidence: Math.min(0.9, 0.5 + sorted[0][1] * 0.1),
    occurrence_count: sorted[0][1],
    first_seen: messages[0]?.timestamp || new Date().toISOString(),
    last_seen: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
    category: 'explicit_preference'
  }];
}

/**
 * 提取语言偏好
 */
function extractPreferredLanguage(messages, preferences) {
  const counts = { '中文': 0, '英文': 0, '中英混合': 0 };
  
  messages.forEach(msg => {
    const content = (msg.content || msg.text || '').toLowerCase();
    
    Object.entries(EXTRACTION_RULES.preferred_language.keywords).forEach(([lang, keywords]) => {
      keywords.forEach(kw => {
        if (content.includes(kw.toLowerCase())) counts[lang]++;
      });
    });
  });
  
  const detected = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (detected[1] > 0) {
    preferences.preferred_language = detected[0];
  }
  
  return [];
}

/**
 * 提取技术熟悉度
 */
function extractTechFamiliarity(messages, preferences) {
  const techData = EXTRACTION_RULES.tech_familiarity;
  let expertScore = 0;
  let noviceScore = 0;
  const indicators = [];
  const techTopics = {};
  
  messages.forEach(msg => {
    const content = msg.content || msg.text || '';
    const lowerContent = content.toLowerCase();
    
    // 检查专家指标
    techData.expert_indicators.forEach(term => {
      if (lowerContent.includes(term.toLowerCase())) {
        expertScore++;
        if (!indicators.includes(`使用专业术语: ${term}`)) {
          indicators.push(`使用专业术语: ${term}`);
        }
      }
    });
    
    // 检查新手指标
    techData.novice_indicators.forEach(term => {
      if (lowerContent.includes(term.toLowerCase())) {
        noviceScore++;
        if (!indicators.includes(`新手表达: ${term}`)) {
          indicators.push(`新手表达: ${term}`);
        }
      }
    });
  });
  
  // 确定级别
  let level = '未知';
  if (expertScore >= techData.levels.expert.min) level = techData.levels.expert.label;
  else if (expertScore >= techData.levels.familiar.min) level = techData.levels.familiar.label;
  else if (noviceScore >= techData.levels.novice.min) level = techData.levels.novice.label;
  else if (expertScore > 0) level = techData.levels.general.label;
  
  preferences.tech_familiarity = {
    level,
    tech_topics: Object.entries(techTopics).map(([topic, prof]) => ({ topic, proficiency: prof })),
    indicators
  };
  
  if (level !== '未知') {
    return [{
      pattern: level,
      pattern_key: `tech_level_${level}`,
      source: `专家指标得分: ${expertScore}, 新手指标得分: ${noviceScore}`,
      confidence: Math.min(0.9, 0.5 + expertScore * 0.05),
      occurrence_count: expertScore + noviceScore,
      first_seen: messages[0]?.timestamp,
      last_seen: messages[messages.length - 1]?.timestamp,
      category: 'skill_level'
    }];
  }
  
  return [];
}

/**
 * 提取工作类型
 */
function extractWorkType(messages, preferences) {
  const workData = EXTRACTION_RULES.work_type;
  const categoryScores = {};
  
  Object.keys(workData.keywords).forEach(cat => categoryScores[cat] = 0);
  
  messages.forEach(msg => {
    const content = (msg.content || msg.text || '').toLowerCase();
    
    Object.entries(workData.keywords).forEach(([category, keywords]) => {
      keywords.forEach(kw => {
        if (content.includes(kw.toLowerCase())) {
          categoryScores[category]++;
        }
      });
    });
  });
  
  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > 0) {
    preferences.work_type.category = sorted[0][0];
    
    return [{
      pattern: sorted[0][0],
      pattern_key: `work_type_${sorted[0][0]}`,
      source: `在消息中出现 ${sorted[0][1]} 次相关关键词`,
      confidence: Math.min(0.85, 0.4 + sorted[0][1] * 0.1),
      occurrence_count: sorted[0][1],
      first_seen: messages[0]?.timestamp,
      last_seen: messages[messages.length - 1]?.timestamp,
      category: 'work_context'
    }];
  }
  
  return [];
}

/**
 * 提取决策风格
 */
function extractDecisionStyle(messages, preferences) {
  const decisionData = EXTRACTION_RULES.decision_style;
  let deliberateCount = 0;
  let quickCount = 0;
  const evidence = [];
  
  messages.forEach(msg => {
    const content = msg.content || msg.text || '';
    
    decisionData.deliberate_indicators.forEach(term => {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        deliberateCount++;
        if (!evidence.includes(`谨慎表达: ${term}`)) {
          evidence.push(`谨慎表达: ${term}`);
        }
      }
    });
    
    decisionData.quick_indicators.forEach(term => {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        quickCount++;
      }
    });
  });
  
  let style = '混合型';
  if (deliberateCount > quickCount * 2) style = '深思熟虑+多方案对比';
  else if (quickCount > deliberateCount * 2) style = '快速决策';
  else if (deliberateCount > 0 || quickCount > 0) style = '混合型';
  
  preferences.decision_style = {
    primary: style,
    options_need: deliberateCount > quickCount ? 3 : 2,
    confidence_indicator: deliberateCount > quickCount ? '高' : '中',
    evidence
  };
  
  if (deliberateCount > 0 || quickCount > 0) {
    return [{
      pattern: style,
      pattern_key: `decision_${style}`,
      source: `谨慎决策指标: ${deliberateCount}, 快速决策指标: ${quickCount}`,
      confidence: Math.min(0.8, 0.4 + Math.max(deliberateCount, quickCount) * 0.1),
      occurrence_count: deliberateCount + quickCount,
      first_seen: messages[0]?.timestamp,
      last_seen: messages[messages.length - 1]?.timestamp,
      category: 'decision_pattern'
    }];
  }
  
  return [];
}

/**
 * 提取反馈风格
 */
function extractFeedbackStyle(messages, preferences) {
  const feedbackData = EXTRACTION_RULES.feedback_style;
  let perfectionistCount = 0;
  let accommodatingCount = 0;
  const evidence = [];
  
  messages.forEach(msg => {
    const content = msg.content || msg.text || '';
    
    feedbackData.perfectionist_indicators.forEach(term => {
      if (content.includes(term)) {
        perfectionistCount++;
        if (!evidence.includes(`追求完美: ${term}`)) {
          evidence.push(`追求完美: ${term}`);
        }
      }
    });
    
    feedbackData.accommodating_indicators.forEach(term => {
      if (content.includes(term)) {
        accommodatingCount++;
      }
    });
  });
  
  let style = perfectionistCount > accommodatingCount ? '完美主义' : 
              accommodatingCount > perfectionistCount ? '随和' : '未知';
  
  preferences.feedback_style = { style, evidence };
  
  return [];
}

/**
 * 提取长期目标
 */
function extractLongTermGoals(messages, preferences) {
  const goalKeywords = [
    { keywords: ['财富自由', '财务自由', '赚大钱', '有钱'], id: 'goal_wealth', goal: '财富自由' },
    { keywords: ['高考', '志愿', '填报'], id: 'goal_gaokao', goal: '高考志愿系统' },
    { keywords: ['商业化', '变现', '产品化', '上线'], id: 'goal_monetize', goal: '商业化变现' },
    { keywords: ['学习', '提升', '成长', '进步'], id: 'goal_study', goal: '自我提升' },
    { keywords: ['健康', '健身', '运动', '减肥'], id: 'goal_health', goal: '健康生活' }
  ];
  
  const goals = [];
  const goalCounts = {};
  
  messages.forEach(msg => {
    const content = msg.content || msg.text || '';
    
    goalKeywords.forEach(g => {
      g.keywords.forEach(kw => {
        if (content.includes(kw)) {
          if (!goalCounts[g.id]) {
            goalCounts[g.id] = { count: 0, firstSeen: msg.timestamp, lastSeen: msg.timestamp };
            goals.push({ id: g.id, goal: g.goal, status: '进行中', mentioned_count: 0 });
          }
          goalCounts[g.id].count++;
          goalCounts[g.id].lastSeen = msg.timestamp;
        }
      });
    });
  });
  
  goals.forEach(g => {
    if (goalCounts[g.id]) {
      g.mentioned_count = goalCounts[g.id].count;
      g.first_mentioned = goalCounts[g.id].firstSeen;
      g.last_mentioned = goalCounts[g.id].lastSeen;
    }
  });
  
  // 按提及次数排序
  goals.sort((a, b) => b.mentioned_count - a.mentioned_count);
  
  preferences.long_term_goals = {
    goals,
    priority_order: goals.map(g => g.id)
  };
  
  return goals.map(g => ({
    pattern: g.goal,
    pattern_key: `goal_${g.id}`,
    source: `用户提到 ${g.mentioned_count} 次`,
    confidence: Math.min(0.95, 0.5 + g.mentioned_count * 0.1),
    occurrence_count: g.mentioned_count,
    first_seen: g.first_mentioned,
    last_seen: g.last_mentioned,
    category: 'goal_expression'
  }));
}

/**
 * 提取活跃时间
 */
function extractActiveHours(messages, preferences) {
  const hourCounts = {};
  const dayCounts = {};
  
  messages.forEach(msg => {
    const timestamp = msg.timestamp || msg.time;
    if (!timestamp) return;
    
    try {
      const date = new Date(timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    } catch (e) {
      // 忽略无效时间戳
    }
  });
  
  // 找出最活跃的时段
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const sortedDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
  
  let typicalHours = '未知';
  if (sortedHours.length > 0) {
    // 合并相邻的高频小时
    const topHours = sortedHours.slice(0, 3).map(e => parseInt(e[0])).sort((a, b) => a - b);
    if (topHours.length >= 2) {
      typicalHours = `${String(topHours[0]).padStart(2, '0')}:00-${String(topHours[topHours.length - 1] + 1).padStart(2, '0')}:00`;
    } else if (topHours.length === 1) {
      typicalHours = `${String(topHours[0]).padStart(2, '0')}:00-${String((topHours[0] + 2) % 24).padStart(2, '0')}:00`;
    }
  }
  
  preferences.active_hours = {
    typical: typicalHours,
    timezone: 'Asia/Shanghai',
    days_of_week: sortedDays.filter(e => e[1] > 0).map(e => parseInt(e[0]))
  };
  
  return [];
}

/**
 * 保存提取结果到文件
 */
function saveResult(result) {
  try {
    const stateDir = path.dirname(CONFIG.stateFile);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(result, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存用户画像失败:', error);
    return false;
  }
}

/**
 * 加载已有画像
 */
function loadProfile(userId = 'default') {
  try {
    if (fs.existsSync(CONFIG.stateFile)) {
      const data = fs.readFileSync(CONFIG.stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载用户画像失败:', error);
  }
  return null;
}

/**
 * 合并新旧画像（增量更新）
 */
function mergeProfiles(oldProfile, newExtraction) {
  if (!oldProfile) return newExtraction;
  
  // 合并 patterns_detected（去重）
  const existingKeys = new Set(oldProfile.patterns_detected?.map(p => p.pattern_key) || []);
  const newPatterns = (newExtraction.patterns_detected || []).filter(p => !existingKeys.has(p.pattern_key));
  
  return {
    ...oldProfile,
    ...newExtraction,
    patterns_detected: [...(oldProfile.patterns_detected || []), ...newPatterns],
    extracted_at: new Date().toISOString()
  };
}

// 导出模块
module.exports = {
  extract,
  saveResult,
  loadProfile,
  mergeProfiles,
  CONFIG,
  EXTRACTION_RULES
};

// 如果直接运行，执行测试
if (require.main === module) {
  // 测试数据
  const testMessages = [
    { id: '1', content: '这个功能能详细说明一下吗？', timestamp: '2026-04-17T10:30:00+08:00' },
    { id: '2', content: '高考志愿系统最近有什么进展？', timestamp: '2026-04-17T11:00:00+08:00' },
    { id: '3', content: '财富自由是我的长期目标', timestamp: '2026-04-17T14:00:00+08:00' },
    { id: '4', content: '帮我分析一下这个API架构有什么优缺点', timestamp: '2026-04-17T15:30:00+08:00' },
    { id: '5', content: '不对不对，这个方案不够好，需要改', timestamp: '2026-04-17T16:00:00+08:00' }
  ];
  
  console.log('🧠 用户画像自动提取测试\n');
  
  const result = extract(testMessages, 'test_user');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n✅ 测试完成');
}
