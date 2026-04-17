/**
 * 阳神系统 - 自动技能创建器
 * 
 * 功能：监控任务执行，分析可复用模式，自动创建技能
 * 版本：v1.0.0
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '../../config/auto-skill-creator.json');
const SKILL_COUNTERS_PATH = path.join(__dirname, '../../state/skill-counters.json');
const SKILL_TEMPLATE_DIR = path.join(__dirname, '../../templates');

// 技能创建阈值：同类任务达到这个数量就考虑创建技能
const THRESHOLD = 5;

const AUTO_SKILL_CONFIG = {
  // 技能类型 → 触发关键词（用于识别任务类型）
  taskPatterns: {
    'writing-blog': {
      keywords: ['写博客', '写文章', 'blog', 'article', '写作', '文案', '软文', '公众号'],
      threshold: 5,
      created: true
    },
    'code-review': {
      keywords: ['审查代码', 'code review', '代码审查', '检查代码', 'review', '审计代码'],
      threshold: 3,
      created: false
    },
    'data-analysis': {
      keywords: ['分析数据', 'data analysis', '数据分析', '数据分析报告', '统计', '报表'],
      threshold: 5,
      created: false
    },
    'writing-report': {
      keywords: ['写报告', '报告', 'report', '撰写报告', '工作总结', '周报', '月报'],
      threshold: 5,
      created: false
    },
    'market-research': {
      keywords: ['市场调研', '市场分析', '调研', 'research', '行业分析', '竞品分析'],
      threshold: 5,
      created: false
    },
    'novel-creation': {
      keywords: ['写小说', '小说创作', 'novel', '故事创作', '小说', '网文'],
      threshold: 3,
      created: false
    },
    'translation': {
      keywords: ['翻译', 'translation', '中译', '英译', 'translator'],
      threshold: 5,
      created: false
    },
    'video-script': {
      keywords: ['视频脚本', 'video script', '短视频', '带货脚本', '口播'],
      threshold: 3,
      created: false
    },
    'social-content': {
      keywords: ['社交内容', 'social content', '小红书', '抖音', '微博', '朋友圈'],
      threshold: 5,
      created: false
    },
    'business-plan': {
      keywords: ['商业计划', 'business plan', 'BP', '创业计划', '融资'],
      threshold: 3,
      created: false
    },
    'learning-note': {
      keywords: ['学习笔记', '笔记', 'note', '总结', '复习'],
      threshold: 5,
      created: false
    },
    'ppt-presentation': {
      keywords: ['PPT', '演示文稿', 'presentation', '幻灯片', '汇报'],
      threshold: 3,
      created: false
    }
  }
};

/**
 * 加载配置
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      // 确保新字段存在
      if (!data.taskSuccess) data.taskSuccess = {};
      if (!data.taskFailure) data.taskFailure = {};
      return data;
    }
  } catch (e) {
    console.error('[AutoSkillCreator] 加载配置失败:', e.message);
  }
  return { taskCounts: {}, taskSuccess: {}, taskFailure: {}, createdSkills: [] };
}

/**
 * 保存配置
 */
function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[AutoSkillCreator] 保存配置失败:', e.message);
  }
}

/**
 * 分析任务类型 - 更灵活的匹配
 */
function analyzeTaskType(taskDescription) {
  const lower = taskDescription.toLowerCase();
  const words = lower.split(/[\s,，、。！？、:：]+/); // 按各种分隔符分词
  
  for (const [patternName, pattern] of Object.entries(AUTO_SKILL_CONFIG.taskPatterns)) {
    if (pattern.created) continue; // 已创建的跳过
    
    for (const keyword of pattern.keywords) {
      const kwLower = keyword.toLowerCase();
      
      // 1. 精确包含匹配
      if (lower.includes(kwLower)) {
        console.log(`[AutoSkillCreator] 识别任务类型: ${patternName}, 匹配: ${keyword}`);
        return patternName;
      }
      
      // 2. 关键词分词匹配（如"技术博客"中的"博客"能匹配到"写博客"）
      for (const word of words) {
        if (word.length >= 2) {
          // 双向包含检查
          if (word.includes(kwLower) || kwLower.includes(word)) {
            console.log(`[AutoSkillCreator] 识别任务类型: ${patternName}, 词匹配: ${word} ~ ${keyword}`);
            return patternName;
          }
        }
      }
    }
  }
  return null;
}

/**
 * 记录任务执行（扩展版）
 * @param {string} taskType - 任务类型
 * @param {boolean} success - 是否成功
 */
