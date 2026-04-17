// 【感知恶魔】Sense Demons - 情绪感知与不满检测

/**
 * 情绪感知与用户不满检测系统
 * 触发机制：检测用户负面信号，自动调整响应策略
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, 'state.json');

// 负面信号模式（正则）
const NEGATIVE_PATTERNS = [
  /不对|不是|错了|重来|重新/,
  /太慢|等好久|卡|慢死了/,
  /听不懂|说清楚|解释一下|啥意思/,
  /不满意|不好用|没用|废物|垃圾/,
  /算了|不做了|不要了|滚/,
  /为什么|怎么又|总是|每次都/
];

// 高权重负面信号
const HIGH_WEIGHT_PATTERNS = [
  /生气|发火|愤怒|恼火/,
  /投诉|举报|差评/,
  /!!!|！！|！！！/
];

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = {
      negative_count: 0,
      consecutive_failures: 0,
      last_negative_time: null,
      last_failure_time: null,
      signal_history: [],
      reset_timer: 300000, // 5分钟
      level: 0,
      recent_task_ids: [] // 防循环：最近处理过的任务ID
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

// 检查任务是否刚处理过（防循环）
function isTaskRecentlyProcessed(state, taskId) {
  if (!taskId) return false;
  const MAX_RECENT_TASKS = 10;
  const CYCLE_THRESHOLD_MS = 60000; // 1分钟内同一任务不重复处理
  
  const recent = state.recent_task_ids.filter(
    t => t.id === taskId && (Date.now() - t.time) < CYCLE_THRESHOLD_MS
  );
  return recent.length > 0;
}

// 记录任务处理（防循环）
function markTaskProcessed(state, taskId) {
  if (!taskId) return state;
  const MAX_RECENT_TASKS = 10;
  state.recent_task_ids.push({ id: taskId, time: Date.now() });
  if (state.recent_task_ids.length > MAX_RECENT_TASKS) {
    state.recent_task_ids = state.recent_task_ids.slice(-MAX_RECENT_TASKS);
  }
  return state;
}

// 保存状态
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 检查是否需要重置（5分钟无负面信号）
function checkReset(state) {
  if (state.last_negative_time) {
    const elapsed = Date.now() - state.last_negative_time;
    if (elapsed > state.reset_timer) {
      state.negative_count = 0;
      state.consecutive_failures = 0;
      state.level = 0;
      state.signal_history = [];
    }
  }
  return state;
}

// 检测消息中的负面信号
function detectNegativeSignals(message) {
  let score = 0;
  const signals = [];
  
  // 检查高权重信号
  for (const pattern of HIGH_WEIGHT_PATTERNS) {
    if (pattern.test(message)) {
      score += 2;
      signals.push({ type: 'high_weight', pattern: pattern.source, score: 2 });
    }
  }
  
  // 检查普通负面信号
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(message)) {
      score += 1;
      signals.push({ type: 'negative', pattern: pattern.source, score: 1 });
    }
  }
  
  // 检查感叹号（激动情绪）
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount >= 2) {
    score += 1;
    signals.push({ type: 'excitement', count: exclamationCount, score: 1 });
  }
  
  return { score, signals };
}

// 记录失败任务
function recordFailure(state) {
  state.consecutive_failures += 1;
  state.last_failure_time = Date.now();
  state.negative_count += 2; // 失败权重更高
  return state;
}

// 计算情绪等级
function calculateLevel(score, consecutiveFailures) {
  const totalScore = score + (consecutiveFailures * 2);
  
  if (totalScore >= 5) return 3; // 严重不满
  if (totalScore >= 3) return 2; // 中度不满
  if (totalScore >= 1) return 1; // 轻微
  return 0; // 正常
}

// 获取响应策略
function getResponseStrategy(level) {
  const strategies = {
    0: {
      level: 'normal',
      tone: 'normal',
      message: null
    },
    1: {
      level: 'light',
      tone: 'gentle',
      message: '我理解可能没有完全符合预期，让我重新理解一下您的需求'
    },
    2: {
      level: 'medium',
      tone: 'apologetic',
      message: '抱歉让您费心了，能具体说说哪里不符合预期吗？我会更努力地帮助您'
    },
    3: {
      level: 'severe',
      tone: 'deeply_apologetic',
      message: '非常抱歉给您带来困扰。我理解这件事对您很重要，让我换一种方式来处理这个问题'
    }
  };
  return strategies[level];
}

// 主检测函数
function detect(message, options = {}) {
  const state = checkReset(initState());
  
  // 防循环检查
  if (options.taskId && isTaskRecentlyProcessed(state, options.taskId)) {
    return {
      level: state.level,
      strategy: getResponseStrategy(state.level),
      state: { negative_count: state.negative_count, consecutive_failures: state.consecutive_failures },
      signals: [],
      skipped: true,
      reason: 'task_recently_processed'
    };
  }
  
  // 检测负面信号
  const { score, signals } = detectNegativeSignals(message);
  
  // 记录失败
  if (options.failure) {
    recordFailure(state);
  }
  
  // 更新状态
  if (score > 0 || options.failure) {
    state.negative_count += score;
    state.last_negative_time = Date.now();
    state.signal_history.push({
      time: Date.now(),
      message: message.substring(0, 50),
      score,
      signals
    });
    
    // 只保留最近10条记录
    if (state.signal_history.length > 10) {
      state.signal_history = state.signal_history.slice(-10);
    }
  }
  
  // 计算等级
  state.level = calculateLevel(state.negative_count, state.consecutive_failures);
  
  // 获取策略
  const strategy = getResponseStrategy(state.level);
  
  // 标记任务已处理（防循环）
  if (options.taskId) {
    markTaskProcessed(state, options.taskId);
  }
  
  // 保存状态
  saveState(state);
  
  return {
    level: state.level,
    strategy,
    state: {
      negative_count: state.negative_count,
      consecutive_failures: state.consecutive_failures
    },
    signals
  };
}

// 重置状态
function reset() {
  const state = initState();
  state.negative_count = 0;
  state.consecutive_failures = 0;
  state.level = 0;
  state.signal_history = [];
  saveState(state);
  return { success: true, message: '情绪状态已重置' };
}

// 获取当前状态
function getStatus() {
  const state = initState();
  const strategy = getResponseStrategy(state.level);
  return {
    level: state.level,
    strategy,
    state: {
      negative_count: state.negative_count,
      consecutive_failures: state.consecutive_failures,
      last_negative_time: state.last_negative_time,
      recent_signals: state.signal_history.slice(-3)
    }
  };
}

// 导出模块
module.exports = {
  detect,
  reset,
  getStatus,
  getResponseStrategy,
  isTaskRecentlyProcessed,
  markTaskProcessed
};
