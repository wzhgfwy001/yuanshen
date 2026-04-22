/**
 * 阳神系统 - 自动技能创建器 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化
 * 2. 中间件管道钩子
 * 3. 结构化状态
 * 4. 事件系统
 * 5. 去重机制
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '../../config/auto-skill-creator.json');
const SKILL_COUNTERS_PATH = path.join(__dirname, '../../state/skill-counters.json');
const SKILL_TEMPLATE_DIR = path.join(__dirname, '../../templates');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class TaskPattern {
  constructor(name, config) {
    this.name = name;
    this.keywords = config.keywords || [];
    this.threshold = config.threshold || 5;
    this.created = config.created || false;
  }
}

class TaskStats {
  constructor(type) {
    this.type = type;
    this.count = 0;
    this.success = 0;
    this.failure = 0;
    this.lastRecorded = null;
    this.firstSeen = null;
    this.dedupSet = new Set(); // 去重集合
  }

  record(success = true, taskId = null) {
    // 去重：如果提供了taskId且已记录过，跳过
    if (taskId && this.dedupSet.has(taskId)) {
      return false;
    }
    if (taskId) {
      this.dedupSet.add(taskId);
    }

    this.count++;
    if (success) this.success++;
    else this.failure++;

    const now = Date.now();
    this.lastRecorded = now;
    if (!this.firstSeen) this.firstSeen = now;

    return true; // 记录成功
  }

  get successRate() {
    const total = this.success + this.failure;
    return total > 0 ? Math.round(this.success / total * 100) : 100;
  }

  get progress() {
    return Math.min(100, Math.round(this.count / this.threshold * 100));
  }

  get readyToCreate() {
    return this.count >= this.threshold;
  }

  toJSON() {
    return {
      type: this.type,
      count: this.count,
      success: this.success,
      failure: this.failure,
      successRate: this.successRate,
      threshold: this.threshold,
      progress: this.progress,
      readyToCreate: this.readyToCreate,
      firstSeen: this.firstSeen,
      lastRecorded: this.lastRecorded
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class EventEmitter {
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

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`[EventEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new EventEmitter();

// 事件：技能创建就绪
emitter.on('skillReady', (taskType, stats) => {
  console.log(`[AutoSkillCreator] 🚀 技能 ${taskType} 已达到创建阈值 (${stats.count}/${stats.threshold})`);
});

// 事件：任务记录
emitter.on('taskRecorded', (taskType, stats) => {
  if (stats.readyToCreate) {
    emitter.emit('skillReady', taskType, stats);
  }
});

// ==================== DeerFlow借鉴: 中间件管道 ====================

class AnalysisMiddleware {
  beforeAnalyze(taskText, context) { 
    return { taskText: taskText.trim(), context }; 
  }
  afterAnalyze(result, context) { return result; }
  onError(error, context) { return context; }
}

class AnalysisPipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  execute(taskText, context, analyzeFn) {
    let ctx = { ...context, errors: [] };

    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeAnalyze(ctx.taskText, ctx.context);
        ctx.taskText = result.taskText;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
        mw.onError(e, ctx);
      }
    }

    let result;
    try {
      result = analyzeFn(ctx.taskText, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      for (const mw of this.middlewares) mw.onError(e, ctx);
      result = { type: null, matched: false };
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterAnalyze(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    return result;
  }
}

// 具体中间件
class LoggingMiddleware extends AnalysisMiddleware {
  beforeAnalyze(taskText, context) {
    console.log(`[AutoSkillCreator] 分析任务: "${taskText.slice(0, 50)}..."`);
    return { taskText, context };
  }
}

class NormalizationMiddleware extends AnalysisMiddleware {
  beforeAnalyze(taskText, context) {
    return { 
      taskText: taskText.replace(/\s+/g, ' ').toLowerCase(), 
      context 
    };
  }
}

class ResultEnrichmentMiddleware extends AnalysisMiddleware {
  afterAnalyze(result, context) {
    result.analyzedAt = new Date().toISOString();
    result.pipelineVersion = '2.0';
    return result;
  }
}

// ==================== 配置和状态 ====================

const AUTO_SKILL_CONFIG = {
  taskPatterns: {
    'writing-blog': { keywords: ['写博客', '写文章', 'blog', 'article', '写作', '文案', '软文', '公众号'], threshold: 5, created: true },
    'code-review': { keywords: ['审查代码', 'code review', '代码审查', '检查代码', 'review', '审计代码'], threshold: 3, created: false },
    'data-analysis': { keywords: ['分析数据', 'data analysis', '数据分析', '数据分析报告', '统计', '报表'], threshold: 5, created: false },
    'writing-report': { keywords: ['写报告', '报告', 'report', '撰写报告', '工作总结', '周报', '月报'], threshold: 5, created: false },
    'market-research': { keywords: ['市场调研', '市场分析', '调研', 'research', '行业分析', '竞品分析'], threshold: 5, created: false },
    'novel-creation': { keywords: ['写小说', '小说创作', 'novel', '故事创作', '小说', '网文'], threshold: 3, created: false },
    'translation': { keywords: ['翻译', 'translation', '中译', '英译', 'translator'], threshold: 5, created: false },
    'video-script': { keywords: ['视频脚本', 'video script', '短视频', '带货脚本', '口播'], threshold: 3, created: false },
    'social-content': { keywords: ['社交内容', 'social content', '小红书', '抖音', '微博', '朋友圈'], threshold: 5, created: false },
    'business-plan': { keywords: ['商业计划', 'business plan', 'BP', '创业计划', '融资'], threshold: 3, created: false },
    'learning-note': { keywords: ['学习笔记', '笔记', 'note', '总结', '复习'], threshold: 5, created: false },
    'ppt-presentation': { keywords: ['PPT', '演示文稿', 'presentation', '幻灯片', '汇报'], threshold: 3, created: false }
  }
};

// 内存中的统计
let statsCache = {};
const statsCacheTTL = 60000; // 1分钟缓存
let statsCacheTime = 0;

// ==================== 异步文件操作 ====================

async function loadConfig() {
  try {
    if (fsSync.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
      if (!data.taskSuccess) data.taskSuccess = {};
      if (!data.taskFailure) data.taskFailure = {};
      return data;
    }
  } catch (e) {
    console.error('[AutoSkillCreator] 加载配置失败:', e.message);
  }
  return { taskCounts: {}, taskSuccess: {}, taskFailure: {}, createdSkills: [] };
}

async function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AutoSkillCreator] 保存配置失败:', e.message);
    return false;
  }
}

// ==================== 核心功能 ====================

// 创建管道实例
const analysisPipeline = new AnalysisPipeline();
analysisPipeline.use(new NormalizationMiddleware());
analysisPipeline.use(new LoggingMiddleware());
analysisPipeline.use(new ResultEnrichmentMiddleware());

/**
 * 分析任务类型
 */
