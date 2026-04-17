/**
 * tool-checker.js - 工具可用性检测模块
 * 
 * 提供工作流执行前的工具缺失检测能力
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'tool-registry.json');

/**
 * 加载工具注册表（带缓存）
 */
let _registryCache = null;
function loadRegistry() {
  if (_registryCache) return _registryCache;
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    _registryCache = JSON.parse(raw);
    return _registryCache;
  } catch (e) {
    console.error('[tool-checker] Failed to load registry:', e.message);
    return { tools: {}, builtinTools: [], pluginTools: {} };
  }
}

/**
 * 检测单个工具是否可用
 * 
 * @param {string} toolName - 工具名称
 * @param {Object} options - 检测选项
 * @param {string[]} [options.availableTools] - 当前可用的工具列表（从上下文传入）
 * @param {boolean} [options.checkPlugin=true] - 是否检测插件工具的插件可用性
 * @returns {Object} { available: boolean, reason?: string, registry?: Object }
 */
function checkToolAvailability(toolName, options = {}) {
  const { availableTools = null, checkPlugin = true } = options;
  const registry = loadRegistry();
  const toolEntry = registry.tools[toolName];

  // 内置工具 — 默认可用
  if (registry.builtinTools.includes(toolName)) {
    return { available: true, type: 'builtin', registry: toolEntry };
  }

  // 插件工具
  if (toolEntry && !toolEntry.builtin) {
    // 检查插件是否启用
    if (checkPlugin && availableTools !== null) {
      // availableTools 为空数组表示插件未加载
      if (!Array.isArray(availableTools) || availableTools.length === 0) {
        return {
          available: false,
          type: 'plugin',
          plugin: toolEntry.plugin,
          reason: `Plugin '${toolEntry.plugin}' is not loaded or has no available tools`,
          registry: toolEntry,
        };
      }
      if (!availableTools.includes(toolName)) {
        return {
          available: false,
          type: 'plugin',
          plugin: toolEntry.plugin,
          reason: `Tool '${toolName}' is not in the current available tools list`,
          registry: toolEntry,
        };
      }
    }
    return { available: true, type: 'plugin', plugin: toolEntry.plugin, registry: toolEntry };
  }

  // 未知工具
  return {
    available: false,
    type: 'unknown',
    reason: `Tool '${toolName}' is not found in the tool registry`,
    registry: null,
  };
}

/**
 * 批量检测多个工具的可用性
 * 
 * @param {string[]} toolNames - 工具名称数组
 * @param {Object} options - 同 checkToolAvailability
 * @returns {Object} { results: Record<string, Result>, allAvailable: boolean, missing: string[] }
 */
function checkToolsBatch(toolNames, options = {}) {
  const results = {};
  const missing = [];

  for (const name of toolNames) {
    const result = checkToolAvailability(name, options);
    results[name] = result;
    if (!result.available) {
      missing.push(name);
    }
  }

  return {
    results,
    allAvailable: missing.length === 0,
    missing,
  };
}

/**
 * 获取缺失工具的列表（仅返回名称）
 * 
 * @param {string[]} toolNames - 工具名称数组
 * @param {Object} options - 同 checkToolAvailability
 * @returns {string[]} 缺失的工具名称数组
 */
function getMissingTools(toolNames, options = {}) {
  const { results } = checkToolsBatch(toolNames, options);
  return Object.entries(results)
    .filter(([, v]) => !v.available)
    .map(([k]) => k);
}

/**
 * 按类别分组工具检测结果
 * 
 * @param {string[]} toolNames - 工具名称数组
 * @param {Object} options - 同 checkToolAvailability
 * @returns {Object} { builtin: string[], plugin: Object, unknown: string[] }
 */
function groupByType(toolNames, options = {}) {
  const { results } = checkToolsBatch(toolNames, options);
  const grouped = { builtin: [], plugin: {}, unknown: [] };

  for (const [name, result] of Object.entries(results)) {
    if (result.type === 'builtin') {
      grouped.builtin.push(name);
    } else if (result.type === 'plugin') {
      if (!grouped.plugin[result.plugin]) grouped.plugin[result.plugin] = [];
      grouped.plugin[result.plugin].push(name);
    } else {
      grouped.unknown.push(name);
    }
  }

  return grouped;
}

/**
 * 验证工作流所需的工具集合是否完整
 * 
 * @param {string[]} requiredTools - 工作流需要的工具列表
 * @param {Object} options - 同 checkToolAvailability
 * @returns {Object} { valid: boolean, missing: string[], report: string }
 */
function validateWorkflowTools(requiredTools, options = {}) {
  const { results, allAvailable, missing } = checkToolsBatch(requiredTools, options);
  const grouped = groupByType(requiredTools, options);

  let report = '';
  if (allAvailable) {
    report = `✅ 所有工具可用 (${requiredTools.length} 个)`;
  } else {
    report = `❌ 缺少 ${missing.length} 个工具:\n`;
    if (grouped.unknown.length > 0) {
      report += `  - 未知工具: ${grouped.unknown.join(', ')}\n`;
    }
    for (const [plugin, tools] of Object.entries(grouped.plugin)) {
      const unavailable = tools.filter(t => !results[t].available);
      if (unavailable.length > 0) {
        report += `  - 插件 '${plugin}' 下缺失: ${unavailable.join(', ')}\n`;
      }
    }
  }

  return {
    valid: allAvailable,
    missing,
    grouped,
    results,
    report,
  };
}

module.exports = {
  checkToolAvailability,
  checkToolsBatch,
  getMissingTools,
  groupByType,
  validateWorkflowTools,
  loadRegistry,
};
