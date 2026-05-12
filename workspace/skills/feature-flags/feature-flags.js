// 【通灵面板】Summon Inner Demons - 特性开关

/**
 * 特性开关系统
 * 触发机制：检查特性状态，控制功能启用
 */

const fs = require('fs');
const path = require('path');

const FLAGS_PATH = path.join(__dirname, 'brain', 'feature-flags.json');

// 确保brain目录存在
const brainDir = path.dirname(FLAGS_PATH);
if (!fs.existsSync(brainDir)) {
  fs.mkdirSync(brainDir, { recursive: true });
}

// 默认特性配置
const DEFAULT_FLAGS = {
  frustration_detector: {
    enabled: true,
    type: 'stable',
    description: '用户情绪感知与不满检测',
    version: '1.0.0',
    created: '2026-04-12'
  },
  context_compactor: {
    enabled: true,
    type: 'stable',
    description: '上下文分级压缩',
    version: '1.0.0',
    created: '2026-04-12'
  },
  task_typologist: {
    enabled: true,
    type: 'stable',
    description: '任务类型细化系统',
    version: '1.0.0',
    created: '2026-04-12'
  },
  feature_flags_system: {
    enabled: true,
    type: 'stable',
    description: '特性开关系统',
    version: '1.0.0',
    created: '2026-04-12'
  },
  auto_dream: {
    enabled: true,
    type: 'stable',
    description: '自动记忆整理（凌晨3点）',
    version: '1.0.0'
  },
  proactive_suggest: {
    enabled: false,
    type: 'experimental',
    description: '主动建议功能',
    version: '0.1.0',
    created: '2026-04-12'
  },
  voice_mode: {
    enabled: false,
    type: 'experimental',
    description: '语音交互模式',
    version: '0.1.0',
    created: '2026-04-12'
  },
  multi_agent_native: {
    enabled: true,
    type: 'stable',
    description: '原生多Agent协作'
  }
};

// 变更历史
let changeHistory = [];

// 加载特性配置
function loadFlags() {
  if (!fs.existsSync(FLAGS_PATH)) {
    fs.writeFileSync(FLAGS_PATH, JSON.stringify(DEFAULT_FLAGS, null, 2));
    return { ...DEFAULT_FLAGS };
  }
  return JSON.parse(fs.readFileSync(FLAGS_PATH, 'utf8'));
}

// 保存特性配置
function saveFlags(flags) {
  fs.writeFileSync(FLAGS_PATH, JSON.stringify(flags, null, 2));
}

// 检查特性是否启用
function isEnabled(featureName) {
  const flags = loadFlags();
  return flags[featureName]?.enabled === true;
}

// 获取特性信息
function getFeature(featureName) {
  const flags = loadFlags();
  return flags[featureName] || null;
}

// 获取所有特性
function getAllFeatures(options = {}) {
  const flags = loadFlags();
  let result = { ...flags };
  
  // 按类型过滤
  if (options.type) {
    for (const [name, feature] of Object.entries(result)) {
      if (feature.type !== options.type) {
        delete result[name];
      }
    }
  }
  
  // 只显示启用的
  if (options.enabledOnly) {
    for (const [name, feature] of Object.entries(result)) {
      if (!feature.enabled) {
        delete result[name];
      }
    }
  }
  
  return result;
}

// 启用特性
function enable(featureName, reason = '') {
  const flags = loadFlags();
  
  if (!flags[featureName]) {
    return { success: false, error: `特性 ${featureName} 不存在` };
  }
  
  if (flags[featureName].enabled) {
    return { success: true, message: `特性 ${featureName} 已经是启用状态` };
  }
  
  flags[featureName].enabled = true;
  saveFlags(flags);
  
  // 记录变更
  changeHistory.push({
    date: new Date().toISOString(),
    feature: featureName,
    action: 'enabled',
    reason
  });
  
  return { success: true, message: `特性 ${featureName} 已启用`, feature: flags[featureName] };
}

// 禁用特性
function disable(featureName, reason = '') {
  const flags = loadFlags();
  
  if (!flags[featureName]) {
    return { success: false, error: `特性 ${featureName} 不存在` };
  }
  
  if (!flags[featureName].enabled) {
    return { success: true, message: `特性 ${featureName} 已经是禁用状态` };
  }
  
  flags[featureName].enabled = false;
  saveFlags(flags);
  
  // 记录变更
  changeHistory.push({
    date: new Date().toISOString(),
    feature: featureName,
    action: 'disabled',
    reason
  });
  
  return { success: true, message: `特性 ${featureName} 已禁用`, feature: flags[featureName] };
}

// 切换特性状态
function toggle(featureName, reason = '') {
  if (isEnabled(featureName)) {
    return disable(featureName, reason);
  } else {
    return enable(featureName, reason);
  }
}

// 添加新特性
function addFeature(featureName, config = {}) {
  const flags = loadFlags();
  
  if (flags[featureName]) {
    return { success: false, error: `特性 ${featureName} 已存在` };
  }
  
  flags[featureName] = {
    enabled: config.enabled || false,
    type: config.type || 'experimental',
    description: config.description || '',
    version: config.version || '0.1.0',
    created: new Date().toISOString().split('T')[0]
  };
  
  saveFlags(flags);
  
  return { success: true, message: `特性 ${featureName} 已添加`, feature: flags[featureName] };
}

// 获取变更历史
function getHistory(limit = 10) {
  return changeHistory.slice(-limit);
}

// 重置到默认配置
function resetToDefault() {
  saveFlags(DEFAULT_FLAGS);
  changeHistory = [];
  return { success: true, message: '已重置为默认配置', flags: DEFAULT_FLAGS };
}

// 获取统计信息
function getStats() {
  const flags = loadFlags();
  
  const stats = {
    total: Object.keys(flags).length,
    enabled: 0,
    disabled: 0,
    byType: {}
  };
  
  for (const [name, feature] of Object.entries(flags)) {
    if (feature.enabled) stats.enabled++;
    else stats.disabled++;
    
    const type = feature.type || 'unknown';
    if (!stats.byType[type]) stats.byType[type] = { total: 0, enabled: 0 };
    stats.byType[type].total++;
    if (feature.enabled) stats.byType[type].enabled++;
  }
  
  return stats;
}

// 导出模块
module.exports = {
  isEnabled,
  getFeature,
  getAllFeatures,
  enable,
  disable,
  toggle,
  addFeature,
  getHistory,
  resetToDefault,
  getStats,
  DEFAULT_FLAGS
};
