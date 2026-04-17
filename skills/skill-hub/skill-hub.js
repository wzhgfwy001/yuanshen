/**
 * 技能中心 - 统一调用所有技能
 * 
 * 使用方式：
 * const hub = require('./skill-hub.js');
 * 
 * 审查代码：hub.review('代码内容')
 * 生成博客：hub.blog('主题')
 * 分析数据：hub.analyze([1,2,3,4,5])
 * 项目规划：hub.plan('项目名称', '描述')
 * 情绪检测：hub.frustration('用户消息')
 * 任务分类：hub.classify('任务描述')
 * 写作助手：hub.write('主题')
 */

const fs = require('fs');
const path = require('path');

// 技能路径
const SKILLS = {
  frustration: path.join(__dirname, '../frustration-detector/frustration-detector.js'),
  context: path.join(__dirname, '../context-compactor/context-compactor.js'),
  classifier: path.join(__dirname, '../task-typologist/task-typologist.js'),
  codeReview: path.join(__dirname, '../code-review/code-review.js'),
  blog: path.join(__dirname, '../writing-blog/writing-blog.js'),
  analysis: path.join(__dirname, '../data-analysis/data-analysis.js'),
  planner: path.join(__dirname, '../project-planner/project-planner.js'),
  research: path.join(__dirname, '../research-assistant/research-assistant.js'),
  visual: path.join(__dirname, '../visualization-creator/visualization-creator.js'),
  xiaohongshu: path.join(__dirname, '../xiaohongshu-editor/xiaohongshu-editor.js'),
  featureFlags: path.join(__dirname, '../feature-flags/feature-flags.js')
};

// 缓存加载的技能
const loadedSkills = {};

function loadSkill(name) {
  if (!loadedSkills[name]) {
    try {
      loadedSkills[name] = require(SKILLS[name]);
    } catch (e) {
      return null;
    }
  }
  return loadedSkills[name];
}

// ================== 技能封装 ==================

/**
 * 代码审查
 */
function reviewCode(code, options = {}) {
  const skill = loadSkill('codeReview');
  if (!skill) return { error: 'code-review技能未加载' };
  return skill.review(code, options);
}

/**
 * 生成博客
 */
function writeBlog(topic, options = {}) {
  const skill = loadSkill('blog');
  if (!skill) return { error: 'writing-blog技能未加载' };
  return skill.write(topic, options);
}

/**
 * 数据分析
 */
function analyze(data, options = {}) {
  const skill = loadSkill('analysis');
  if (!skill) return { error: 'data-analysis技能未加载' };
  return skill.analyze(data, options);
}

/**
 * 项目规划
 */
function planProject(name, description, options = {}) {
  const skill = loadSkill('planner');
  if (!skill) return { error: 'project-planner技能未加载' };
  return skill.decompose(name, description, options);
}

/**
 * 情绪检测
 */
function detectFrustration(message, options = {}) {
  const skill = loadSkill('frustration');
  if (!skill) return { error: 'frustration-detector技能未加载' };
  return skill.detect(message, options);
}

/**
 * 任务分类
 */
function classifyTask(taskText, options = {}) {
  const skill = loadSkill('classifier');
  if (!skill) return { error: 'task-typologist技能未加载' };
  return skill.classify(taskText, options);
}

/**
 * 上下文压缩
 */
function compactContext(messages, options = {}) {
  const skill = loadSkill('context');
  if (!skill) return { error: 'context-compactor技能未加载' };
  return skill.compact(messages, options);
}

/**
 * 研究助手
 */
function research(topic, context = {}) {
  const skill = loadSkill('research');
  if (!skill) return { error: 'research-assistant技能未加载' };
  return {
    summarize: skill.summarize(topic),
    outline: skill.outline(topic),
    suggest: skill.suggest(topic, context)
  };
}

/**
 * 可视化创建
 */
function createChart(data, options = {}) {
  const skill = loadSkill('visual');
  if (!skill) return { error: 'visualization-creator技能未加载' };
  return skill.createChart(data, options);
}

function createTable(data, options = {}) {
  const skill = loadSkill('visual');
  if (!skill) return { error: 'visualization-creator技能未加载' };
  return skill.createTable(data, options);
}

/**
 * 小红书写作
 */
function writeXiaohongshu(topic, options = {}) {
  const skill = loadSkill('xiaohongshu');
  if (!skill) return { error: 'xiaohongshu-editor技能未加载' };
  return skill.write(topic, options);
}

/**
 * 特性开关
 */
function isFeatureEnabled(featureName) {
  const skill = loadSkill('featureFlags');
  if (!skill) return false;
  return skill.isEnabled(featureName);
}

function toggleFeature(featureName, reason = '') {
  const skill = loadSkill('featureFlags');
  if (!skill) return { error: 'feature-flags技能未加载' };
  return skill.toggle(featureName, reason);
}

/**
 * 获取所有技能状态
 */
function getAllSkillStatus() {
  const status = {};
  
  for (const [name, skillPath] of Object.entries(SKILLS)) {
    try {
      const skill = loadSkill(name);
      status[name] = skill ? 'loaded' : 'error';
    } catch (e) {
      status[name] = 'error';
    }
  }
  
  return status;
}

/**
 * 统一调用接口
 */
function call(skillName, method, ...args) {
  const skill = loadSkill(skillName);
  if (!skill) {
    return { error: `技能 ${skillName} 未找到` };
  }
  
  if (typeof skill[method] !== 'function') {
    return { error: `技能 ${skillName} 没有方法 ${method}` };
  }
  
  try {
    return skill[method](...args);
  } catch (e) {
    return { error: e.message };
  }
}

// 导出
module.exports = {
  // 直接方法
  reviewCode,
  writeBlog,
  analyze,
  planProject,
  detectFrustration,
  classifyTask,
  compactContext,
  research,
  createChart,
  createTable,
  writeXiaohongshu,
  isFeatureEnabled,
  toggleFeature,
  getAllSkillStatus,
  call
};
