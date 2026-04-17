// 【考古学】Archaeology - 研究助手

/**
 * 研究助手技能
 * 辅助研究工作
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ research_count: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 提取摘要
function summarize(text, maxLength = 500) {
  if (text.length <= maxLength) return text;
  
  // 简单截断，保留开头和结尾
  const headLength = Math.floor(maxLength * 0.7);
  const tailLength = maxLength - headLength;
  
  return text.substring(0, headLength) + '...\n\n[截断内容]...\n\n' + text.substring(text.length - tailLength);
}

// 提取关键信息
function extractKeyInfo(text) {
  const info = {
    numbers: [],
    dates: [],
    names: [],
    organizations: []
  };
  
  // 提取数字
  const numberPattern = /\d+\.?\d*/g;
  const numbers = text.match(numberPattern);
  if (numbers) info.numbers = [...new Set(numbers)].slice(0, 10);
  
  // 提取日期
  const datePattern = /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/g;
  const dates = text.match(datePattern);
  if (dates) info.dates = [...new Set(dates)].slice(0, 5);
  
  return info;
}

// 生成研究大纲
function outline(topic, options = {}) {
  const sections = options.sections || 5;
  
  const outline = {
    topic,
    sections: [],
    created: new Date().toISOString()
  };
  
  // 默认章节结构
  const defaultSections = [
    { title: '背景介绍', description: '介绍研究主题的背景和重要性' },
    { title: '文献综述', description: '总结前人的研究成果' },
    { title: '研究方法', description: '说明采用的研究方法' },
    { title: '研究结果', description: '展示研究发现' },
    { title: '讨论与结论', description: '分析结果并给出结论' }
  ];
  
  outline.sections = defaultSections.slice(0, sections);
  
  return outline;
}

// 比较分析
function compare(items, criteria) {
  const result = {
    items: [],
    criteria,
    rankings: {}
  };
  
  // 为每个条目打分
  for (const item of items) {
    const scores = {};
    let totalScore = 0;
    
    for (const criterion of criteria) {
      const score = criterion.scoreFn(item[criterion.key]);
      scores[criterion.name] = score;
      totalScore += score * (criterion.weight || 1);
    }
    
    result.items.push({
      name: item.name || item.title || `Item ${result.items.length + 1}`,
      scores,
      totalScore: Math.round(totalScore * 100) / 100
    });
  }
  
  // 按总分排序
  result.items.sort((a, b) => b.totalScore - a.totalScore);
  
  // 添加排名
  result.items.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return result;
}

// 研究建议
function suggest(topic, context = {}) {
  const suggestions = [];
  
  // 基于主题给出建议
  if (topic.includes('AI') || topic.includes('人工智能')) {
    suggestions.push('建议关注最新的模型架构进展');
    suggestions.push('考虑加入实际案例研究');
  }
  
  if (topic.includes('市场') || topic.includes('商业')) {
    suggestions.push('建议收集一手市场数据');
    suggestions.push('可以加入竞品分析');
  }
  
  if (topic.includes('技术') || topic.includes('开发')) {
    suggestions.push('建议包含技术实现细节');
    suggestions.push('考虑加入性能测试数据');
  }
  
  // 通用建议
  suggestions.push('确保引用来源可靠');
  suggestions.push('注意研究方法的科学性');
  
  return suggestions;
}

// 导出
module.exports = {
  summarize,
  extractKeyInfo,
  outline,
  compare,
  suggest,
  getStats: () => initState()
};