function analyzeTaskType(taskText) {
  return analysisPipeline.execute(taskText, {}, (text, ctx) => {
    const words = text.split(/[\s,，、。！？、:：]+/);
    
    for (const [patternName, pattern] of Object.entries(AUTO_SKILL_CONFIG.taskPatterns)) {
      if (pattern.created) continue;
      
      for (const keyword of pattern.keywords) {
        const kwLower = keyword.toLowerCase();
        
        if (text.includes(kwLower)) {
          return { type: patternName, matched: true, keyword, matchType: 'exact' };
        }
        
        for (const word of words) {
          if (word.length >= 2) {
            if (word.includes(kwLower) || kwLower.includes(word)) {
              return { type: patternName, matched: true, keyword, matchType: 'partial' };
            }
          }
        }
      }
    }
    
    return { type: null, matched: false };
  });
}

/**
 * 记录任务执行（异步）
 */
async function recordTask(taskType, success = true, taskId = null) {
  const config = await loadConfig();
  
  if (!config.taskCounts[taskType]) {
    config.taskCounts[taskType] = 0;
    config.taskSuccess[taskType] = 0;
    config.taskFailure[taskType] = 0;
  }
  
  // 去重检查
  const dedupKey = taskId || `${taskType}_${Date.now()}`;
  if (config.dedupSet && config.dedupSet.includes(dedupKey)) {
    return { count: config.taskCounts[taskType], threshold: AUTO_SKILL_CONFIG.taskPatterns[taskType].threshold, duplicate: true };
  }
  
  config.taskCounts[taskType]++;
  if (success) config.taskSuccess[taskType]++;
  else config.taskFailure[taskType]++;
  
  if (!config.dedupSet) config.dedupSet = [];
  config.dedupSet.push(dedupKey);
  if (config.dedupSet.length > 1000) config.dedupSet = config.dedupSet.slice(-500);
  
  await saveConfig(config);
  
  const pattern = AUTO_SKILL_CONFIG.taskPatterns[taskType];
  const count = config.taskCounts[taskType];
  
  // 触发事件
  emitter.emit('taskRecorded', taskType, { count, threshold: pattern.threshold, success });
  
  if (count >= pattern.threshold) {
    emitter.emit('skillReady', taskType, { count, threshold: pattern.threshold });
  }
  
  // 同步到旧系统
  syncToSkillCounters();
  
  return { count, threshold: pattern.threshold, readyToCreate: count >= pattern.threshold, duplicate: false };
}

/**
 * 获取任务统计（带缓存）
 */
