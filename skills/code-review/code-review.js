// 【寻找弱点】Expose Weakness - 代码审查

/**
 * 代码审查技能
 * 自动审查代码质量、风格、安全问题
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// 代码问题模式
const ISSUE_PATTERNS = {
  security: [
    { pattern: /eval\s*\(/, severity: 'high', message: '避免使用eval' },
    { pattern: /innerHTML\s*=/, severity: 'high', message: 'XSS风险：使用textContent替代innerHTML' },
    { pattern: /password\s*=\s*['"][^'"]+['"]/, severity: 'high', message: '硬编码密码风险' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'high', message: '硬编码API Key风险' },
    { pattern: /TODO|FIXME|HACK/, severity: 'low', message: '存在未完成标记' }
  ],
  style: [
    { pattern: /;\s*$/, severity: 'info', message: '行尾分号' },
    { pattern: /==(?!=)/, severity: 'warning', message: '使用===替代==' },
    { pattern: /var\s+\w+/, severity: 'info', message: '建议使用const/let' }
  ],
  performance: [
    { pattern: /for\s*\(\s*let\s+\w+\s+=\s+0\s*;\s*\w+\s*<\s*\w+\.length/, severity: 'warning', message: '考虑缓存length属性' },
    { pattern: /document\.getElementById.*document\.getElementById/s, severity: 'warning', message: '重复DOM查询' }
  ]
};

// 审查规则
const RULES = {
  maxLineLength: 120,
  maxFunctionLength: 50,
  requireErrorHandling: true,
  requireLogging: true
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = {
      review_count: 0,
      issues_found: { high: 0, warning: 0, info: 0 },
      last_review_time: null
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 加载配置
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
  return RULES;
}

// 审查代码
function review(code, options = {}) {
  const config = loadConfig();
  const state = initState();
  
  const result = {
    timestamp: new Date().toISOString(),
    language: options.language || 'javascript',
    issues: [],
    stats: { high: 0, warning: 0, info: 0 },
    score: 100,
    passed: true
  };
  
  // 安全问题检查
  for (const issue of ISSUE_PATTERNS.security) {
    const matches = code.match(new RegExp(issue.pattern, 'g'));
    if (matches) {
      for (const match of matches) {
        result.issues.push({
          type: 'security',
          severity: issue.severity,
          message: issue.message,
          code: match.substring(0, 50),
          line: findLineNumber(code, match)
        });
        result.stats[issue.severity]++;
      }
    }
  }
  
  // 风格检查
  for (const issue of ISSUE_PATTERNS.style) {
    const matches = code.match(new RegExp(issue.pattern, 'g'));
    if (matches) {
      for (const match of matches) {
        result.issues.push({
          type: 'style',
          severity: issue.severity,
          message: issue.message,
          code: match.substring(0, 50),
          line: findLineNumber(code, match)
        });
        result.stats[issue.severity]++;
      }
    }
  }
  
  // 性能检查
  for (const issue of ISSUE_PATTERNS.performance) {
    const matches = code.match(new RegExp(issue.pattern, 'g'));
    if (matches) {
      for (const match of matches) {
        result.issues.push({
          type: 'performance',
          severity: issue.severity,
          message: issue.message,
          code: match.substring(0, 50),
          line: findLineNumber(code, match)
        });
        result.stats[issue.severity]++;
      }
    }
  }
  
  // 行长度检查
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    if (line.length > config.maxLineLength) {
      result.issues.push({
        type: 'style',
        severity: 'info',
        message: `行过长(${line.length}字符)`,
        line: index + 1
      });
      result.stats.info++;
    }
  });
  
  // 计算评分
  const deduction = result.stats.high * 10 + result.stats.warning * 3 + result.stats.info;
  result.score = Math.max(0, 100 - deduction);
  result.passed = result.stats.high === 0;
  
  // 更新状态
  state.review_count++;
  state.last_review_time = Date.now();
  state.issues_found.high += result.stats.high;
  state.issues_found.warning += result.stats.warning;
  state.issues_found.info += result.stats.info;
  saveState(state);
  
  return result;
}

// 查找行号
function findLineNumber(code, match) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 0;
}

// 获取统计
function getStats() {
  return initState();
}

// 导出
module.exports = { review, getStats };