function recordTask(taskType, success = true) {
  const config = loadConfig();
  
  if (!config.taskCounts[taskType]) {
    config.taskCounts[taskType] = 0;
    config.taskSuccess[taskType] = 0;
    config.taskFailure[taskType] = 0;
  }
  config.taskCounts[taskType]++;
  
  if (success) {
    config.taskSuccess[taskType]++;
  } else {
    config.taskFailure[taskType]++;
  }
  
  const pattern = AUTO_SKILL_CONFIG.taskPatterns[taskType];
  const count = config.taskCounts[taskType];
  
  console.log(`[AutoSkillCreator] 任务类型: ${taskType}, 执行次数: ${count}/${pattern.threshold} (成功:${config.taskSuccess[taskType]} 失败:${config.taskFailure[taskType]})`);
  
  // 检查是否达标
  if (count >= pattern.threshold) {
    console.log(`[AutoSkillCreator] ${taskType} 已达到创建阈值!`);
  }
  
  saveConfig(config);
  
  // 同步到旧固化系统
  syncToSkillCounters();
  
  return { count, threshold: pattern.threshold, readyToCreate: count >= pattern.threshold };
}

/**
 * 获取当前任务统计（扩展版）
 */
function getTaskStats() {
  const config = loadConfig();
  const stats = {};
  
  for (const [taskType, count] of Object.entries(config.taskCounts)) {
    const pattern = AUTO_SKILL_CONFIG.taskPatterns[taskType];
    if (pattern) {
      const success = config.taskSuccess?.[taskType] || 0;
      const failure = config.taskFailure?.[taskType] || 0;
      const total = success + failure || count; // 兼容旧数据
      stats[taskType] = {
        count,
        success,
        failure,
        successRate: total > 0 ? Math.round(success / total * 100) : 100,
        threshold: pattern.threshold,
        progress: Math.min(100, Math.round(count / pattern.threshold * 100)),
        created: pattern.created,
        readyToCreate: count >= pattern.threshold
      };
    }
  }
  
  return stats;
}

/**
 * 标记技能已创建
 */
function markSkillCreated(taskType) {
  if (AUTO_SKILL_CONFIG.taskPatterns[taskType]) {
    AUTO_SKILL_CONFIG.taskPatterns[taskType].created = true;
    
    const config = loadConfig();
    if (!config.createdSkills.includes(taskType)) {
      config.createdSkills.push(taskType);
    }
    saveConfig(config);
    
    console.log(`[AutoSkillCreator] 已标记 ${taskType} 为已创建`);
  }
}

/**
 * 获取待创建技能列表
 */
function getPendingSkills() {
  const stats = getTaskStats();
  const pending = [];
  
  for (const [taskType, stat] of Object.entries(stats)) {
    if (!stat.created && stat.readyToCreate) {
      pending.push({ type: taskType, ...stat });
    }
  }
  
  return pending;
}

/**
 * 生成技能创建建议
 */
function generateSkillSuggestion(taskType) {
  const suggestions = {
    'writing-blog': {
      name: 'writing-blog',
      displayName: '博客写作助手',
      description: '快速撰写技术博客、生活分享、观点文章',
      prompt: `请撰写一篇博客文章：
主题：{topic}
字数：{wordCount}字
风格：{style}

要求：
1. 标题吸引人
2. 内容有干货
3. 结构清晰
4. 有行动号召`
    },
    'code-review': {
      name: 'code-review',
      displayName: '代码审查助手',
      description: '代码审查、性能优化、代码质量检查',
      prompt: `请审查以下代码：
语言：{language}
代码：{code}

审查要点：
1. 代码规范
2. 潜在bug
3. 性能问题
4. 安全漏洞
5. 可维护性`
    },
    'data-analysis': {
      name: 'data-analysis',
      displayName: '数据分析助手',
      description: '数据分析、图表生成、趋势预测',
      prompt: `请分析以下数据：
数据来源：{dataSource}
分析目标：{goal}
输出格式：{format}

分析要求：
1. 数据清洗
2. 描述性统计
3. 关键发现
4. 可视化建议`
    },
    'writing-report': {
      name: 'writing-report',
      displayName: '报告撰写助手',
      description: '工作汇报、项目总结、研究报告',
      prompt: `请撰写报告：
报告类型：{reportType}
主题：{topic}
受众：{audience}
字数：{wordCount}字

结构要求：
1. 执行摘要
2. 背景介绍
3. 核心内容
4. 结论建议`
    },
    'market-research': {
      name: 'market-research',
      displayName: '市场调研助手',
      description: '市场调研、竞品分析、行业报告',
      prompt: `请进行市场调研：
调研主题：{topic}
范围：{scope}
目标：{goal}

报告结构：
1. 市场概况
2. 竞争分析
3. 用户洞察
4. 趋势预测
5. 建议`
    },
    'novel-creation': {
      name: 'novel-creation',
      displayName: '小说创作助手',
      description: '短篇小说、连载小说、故事创作',
      prompt: `请创作小说：
类型：{genre}
主题：{theme}
字数：{wordCount}字
风格：{style}

要求：
1. 人物立体
2. 情节曲折
3. 细节丰富
4. 结尾有力`
    },
    'translation': {
      name: 'translation',
      displayName: '翻译助手',
      description: '文档翻译、技术翻译、多语言转换',
      prompt: `请翻译以下内容：
原文语言：{sourceLang}
目标语言：{targetLang}
专业领域：{domain}

翻译要求：
1. 术语准确
2. 表达流畅
3. 保留风格`
    },
    'video-script': {
      name: 'video-script',
      displayName: '视频脚本助手',
      description: '短视频脚本、带货脚本、演讲稿',
      prompt: `请创作视频脚本：
类型：{type}
主题：{topic}
时长：{duration}

脚本结构：
1. 开场钩子
2. 核心内容
3. 行动号召`
    },
    'social-content': {
      name: 'social-content',
      displayName: '社交内容助手',
      description: '小红书、抖音、微博内容创作',
      prompt: `请创作社交媒体内容：
平台：{platform}
主题：{topic}
风格：{style}

要求：
1. 符合平台调性
2. 有互动性
3. 引导关注`
    },
    'business-plan': {
      name: 'business-plan',
      displayName: '商业计划助手',
      description: '商业计划书、BP、创业计划',
      prompt: `请撰写商业计划：
项目名称：{projectName}
核心价值：{coreValue}
目标市场：{targetMarket}

结构要求：
1. 问题/痛点
2. 解决方案
3. 商业模式
4. 竞争优势`
    },
    'learning-note': {
      name: 'learning-note',
      displayName: '学习笔记助手',
      description: '课程笔记、读书笔记、知识整理',
      prompt: `请整理学习笔记：
内容类型：{type}
主题：{topic}
目的：{purpose}

笔记要求：
1. 核心概念
2. 关键知识点
3. 思考题`
    },
    'ppt-presentation': {
      name: 'ppt-presentation',
      displayName: 'PPT演示助手',
      description: 'PPT大纲、演示文稿、汇报材料',
      prompt: `请设计PPT大纲：
主题：{topic}
页数：{pageCount}
受众：{audience}

结构要求：
1. 开场
2. 核心内容
3. 总结
4. 行动号召`
    }
  };
  
  return suggestions[taskType] || null;
}

