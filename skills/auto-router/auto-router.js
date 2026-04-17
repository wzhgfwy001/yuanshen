// 【气流顺引】Gust of Wind - 自动路由

/**
 * Skills意图自动路由器
 * 根据用户消息自动判断应该调用哪个技能
 */

const path = require('path');
const hub = require(path.join(__dirname, '../skill-hub/skill-hub.js'));

/**
 * 分析用户消息，返回推荐的技能
 */
function route(userMessage) {
  const msg = userMessage.toLowerCase();
  const recommendations = [];
  
  // 情绪检测（始终检测，不影响其他技能匹配）
  const frustration = hub.detectFrustration(userMessage);
  const frLevel = frustration.level;
  const isFrustrated = (typeof frLevel === 'string' && frLevel !== 'none' && frLevel !== 'light') ||
                       (typeof frLevel === 'number' && frLevel >= 2);
  if (isFrustrated) {
    recommendations.push({ 
      skill: 'frustration', 
      reason: `检测到用户${frLevel === 'high' || frLevel >= 3 ? '高' : '中'}度不满信号`, 
      method: 'detectFrustration',
      priority: 'high'
    });
  }
  
  // 代码相关
  if (msg.includes('代码') || msg.includes('review') || msg.includes('审查') || msg.includes('检查代码')) {
    recommendations.push({ skill: 'codeReview', reason: '代码审查请求', method: 'reviewCode', priority: 'normal' });
  }
  
  // 博客/文章写作
  if (msg.includes('博客') || msg.includes('文章') || msg.includes('写一篇')) {
    recommendations.push({ skill: 'blog', reason: '博客/文章写作', method: 'writeBlog', priority: 'normal' });
  }
  
  // 数据分析
  if (msg.includes('分析') || msg.includes('数据') || msg.includes('统计')) {
    recommendations.push({ skill: 'analysis', reason: '数据分析请求', method: 'analyze', priority: 'normal' });
  }
  
  // 项目规划
  if (msg.includes('规划') || msg.includes('计划') || msg.includes('项目')) {
    recommendations.push({ skill: 'planner', reason: '项目规划请求', method: 'planProject', priority: 'normal' });
  }
  
  // 研究/调研
  if (msg.includes('研究') || msg.includes('调研') || msg.includes('调查')) {
    recommendations.push({ skill: 'research', reason: '研究调研请求', method: 'research', priority: 'normal' });
  }
  
  // 可视化/图表
  if (msg.includes('图表') || msg.includes('可视化') || msg.includes('dashboard')) {
    recommendations.push({ skill: 'visual', reason: '可视化请求', method: 'createChart', priority: 'normal' });
  }
  
  // 小红书
  if (msg.includes('小红书') || msg.includes('种草')) {
    recommendations.push({ skill: 'xiaohongshu', reason: '小红书写作', method: 'writeXiaohongshu', priority: 'normal' });
  }
  
  // 任务分类
  if (msg.includes('任务') || msg.includes('分类')) {
    recommendations.push({ skill: 'classifier', reason: '任务分类', method: 'classifyTask', priority: 'normal' });
  }
  
  return recommendations;
}

/**
 * 自动执行推荐的技能
 */
function autoExecute(userMessage, options = {}) {
  const recommendations = route(userMessage);
  
  if (recommendations.length === 0) {
    return { routed: false, message: '未识别到特定技能请求' };
  }
  
  // 优先执行情绪检测（高优先级）
  const frustrationRec = recommendations.find(r => r.priority === 'high');
  if (frustrationRec) {
    const result = hub[frustrationRec.method](userMessage);
    return { routed: true, skill: 'frustration', result, recommendations };
  }
  
  // 执行第一个匹配的技能
  const primary = recommendations[0];
  const skill = hub[primary.method];
  
  if (typeof skill === 'function') {
    try {
      const result = skill(userMessage, options);
      return { routed: true, skill: primary.skill, result, recommendations };
    } catch (e) {
      return { routed: false, error: e.message, recommendations };
    }
  }
  
  return { routed: false, message: '技能方法不可调用', recommendations };
}

/**
 * 获取所有技能状态
 */
function getSkillsStatus() {
  return hub.getAllSkillStatus();
}

module.exports = { route, autoExecute, getSkillsStatus };

// 测试模式（直接运行）
if (require.main === module) {
  const tests = [
    '帮我写一篇博客',
    '分析一下这个数据',
    '代码有bug',
    '我要做一个项目规划'
  ];
  
  console.log('\n=== Auto-Router 测试 ===\n');
  for (const msg of tests) {
    const result = route(msg);
    console.log(`输入: "${msg}"`);
    console.log(`路由: ${JSON.stringify(result, null, 2)}\n`);
  }
}