async function getTaskStats() {
  const now = Date.now();
  if (now - statsCacheTime < statsCacheTTL && Object.keys(statsCache).length > 0) {
    return statsCache;
  }
  
  const config = await loadConfig();
  const stats = {};
  
  for (const [taskType, count] of Object.entries(config.taskCounts)) {
    const pattern = AUTO_SKILL_CONFIG.taskPatterns[taskType];
    if (pattern) {
      const success = config.taskSuccess?.[taskType] || 0;
      const failure = config.taskFailure?.[taskType] || 0;
      stats[taskType] = new TaskStats(taskType);
      stats[taskType].count = count;
      stats[taskType].success = success;
      stats[taskType].failure = failure;
    }
  }
  
  statsCache = stats;
  statsCacheTime = now;
  
  return stats;
}

/**
 * 获取待创建技能列表
 */
async function getPendingSkills() {
  const stats = await getTaskStats();
  const pending = [];
  
  for (const [taskType, stat] of Object.entries(stats)) {
    if (stat.readyToCreate && !AUTO_SKILL_CONFIG.taskPatterns[taskType]?.created) {
      pending.push(stat.toJSON());
    }
  }
  
  return pending;
}

/**
 * 标记技能已创建
 */
async function markSkillCreated(taskType) {
  if (AUTO_SKILL_CONFIG.taskPatterns[taskType]) {
    AUTO_SKILL_CONFIG.taskPatterns[taskType].created = true;
    
    const config = await loadConfig();
    if (!config.createdSkills.includes(taskType)) {
      config.createdSkills.push(taskType);
    }
    await saveConfig(config);
    
    emitter.emit('skillMarkedCreated', taskType);
  }
}

/**
 * 生成技能创建建议
 */
function generateSkillSuggestion(taskType) {
  const suggestions = {
    'writing-blog': { name: 'writing-blog', displayName: '博客写作助手', description: '快速撰写技术博客、生活分享、观点文章' },
    'code-review': { name: 'code-review', displayName: '代码审查助手', description: '代码审查、性能优化、代码质量检查' },
    'data-analysis': { name: 'data-analysis', displayName: '数据分析助手', description: '数据分析、图表生成、趋势预测' },
    'writing-report': { name: 'writing-report', displayName: '报告撰写助手', description: '工作汇报、项目总结、研究报告' },
    'market-research': { name: 'market-research', displayName: '市场调研助手', description: '市场调研、竞品分析、行业报告' },
    'novel-creation': { name: 'novel-creation', displayName: '小说创作助手', description: '短篇小说、连载小说、故事创作' },
    'translation': { name: 'translation', displayName: '翻译助手', description: '文档翻译、技术翻译、多语言转换' },
    'video-script': { name: 'video-script', displayName: '视频脚本助手', description: '短视频脚本、带货脚本、演讲稿' },
    'social-content': { name: 'social-content', displayName: '社交内容助手', description: '小红书、抖音、微博内容创作' },
    'business-plan': { name: 'business-plan', displayName: '商业计划助手', description: '商业计划书、BP、创业计划' },
    'learning-note': { name: 'learning-note', displayName: '学习笔记助手', description: '课程笔记、读书笔记、知识整理' },
    'ppt-presentation': { name: 'ppt-presentation', displayName: 'PPT演示助手', description: 'PPT大纲、演示文稿、汇报材料' }
  };
  
  return suggestions[taskType] || null;
}

/**
 * 同步到 skill-counters.json
 */
async function syncToSkillCounters() {
  const pending = await getPendingSkills();
  const stats = await getTaskStats();
  
  try {
    let counters = {};
    try {
      if (fsSync.existsSync(SKILL_COUNTERS_PATH)) {
        counters = JSON.parse(await fs.readFile(SKILL_COUNTERS_PATH, 'utf8'));
      }
    } catch {}

    counters.solidification = counters.solidification || {};
    counters.solidification.patternsAccumulating = Object.keys(stats).length;
    counters.solidification.patternsReady = pending.length;
    counters.solidification.lastSync = new Date().toISOString();

    if (!counters.taskTypeCounts) counters.taskTypeCounts = {};
    for (const [type, stat] of Object.entries(stats)) {
      counters.taskTypeCounts[type] = stat.count;
    }

    counters.lastUpdated = new Date().toISOString();

    await fs.writeFile(SKILL_COUNTERS_PATH, JSON.stringify(counters, null, 2), 'utf8');
    return counters;
  } catch (e) {
    console.error('[AutoSkillCreator] 同步失败:', e.message);
    return null;
  }
}

// ==================== 导出 ====================

module.exports = {
  // 核心函数
  analyzeTaskType,
  recordTask,
  getTaskStats,
  getPendingSkills,
  markSkillCreated,
  generateSkillSuggestion,
  loadConfig,
  saveConfig,
  syncToSkillCounters,
  
  // 事件
  emitter,
  on: (event, listener) => emitter.on(event, listener),
  off: (event, listener) => emitter.off(event, listener),
  
  // 工具
  clearStatsCache: () => { statsCache = {}; statsCacheTime = 0; }
};
