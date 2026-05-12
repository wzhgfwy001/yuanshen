/**
 * LessonQuerier - 教训查询器
 * 
 * 功能：根据任务上下文主动查询brain/lessons/中的相关教训
 * 
 * 使用方式：
 * const querier = require('./lesson-querier.js');
 * const lessons = querier.queryByContext(taskType, context);
 */

const fs = require('fs');
const path = require('path');

// 教训目录
const LESSONS_DIR = path.join(process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace', 'brain', 'lessons');

/**
 * 查询与任务相关的教训
 * @param {string} taskType - 任务类型（如: code_review, data_analysis, writing等）
 * @param {object} context - 任务上下文 { tool, command, environment, keywords }
 * @returns {array} 匹配的教训列表
 */
function queryByContext(taskType, context = {}) {
  const allLessons = loadAllLessons();
  if (allLessons.length === 0) {
    return [];
  }
  
  // 按相关性排序
  const scored = allLessons.map(lesson => ({
    lesson,
    score: calculateRelevance(lesson, taskType, context)
  })).filter(item => item.score > 0);
  
  // 按相关性降序
  scored.sort((a, b) => b.score - a.score);
  
  return scored.map(item => item.lesson);
}

/**
 * 查询特定类型的教训
 * @param {string} taskType - 任务类型
 * @returns {array} 该类型的教训
 */
function queryByType(taskType) {
  const allLessons = loadAllLessons();
  return allLessons.filter(l => {
    const ctx = l.context || {};
    return ctx.taskType === taskType || ctx.category === taskType;
  });
}

/**
 * 查询高影响教训（用于预检）
 * @param {number} minImpact - 最低影响分数（默认7）
 * @returns {array} 高影响教训
 */
function queryHighImpact(minImpact = 7) {
  const allLessons = loadAllLessons();
  return allLessons.filter(l => {
    const impact = l.impactScope || l.impact || 0;
    return impact >= minImpact;
  });
}

/**
 * 加载所有教训文件
 * @returns {array} 教训列表
 */
function loadAllLessons() {
  const lessons = [];
  
  try {
    if (!fs.existsSync(LESSONS_DIR)) {
      console.log('[LessonQuerier] 教训目录不存在:', LESSONS_DIR);
      return lessons;
    }
    
    const files = fs.readdirSync(LESSONS_DIR);
    for (const file of files) {
      // 支持多种文件命名规则：
      // 1. lesson_*.md (原有)
      // 2. *-failure.md (日期-名称-failure.md)
      // 3. *-playwright*.md (其他失败记录)
      // 4. README.md (跳过)
      if (file === 'README.md') continue;
      
      const isLessonFile = (
        (file.startsWith('lesson_') && file.endsWith('.md')) ||
        (file.includes('-failure') && file.endsWith('.md')) ||
        (file.includes('-error') && file.endsWith('.md')) ||
        (file.includes('-mcp-failure') && file.endsWith('.md'))
      );
      
      if (isLessonFile) {
        const content = fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8');
        const lesson = parseLesson(content, file);
        if (lesson) {
          lessons.push(lesson);
        }
      }
    }
  } catch (e) {
    console.error('[LessonQuerier] 加载教训失败:', e.message);
  }
  
  return lessons;
}

/**
 * 解析教训文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @returns {object|null} 教训对象
 */
function parseLesson(content, filename) {
  try {
    const lines = content.split('\n');
    const lesson = {
      filename,
      raw: content
    };
    
    for (const line of lines) {
      if (line.startsWith('## 错误信息')) {
        lesson.errorMessage = line.replace('## 错误信息', '').trim();
      } else if (line.startsWith('## 根因')) {
        lesson.rootCause = line.replace('## 根因', '').trim();
      } else if (line.startsWith('## 发生场景')) {
        // 解析场景块
        const sceneContent = [];
        let i = lines.indexOf(line) + 1;
        while (i < lines.length && lines[i].startsWith('## ') === false) {
          if (lines[i].trim()) sceneContent.push(lines[i].trim());
          i++;
        }
        lesson.context = sceneContent.join(' ');
      } else if (line.startsWith('## 避免方式')) {
        const avoidContent = [];
        let i = lines.indexOf(line) + 1;
        while (i < lines.length && lines[i].startsWith('## ') === false) {
          if (lines[i].trim()) avoidContent.push(lines[i].trim());
          i++;
        }
        lesson.resolution = avoidContent;
      } else if (line.startsWith('## 影响范围')) {
        const match = line.match(/(\d+)\/10/);
        if (match) {
          lesson.impactScope = parseInt(match[1]);
        }
      }
    }
    
    // 从文件名提取时间戳
    const timestampMatch = filename.match(/lesson_(\d+)/);
    if (timestampMatch) {
      lesson.timestamp = parseInt(timestampMatch[1]);
    }
    
    // 如果没有解析出内容但有原始内容，设置默认值
    if (!lesson.errorMessage && content.length > 0) {
      lesson.errorMessage = content.substring(0, 100);
    }
    
    return lesson;
  } catch (e) {
    console.error('[LessonQuerier] 解析教训失败:', filename, e.message);
    return null;
  }
}

/**
 * 计算教训与当前任务的相关性
 * @param {object} lesson - 教训对象
 * @param {string} taskType - 任务类型
 * @param {object} context - 上下文
 * @returns {number} 相关性分数 (0-1)
 */
function calculateRelevance(lesson, taskType, context) {
  let score = 0;
  
  // 1. 任务类型匹配
  if (lesson.context) {
    const ctx = lesson.context.toLowerCase();
    const type = taskType.toLowerCase();
    if (ctx.includes(type)) {
      score += 0.4;
    }
  }
  
  // 2. 工具匹配
  if (context.tool && lesson.context) {
    const tool = context.tool.toLowerCase();
    if (lesson.context.includes(tool)) {
      score += 0.3;
    }
  }
  
  // 3. 环境匹配
  if (context.environment && lesson.context) {
    const env = context.environment.toLowerCase();
    if (lesson.context.includes(env)) {
      score += 0.2;
    }
  }
  
  // 4. 关键词匹配
  if (context.keywords && lesson.context) {
    const keywords = Array.isArray(context.keywords) ? context.keywords : [context.keywords];
    for (const kw of keywords) {
      if (lesson.context.includes(kw.toLowerCase())) {
        score += 0.1;
        if (score >= 0.5) break;
      }
    }
  }
  
  return Math.min(score, 1);
}

/**
 * 获取教训统计
 * @returns {object} 统计信息
 */
function getStats() {
  const lessons = loadAllLessons();
  const byType = {};
  const byImpact = { high: 0, medium: 0, low: 0 };
  
  for (const lesson of lessons) {
    // 分类统计
    const ctx = lesson.context || '';
    for (const type of ['code_review', 'writing', 'analysis', 'system', 'general']) {
      if (ctx.includes(type)) {
        byType[type] = (byType[type] || 0) + 1;
      }
    }
    
    // 影响统计
    const impact = lesson.impactScope || 0;
    if (impact >= 7) byImpact.high++;
    else if (impact >= 4) byImpact.medium++;
    else byImpact.low++;
  }
  
  return {
    total: lessons.length,
    byType,
    byImpact,
    latestUpdate: lessons.length > 0 ? lessons[lessons.length - 1].timestamp : null
  };
}

module.exports = {
  queryByContext,
  queryByType,
  queryHighImpact,
  getStats,
  loadAllLessons
};

// 测试
if (require.main === module) {
  console.log('=== LessonQuerier Test ===\n');
  
  // 测试查询
  console.log('--- 按类型查询 (code_review) ---');
  const codeLessons = queryByType('code_review');
  console.log(`找到 ${codeLessons.length} 条教训`);
  
  console.log('\n--- 高影响教训 (≥7) ---');
  const highImpact = queryHighImpact(7);
  console.log(`找到 ${highImpact.length} 条高影响教训`);
  highImpact.forEach(l => {
    console.log(`  [${l.impactScope}/10] ${l.errorMessage?.substring(0, 50)}`);
  });
  
  console.log('\n--- 按上下文查询 ---');
  const relevant = queryByContext('writing', { tool: 'exec', keywords: ['npm', 'install'] });
  console.log(`找到 ${relevant.length} 条相关教训`);
  
  console.log('\n--- 统计 ---');
  console.log(getStats());
}