// 【探测宝石】Find Gems - 数据分析

/**
 * 数据分析技能
 * 基础数据分析功能
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ analysis_count: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 计算基础统计
function calculateStats(data) {
  if (!Array.isArray(data)) {
    return { error: '数据必须是数组' };
  }
  
  const numbers = data.filter(v => typeof v === 'number');
  
  if (numbers.length === 0) {
    return { error: '数据中没有数字类型' };
  }
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((s, v) => s + v, 0);
  const mean = sum / numbers.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // 中位数
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
  
  // 方差和标准差
  const variance = numbers.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / numbers.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    count: numbers.length,
    sum,
    mean: Math.round(mean * 100) / 100,
    median,
    min,
    max,
    range: max - min,
    variance: Math.round(variance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100
  };
}

// 分组统计
function groupBy(data, keyOrFn) {
  const groups = {};
  
  for (const item of data) {
    const key = typeof keyOrFn === 'function' ? keyOrFn(item) : item[keyOrFn];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  
  return groups;
}

// 排序分析
function sortAnalysis(data, field, order = 'desc') {
  const sorted = [...data].sort((a, b) => {
    const aVal = typeof a[field] === 'number' ? a[field] : String(a[field]);
    const bVal = typeof b[field] === 'number' ? b[field] : String(b[field]);
    
    if (order === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
  });
  
  return sorted;
}

// Top N 分析
function topN(data, field, n = 10, order = 'desc') {
  const sorted = sortAnalysis(data, field, order);
  return sorted.slice(0, n);
}

// 数据验证
function validate(data, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    for (let i = 0; i < data.length; i++) {
      const value = data[i][field];
      
      if (rule.required && (value === undefined || value === null)) {
        errors.push({ row: i, field, error: '字段必填' });
      }
      
      if (rule.type && typeof value !== rule.type) {
        errors.push({ row: i, field, error: `类型错误，期望${rule.type}` });
      }
      
      if (rule.min !== undefined && value < rule.min) {
        errors.push({ row: i, field, error: `值小于最小值${rule.min}` });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({ row: i, field, error: `值大于最大值${rule.max}` });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    errorCount: errors.length
  };
}

// 主分析函数
function analyze(data, options = {}) {
  const state = initState();
  
  const result = {
    timestamp: new Date().toISOString(),
    dataPoints: data.length,
    stats: calculateStats(data),
    insights: []
  };
  
  // 如果指定了分组字段
  if (options.groupBy) {
    result.grouped = groupBy(data, options.groupBy);
    
    // 对每个分组计算统计
    result.groupStats = {};
    for (const [key, items] of Object.entries(result.grouped)) {
      result.groupStats[key] = calculateStats(items.map(v => v[options.valueField || 'value']));
    }
  }
  
  // Top N分析
  if (options.topN) {
    result.top = topN(data, options.sortField || 'value', options.topN);
  }
  
  // 生成洞察
  if (result.stats.mean) {
    result.insights.push(`平均值: ${result.stats.mean}`);
  }
  if (result.stats.median) {
    result.insights.push(`中位数: ${result.stats.median}`);
  }
  if (result.stats.stdDev) {
    result.insights.push(`标准差: ${result.stats.stdDev}`);
  }
  
  state.analysis_count++;
  saveState(state);
  
  return result;
}

// 导出
module.exports = { 
  analyze, 
  calculateStats, 
  groupBy, 
  sortAnalysis, 
  topN, 
  validate,
  getStats: () => initState()
};
