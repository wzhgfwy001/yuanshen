// 【暗影摄怪】Shadow Craft - 小红书编辑

/**
 * 小红书编辑器技能
 * 生成小红书风格的文案
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ article_count: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 标题模板
const TITLE_TEMPLATES = [
  '{关键词}丨吐血整理！{数字}个{主题}',
  '{关键词}！这一篇就够了！',
  '救命！{关键词}也太绝了吧！',
  '{关键词}保姆级教程，建议收藏！',
  '挑战全网最全{关键词}攻略！'
];

// 生成标题
function generateTitle(topic, style = 'practical') {
  const templates = {
    practical: `{topic}丨吐血整理！这${Math.floor(Math.random() * 5) + 5}个要点`,
    interesting: `救命！{topic}也太绝了吧！`,
    tutorial: `{topic}保姆级教程，建议收藏！`,
    ranking: `挑战全网最全{topic}攻略！`
  };
  
  let template = templates[style] || templates.practical;
  return template.replace('{topic}', topic);
}

// 生成内容
function write(topic, options = {}) {
  const type = options.type || 'experience';
  const targetWords = options.words || 500;
  
  const templates = {
    experience: {
      prefix: ['今天来聊聊', '最近发现', '终于找到了'],
      content: [
        '作为一个{role}，我之前一直为{problem}烦恼。',
        '直到发现了这个{topic}，真的太绝了！',
        '用了大概{time}，效果真的{result}！',
        '特别是这几个点：\n1. {point1}\n2. {point2}\n3. {point3}'
      ],
      ending: ['姐妹们快冲！', '真的超推荐！', '有问题评论区见~']
    },
    tutorial: {
      prefix: ['保姆级教程来啦！', '超详细攻略，建议收藏！', '手把手教你'],
      content: [
        '{topic}其实很简单！',
        '第一步：{step1}\n第二步：{step2}\n第三步：{step3}',
        '重点来了：\n- {key1}\n- {key2}\n- {key3}'
      ],
      ending: ['有问题评论区问我！', '觉得有用就点个赞吧~', '收藏起来慢慢看！']
    },
    review: {
      prefix: ['真实测评！', '使用感受分享', '非广子放心看'],
      content: [
        '先说结论：{conclusion}',
        '优点：\n{pros}\n\n缺点：\n{cons}'
      ],
      ending: ['性价比：{rating}/5', '个人建议：{suggestion}']
    }
  };
  
  const template = templates[type] || templates.experience;
  
  // 随机选择开头和结尾
  const prefix = template.prefix[Math.floor(Math.random() * template.prefix.length)];
  const ending = template.ending[Math.floor(Math.random() * template.ending.length)];
  
  // 生成内容
  let content = `# ${generateTitle(topic)}\n\n`;
  content += `📍${prefix}\n\n`;
  content += template.content.join('\n\n').replace(/{topic}/g, topic);
  content += `\n\n✨${ending}`;
  
  // 添加emoji装饰
  content = addEmojis(content);
  
  // 添加标签
  if (options.tags) {
    content += '\n\n' + options.tags.map(t => `#${t}`).join(' ');
  }
  
  const state = initState();
  state.article_count++;
  saveState(state);
  
  return {
    success: true,
    title: generateTitle(topic),
    content,
    type,
    stats: {
      words: content.length,
      emojis: (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length
    }
  };
}

// 添加emoji装饰
function addEmojis(text) {
  const replacements = {
    '优点': '✅优点',
    '缺点': '❌缺点',
    '第一步': '🔜第一步',
    '第二步': '🔜第二步',
    '第三步': '🔜第三步',
    '重点': '⚠️重点',
    '建议': '💡建议',
    '总结': '📝总结',
    '收藏': '⭐收藏'
  };
  
  for (const [from, to] of Object.entries(replacements)) {
    text = text.replace(from, to);
  }
  
  return text;
}

// 生成系列选题
function generateSeries(topic, count = 5) {
  const series = [];
  const seriesTitles = {
    1: '入门篇',
    2: '进阶篇',
    3: '高阶篇',
    4: '实战篇',
    5: '终极篇'
  };
  
  for (let i = 1; i <= count; i++) {
    series.push({
      index: i,
      title: `${topic}丨${seriesTitles[i] || '第' + i + '篇'}`,
      outline: `这是${topic}系列第${i}篇`
    });
  }
  
  return series;
}

// 导出
module.exports = {
  write,
  generateTitle,
  generateSeries,
  addEmojis,
  getStats: () => initState()
};