// 导出接口
module.exports = {
  analyzeTaskType,
  recordTask,
  getTaskStats,
  getPendingSkills,
  markSkillCreated,
  generateSkillSuggestion,
  loadConfig,
  saveConfig,
  // 新增：与旧固化系统的整合
  syncToSkillCounters,
  loadSkillCounters
};

/**
 * 同步到 skill-counters.json（与旧固化系统保持一致）
 */
function syncToSkillCounters() {
  const pending = getPendingSkills();
  const stats = getTaskStats();
  
  try {
    const counters = loadSkillCounters();
    
    // 更新固化状态
    counters.solidification = counters.solidification || {};
    counters.solidification.patternsAccumulating = Object.keys(stats).length;
    counters.solidification.patternsReady = pending.length;
    counters.solidification.patternsSolidified = counters.solidification.patternsSolidified || 0;
    counters.solidification.lastSync = new Date().toISOString();
    
    // 更新任务类型统计
    if (!counters.taskTypeCounts) counters.taskTypeCounts = {};
    for (const [type, stat] of Object.entries(stats)) {
      counters.taskTypeCounts[type] = stat.count;
    }
    
    counters.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(SKILL_COUNTERS_PATH, JSON.stringify(counters, null, 2));
    console.log('[AutoSkillCreator] 已同步到 skill-counters.json');
    
    return counters;
  } catch (e) {
    console.error('[AutoSkillCreator] 同步失败:', e.message);
    return null;
  }
}

/**
 * 读取 skill-counters.json
 */
function loadSkillCounters() {
  try {
    if (fs.existsSync(SKILL_COUNTERS_PATH)) {
      return JSON.parse(fs.readFileSync(SKILL_COUNTERS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[AutoSkillCreator] 读取skill-counters失败:', e.message);
  }
  return { skillCounters: {}, solidification: {} };
}

// 测试
if (require.main === module) {
  console.log('=== 阳神自动技能创建器测试 ===\n');
  
  // 查看任务统计
  console.log('当前任务统计:');
  const stats = getTaskStats();
  if (Object.keys(stats).length === 0) {
    console.log('  (暂无数据)');
  } else {
    for (const [type, stat] of Object.entries(stats)) {
      console.log(`  ${type}: ${stat.count}/${stat.threshold} (${stat.progress}%) ${stat.created ? '✅已创建' : ''}`);
    }
  }
  
  // 模拟记录任务
  console.log('\n--- 模拟记录任务 ---');
  const testTasks = [
    '帮我写一篇技术博客',
    '写个代码审查',
    '分析销售数据',
    '写一篇博客文章',
    '帮我审查代码'
  ];
  
  for (const task of testTasks) {
    const type = analyzeTaskType(task);
    if (type) {
      const result = recordTask(type);
      console.log(`"${task}" → ${type}, 进度: ${result.count}/${result.threshold}`);
    }
  }
  
  // 检查待创建
  console.log('\n--- 待创建技能 ---');
  const pending = getPendingSkills();
  if (pending.length === 0) {
    console.log('(无)');
  } else {
    pending.forEach(p => console.log(`  ${p.type}: ${p.count}次`));
  }
}
