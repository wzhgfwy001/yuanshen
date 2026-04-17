// 【心灵缩减】Psyche Reduce - 上下文压缩

/**
 * 上下文分级压缩系统
 * 触发机制：根据上下文长度自动压缩
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// 默认配置
const DEFAULT_CONFIG = {
  enabled: true,
  version: "1.0.0",
  thresholds: {
    MICRO: 60,  // 60% 开始L1
    AUTO: 75,   // 75% 开始L2
    FULL: 90    // 90% 开始L3
  },
  keep_recent_turns: 5,
  summary_max_tokens: 500
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = {
      current_level: 0,
      last_compact_time: null,
      compact_count: 0,
      total_saved_tokens: 0
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

// 保存状态
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 加载配置
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  }
  return DEFAULT_CONFIG;
}

// 估算token数量（简单估算：中文≈2字符/token，英文≈4字符/token）
function estimateTokens(text) {
  if (!text) return 0;
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = (text.match(/[a-zA-Z]/g) || []).length;
  const other = text.length - chinese - english;
  return Math.ceil(chinese / 2 + english / 4 + other / 4);
}

// Level 1: MicroCompact（轻度压缩）
function microCompact(messages, config) {
  const compacted = [];
  
  for (const msg of messages) {
    // 保留角色信息
    const role = msg.role || 'user';
    let content = msg.content || '';
    
    // 删除重复确认
    if (content.includes('好的') || content.includes('好的，') || content.includes('明白了')) {
      if (content.length < 20) continue; // 跳过短确认
    }
    
    // 压缩长解释
    if (content.length > 200) {
      content = content.substring(0, 100) + '...[压缩]...' + content.substring(content.length - 50);
    }
    
    compacted.push({ role, content });
  }
  
  return compacted;
}

// Level 2: AutoCompact（自动压缩）
function autoCompact(messages, config) {
  const recent = messages.slice(-config.keep_recent_turns);
  const older = messages.slice(0, -config.keep_recent_turns);
  
  // 压缩旧消息为摘要
  const olderSummary = summarizeMessages(older);
  
  const compacted = [
    { role: 'system', content: `{{SUMMARY:\n${olderSummary}\n}}` }
  ].concat(recent);
  
  return compacted;
}

// Level 3: Full Compact（完全压缩）
function fullCompact(messages, config) {
  const summary = summarizeMessages(messages);
  
  return [
    { 
      role: 'system', 
      content: `{{FULL_COMPACT:\n${summary}\n}}`
    }
  ];
}

// 总结多条消息
function summarizeMessages(messages) {
  if (!messages || messages.length === 0) return '[无历史记录]';
  
  const summaryParts = [];
  
  // 按角色分组
  const byRole = {};
  for (const msg of messages) {
    const role = msg.role || 'unknown';
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(msg.content || '');
  }
  
  // 生成摘要
  for (const [role, contents] of Object.entries(byRole)) {
    const totalLength = contents.reduce((sum, c) => sum + c.length, 0);
    const count = contents.length;
    const preview = contents[contents.length - 1].substring(0, 100);
    
    summaryParts.push(`[${role}] 共${count}条消息，总计${totalLength}字符，最后一条: "${preview}..."`);
  }
  
  return summaryParts.join('\n');
}

// 计算上下文使用率
function calculateUsage(messages, maxTokens = 100000) {
  const fullText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const tokens = estimateTokens(fullText);
  const usage = Math.round((tokens / maxTokens) * 100);
  
  return {
    tokens,
    maxTokens,
    usage,
    level: getCompactLevel(usage)
  };
}

// 获取应该使用的压缩级别
function getCompactLevel(usage) {
  if (usage >= 90) return 3;
  if (usage >= 75) return 2;
  if (usage >= 60) return 1;
  return 0;
}

// 主压缩函数
function compact(messages, options = {}) {
  const config = loadConfig();
  const state = initState();
  
  // 计算当前使用率
  const usage = calculateUsage(messages);
  
  // 决定压缩级别
  let targetLevel = usage.level;
  if (options.forceLevel !== undefined) {
    targetLevel = options.forceLevel;
  }
  
  // 已经压缩过了，不再压缩
  if (state.current_level >= targetLevel) {
    return {
      already_compacted: true,
      current_level: state.current_level,
      messages
    };
  }
  
  let result;
  let savedTokens = 0;
  
  switch (targetLevel) {
    case 1:
      result = microCompact(messages, config);
      savedTokens = estimateTokens(messages.join('\n')) - estimateTokens(result.join('\n'));
      break;
    case 2:
      result = autoCompact(messages, config);
      savedTokens = Math.floor(estimateTokens(messages.join('\n')) * 0.4);
      break;
    case 3:
      result = fullCompact(messages, config);
      savedTokens = Math.floor(estimateTokens(messages.join('\n')) * 0.7);
      break;
    default:
      result = messages;
  }
  
  // 更新状态
  state.current_level = targetLevel;
  state.last_compact_time = Date.now();
  state.compact_count += 1;
  state.total_saved_tokens += savedTokens;
  saveState(state);
  
  return {
    success: true,
    from_level: state.current_level,
    to_level: targetLevel,
    saved_tokens: savedTokens,
    messages: result
  };
}

// 获取压缩状态
function getStatus() {
  const state = initState();
  const config = loadConfig();
  
  return {
    current_level: state.current_level,
    last_compact_time: state.last_compact_time,
    compact_count: state.compact_count,
    total_saved_tokens: state.total_saved_tokens,
    thresholds: config.thresholds
  };
}

// 重置压缩状态
function reset() {
  const state = initState();
  state.current_level = 0;
  saveState(state);
  return { success: true, message: '压缩状态已重置' };
}

// 导出模块
module.exports = {
  compact,
  getStatus,
  reset,
  calculateUsage,
  estimateTokens
};
