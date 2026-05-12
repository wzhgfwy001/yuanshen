// 【职业鉴定】Identify Weakness - 任务类型分类

/**
 * 任务类型细化系统
 * 触发机制：根据任务特征自动分类
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// 任务类型定义
const TASK_TYPES = {
  // 同步任务（立即返回）
  QUERY: {
    name: 'query',
    category: 'sync',
    description: '简单查询',
    timeout: 30000,
    examples: ['天气', '时间', '计算']
  },
  ONE_SHOT: {
    name: 'one-shot',
    category: 'sync',
    description: '单次操作',
    timeout: 120000,
    examples: ['写信', '翻译', '写代码']
  },
  
  // 异步任务（不阻塞）
  BACKGROUND: {
    name: 'background',
    category: 'async',
    description: '后台运行',
    timeout: null,
    examples: ['监控', '跟踪']
  },
  SCHEDULED: {
    name: 'scheduled',
    category: 'async',
    description: '定时任务',
    timeout: null,
    examples: ['提醒', '定时', '稍后']
  },
  
  // 多步骤任务
  WORKFLOW: {
    name: 'workflow',
    category: 'multi-step',
    description: '工作流任务',
    timeout: 600000,
    examples: ['项目', '报告', '分析']
  },
  DECOMPOSED: {
    name: 'decomposed',
    category: 'multi-step',
    description: '分解任务',
    timeout: 600000,
    examples: ['拆解', '步骤']
  },
  
  // 协作任务
  PARALLEL: {
    name: 'parallel',
    category: 'collaborative',
    description: '并行任务',
    timeout: 900000,
    examples: ['同时', '并行', '一起']
  },
  SEQUENTIAL: {
    name: 'sequential',
    category: 'collaborative',
    description: '串行任务',
    timeout: 900000,
    examples: ['先', '然后', '最后']
  },
  TEAM: {
    name: 'team',
    category: 'collaborative',
    description: '团队任务',
    timeout: 900000,
    examples: ['子Agent', '团队', '协作']
  },
  
  // 监控任务
  WATCH: {
    name: 'watch',
    category: 'monitor',
    description: '监控任务',
    timeout: null,
    examples: ['监控', '观察']
  },
  HEARTBEAT: {
    name: 'heartbeat',
    category: 'monitor',
    description: '心跳检查',
    timeout: null,
    examples: ['检查', '状态']
  },
  
  // 记忆任务
  RECALL: {
    name: 'recall',
    category: 'memory',
    description: '回忆任务',
    timeout: 300000,
    examples: ['记得', '上次', '之前']
  },
  ORGANIZE: {
    name: 'organize',
    category: 'memory',
    description: '整理任务',
    timeout: 300000,
    examples: ['整理', '归档']
  }
};

// 分类关键词
const CATEGORY_KEYWORDS = {
  sync: ['查', '问', '多少钱', '几个', '什么'],
  async: ['后台', '稍后', '等一下', '提醒我'],
  'multi-step': ['然后', '接下来', '第一步', '第二步'],
  collaborative: ['一起', '同时', '分别', '子Agent'],
  monitor: ['监控', '检查', '状态', '观察'],
  memory: ['记得', '记住', '存储', '整理']
};

// 优先级定义
const PRIORITIES = {
  P0: { level: 0, name: '紧急', color: '🔴' },
  P1: { level: 1, name: '高', color: '🟠' },
  P2: { level: 2, name: '中', color: '🟡' },
  P3: { level: 3, name: '低', color: '🟢' }
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = {
      task_count: 0,
      type_stats: {},
      avg_duration: {}
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

// 保存状态
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 关键词匹配检测
function matchesKeyword(text, keywords) {
  return keywords.some(kw => text.includes(kw));
}

// 检测任务类别
function detectCategory(text) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (matchesKeyword(text, keywords)) {
      return category;
    }
  }
  return 'sync'; // 默认同步
}

// 检测具体类型
function detectType(text) {
  const lowerText = text.toLowerCase();
  
  // 检查是否是团队任务
  if (lowerText.includes('agent') || lowerText.includes('团队') || lowerText.includes('子任务')) {
    return TASK_TYPES.TEAM;
  }
  
  // 检查是否是并行任务
  if (lowerText.includes('同时') || lowerText.includes('并行') || lowerText.includes('一起做')) {
    return TASK_TYPES.PARALLEL;
  }
  
  // 检查是否是串行任务
  if (lowerText.includes('先') && lowerText.includes('然后') || lowerText.includes('最后')) {
    return TASK_TYPES.SEQUENTIAL;
  }
  
  // 检查是否是工作流
  if (lowerText.includes('项目') || lowerText.includes('报告') || lowerText.includes('完成')) {
    return TASK_TYPES.WORKFLOW;
  }
  
  // 检查是否是定时任务
  if (lowerText.includes('提醒') || lowerText.includes('定时') || lowerText.includes('稍后')) {
    return TASK_TYPES.SCHEDULED;
  }
  
  // 检查是否是后台任务
  if (lowerText.includes('后台') || lowerText.includes('监控')) {
    return TASK_TYPES.BACKGROUND;
  }
  
  // 检查是否是记忆任务
  if (lowerText.includes('记得') || lowerText.includes('记住') || lowerText.includes('存储')) {
    return TASK_TYPES.RECALL;
  }
  
  // 检查是否是回忆任务
  if (lowerText.includes('上次') || lowerText.includes('之前') || lowerText.includes('那时候')) {
    return TASK_TYPES.RECALL;
  }
  
  // 检查是否是简单查询
  if (lowerText.includes('?') || matchesKeyword(text, TASK_TYPES.QUERY.examples)) {
    return TASK_TYPES.QUERY;
  }
  
  // 默认单次操作
  return TASK_TYPES.ONE_SHOT;
}

// 检测优先级
function detectPriority(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('紧急') || lowerText.includes('立刻') || lowerText.includes('马上')) {
    return PRIORITIES.P0;
  }
  if (lowerText.includes('重要') || lowerText.includes('优先')) {
    return PRIORITIES.P1;
  }
  if (lowerText.includes('不急') || lowerText.includes('有空')) {
    return PRIORITIES.P3;
  }
  
  return PRIORITIES.P2; // 默认中优先级
}

// 估算任务复杂度（1-10）
function estimateComplexity(text) {
  let score = 1;
  
  // 关键词增加复杂度
  if (matchesKeyword(text, ['然后', '接下来', '最后'])) score += 1;
  if (text.includes('但是') || text.includes('如果')) score += 1;
  if (text.length > 100) score += 1;
  if (text.includes('？') || text.includes('?')) score += 1;
  if (matchesKeyword(text, ['项目', '报告', '分析'])) score += 2;
  if (matchesKeyword(text, ['团队', '多个', '同时'])) score += 2;
  
  return Math.min(score, 10);
}

// 主分类函数
function classify(taskText, options = {}) {
  const type = detectType(taskText);
  const category = detectCategory(taskText);
  const priority = options.priority || detectPriority(taskText);
  const complexity = estimateComplexity(taskText);
  
  // 判断是否需要多Agent
  const needsMultiAgent = 
    category === 'collaborative' || 
    category === 'multi-step' ||
    complexity >= 7;
  
  // 判断是否需要子Agent
  const needsSubAgent = 
    type.name === 'team' ||
    (category === 'collaborative' && complexity >= 5);
  
  // 估算超时时间
  let timeout = type.timeout;
  if (options.timeout) {
    timeout = options.timeout;
  } else if (complexity >= 7) {
    timeout = Math.min(timeout * 2, 1800000); // 复杂任务超时翻倍，上限30分钟
  }
  
  // 生成任务ID
  const state = initState();
  state.task_count += 1;
  const taskId = `task_${Date.now()}_${state.task_count}`;
  saveState(state);
  
  const result = {
    taskId,
    type: type.name,
    category,
    priority: priority.name,
    priorityLevel: priority.level,
    complexity,
    needsMultiAgent,
    needsSubAgent,
    timeout,
    recommendedApproach: getRecommendedApproach(category, complexity),
    tips: getTips(type.name)
  };
  
  return result;
}

// 获取推荐处理方式
function getRecommendedApproach(category, complexity) {
  const approaches = {
    sync: '直接处理，立即返回结果',
    async: '后台处理，完成后通知',
    'multi-step': '分解任务，逐步执行',
    collaborative: '启用多Agent协作',
    monitor: '启动监控，定期汇报',
    memory: '访问记忆系统'
  };
  
  let approach = approaches[category] || '默认处理';
  
  if (complexity >= 7) {
    approach += '，建议启用质量审查';
  }
  
  return approach;
}

// 获取处理提示
function getTips(typeName) {
  const tips = {
    'query': ['简洁回答', '直接提供信息'],
    'one-shot': ['一次完成', '注意格式'],
    'workflow': ['分步执行', '每步确认'],
    'parallel': ['同时处理', '汇总结果'],
    'team': ['协调子Agent', '监控进度'],
    'recall': ['搜索记忆', '提供上下文'],
    'organize': ['分类整理', '更新记忆']
  };
  
  return tips[typeName] || ['标准处理'];
}

// 获取统计信息
function getStats() {
  const state = initState();
  
  // 计算各类任务数量
  const typeStats = {};
  for (const [key, type] of Object.entries(TASK_TYPES)) {
    typeStats[type.name] = state.type_stats[type.name] || 0;
  }
  
  return {
    total_tasks: state.task_count,
    type_distribution: typeStats,
    avg_duration: state.avg_duration
  };
}

// 记录任务完成
function recordCompletion(taskId, type, durationMs) {
  const state = initState();
  
  state.type_stats[type] = (state.type_stats[type] || 0) + 1;
  
  if (state.avg_duration[type]) {
    state.avg_duration[type] = Math.round(
      (state.avg_duration[type] + durationMs) / 2
    );
  } else {
    state.avg_duration[type] = durationMs;
  }
  
  saveState(state);
  return { success: true };
}

// 导出模块
module.exports = {
  classify,
  getStats,
  recordCompletion,
  TASK_TYPES,
  PRIORITIES
};
