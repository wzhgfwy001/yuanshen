// 【铭文学】Inscription - 博客写作

/**
 * 博客写作技能
 * 根据主题生成结构化博客文章
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// 博客模板
const TEMPLATES = {
  tutorial: {
    name: '教程',
    structure: ['引言', '前置要求', '步骤详解', '常见问题', '总结'],
    sections: {
      intro: '介绍这个教程要解决什么问题',
      requirements: '列出需要的基础知识/工具',
      steps: '详细步骤说明',
      faq: '常见问题解答',
      conclusion: '总结学习成果'
    }
  },
  review: {
    name: '评测',
    structure: ['开篇', '外观设计', '功能体验', '优缺点', '结论'],
    sections: {
      intro: '评测对象简介',
      design: '外观/界面设计',
      features: '核心功能体验',
      proscons: '优缺点分析',
      conclusion: '是否推荐'
    }
  },
  opinion: {
    name: '观点',
    structure: ['观点陈述', '论据支持', '反驳可能的质疑', '结论'],
    sections: {
      statement: '明确表达观点',
      support: '提供论据/数据支持',
      counter: '反驳质疑',
      conclusion: '总结观点'
    }
  },
  news: {
    name: '新闻',
    structure: ['标题', '事件概述', '详细报道', '影响分析', '相关链接'],
    sections: {
      headline: '新闻标题',
      summary: '事件概述',
      detail: '详细报道',
      impact: '影响分析',
      links: '相关资源'
    }
  }
};

// 默认配置
const DEFAULT_CONFIG = {
  defaultTemplate: 'tutorial',
  defaultLength: 1500,
  includeToc: true,
  includeKeywords: true
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = {
      article_count: 0,
      template_usage: {},
      total_words: 0
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  }
  return DEFAULT_CONFIG;
}

// 生成标题
function generateTitle(topic, style = 'tutorial') {
  const templates = {
    tutorial: `【教程】${topic}完全指南`,
    review: `【评测】${topic}深度体验`,
    opinion: `【观点】为什么${topic}很重要`,
    news: `【资讯】${topic}最新动态`
  };
  return templates[style] || `关于${topic}的文章`;
}

// 生成目录
function generateToc(structure) {
  let toc = '## 目录\n\n';
  structure.forEach((item, index) => {
    toc += `${index + 1}. [${item}](#${item.toLowerCase()})\n`;
  });
  return toc;
}

// 生成章节内容
function generateSection(sectionName, context, words) {
  const templates = {
    '引言': `在本文中，我们将探讨${context.topic}。${context.description || ''}`,
    '前置要求': `在开始之前，您需要了解：\n\n- ${context.prerequisites || '基础知识'}`,
    '步骤详解': generateSteps(context.steps || [], words),
    '常见问题': generateFaq(context.faqs || [], context.topic),
    '总结': `通过本文，您已经了解了${context.topic}的核心内容。希望对您有所帮助！`,
    '开篇': `${context.subject}是一款值得关注的产品。`,
    '外观设计': `从外观来看，${context.subject}的设计具有以下特点：\n\n1. 简洁大方\n2. 做工精细`,
    '功能体验': `核心功能方面，${context.subject}表现如下：\n\n- 功能A：${context.featureA || '表现良好'}\n- 功能B：${context.featureB || '中规中矩'}`,
    '优缺点': `**优点：**\n${context.pros || '功能完善'}\n\n**缺点：**\n${context.cons || '价格偏高'}`,
    '结论': `综合来看，${context.subject}${context.verdict || '值得推荐'}`,
    '观点陈述': `${context.opinion || '这是一个值得深思的话题'}`,
    '论据支持': `有以下数据支持这个观点：\n\n${context.evidence || '数据来源...'}`,
    '反驳可能的质疑': `有人可能会问：${context.counter || '真的是这样吗？'}\n\n实际上，${context.rebuttal || '这是有据可查的'}`,
    '标题': `${context.headline || context.topic}`,
    '事件概述': `${context.summary || '近日，关于' + context.topic + '的消息引发关注'}`,
    '详细报道': `${context.details || '具体内容如下...'}`,
    '影响分析': `这一事件的影响包括：\n\n1. ${context.impact1 || '行业影响'}\n2. ${context.impact2 || '用户影响'}`,
    '相关链接': `- [更多信息](${context.link || '#'})`
  };
  
  return templates[sectionName] || generatePlaceholder(sectionName, words);
}

function generateSteps(steps, targetWords) {
  if (!steps || steps.length === 0) {
    return generatePlaceholder('步骤详解', targetWords);
  }
  
  let content = '';
  steps.forEach((step, index) => {
    content += `### 步骤${index + 1}: ${step.title || '步骤' + (index + 1)}\n\n`;
    content += `${step.description || '具体操作...'}\n\n`;
    if (step.code) {
      content += '```\n' + step.code + '\n```\n\n';
    }
  });
  
  return content;
}

function generateFaq(faqs, topic) {
  if (!faqs || faqs.length === 0) {
    return `### 常见问题\n\n**Q: ${topic}是什么？**\nA: 这是一个常见的问题...`;
  }
  
  let content = '### 常见问题\n\n';
  faqs.forEach((faq, index) => {
    content += `**Q: ${faq.q}**\nA: ${faq.a}\n\n`;
  });
  
  return content;
}

function generatePlaceholder(section, words) {
  return `${section}的内容正在撰写中...\n\n这是一个占位符，实际使用时会被替换为真实内容。`;
}

// 主生成函数
function write(topic, options = {}) {
  const config = loadConfig();
  const state = initState();
  
  const style = options.style || config.defaultTemplate;
  const template = TEMPLATES[style] || TEMPLATES.tutorial;
  const targetWords = options.words || config.defaultLength;
  
  const context = {
    topic,
    ...options.context
  };
  
  // 生成结构
  let article = `# ${options.title || generateTitle(topic, style)}\n\n`;
  
  // 添加元信息
  article += `> 文章作者：AI助手 | 创建时间：${new Date().toLocaleDateString('zh-CN')}\n\n`;
  
  // 添加目录
  if (config.includeToc) {
    article += generateToc(template.structure) + '\n\n---\n\n';
  }
  
  // 生成各章节
  const wordsPerSection = Math.floor(targetWords / template.structure.length);
  
  for (const section of template.structure) {
    article += `## ${section}\n\n`;
    article += generateSection(section, context, wordsPerSection);
    article += '\n\n---\n\n';
  }
  
  // 添加关键词
  if (config.includeKeywords && options.keywords) {
    article += `**关键词：** ${options.keywords.join('、')}\n\n`;
  }
  
  // 添加标签
  if (options.tags) {
    article += `**标签：** ${options.tags.map(t => `#${t}`).join(' ')}\n\n`;
  }
  
  // 更新状态
  state.article_count++;
  state.template_usage[style] = (state.template_usage[style] || 0) + 1;
  state.total_words += targetWords;
  saveState(state);
  
  return {
    success: true,
    title: options.title || generateTitle(topic, style),
    style: template.name,
    template: template.structure,
    content: article,
    stats: {
      words: targetWords,
      sections: template.structure.length
    }
  };
}

// 获取统计
function getStats() {
  return initState();
}

// 导出
module.exports = { write, getStats, TEMPLATES };
