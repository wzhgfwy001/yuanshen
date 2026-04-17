/**
 * missing-tool-reporter.js - 缺失工具报告格式化模块
 * 
 * 格式化工具缺失报告，并提供替代方案建议
 * 
 * @version 1.0.0
 */

const path = require('path');
const { loadRegistry } = require('./tool-checker');

/**
 * 获取工具的替代方案
 * @param {string} toolName
 * @returns {Object|null}
 */
function getAlternative(toolName) {
  const registry = loadRegistry();
  return registry.alternatives[toolName] || null;
}

/**
 * 获取某类别的所有可用替代工具
 * @param {string} category - 工具类别
 * @returns {string[]}
 */
function getAlternativesByCategory(category) {
  const registry = loadRegistry();
  const { tools } = registry;
  return Object.entries(tools)
    .filter(([, t]) => t.category === category && t.builtin)
    .map(([name]) => name);
}

/**
 * 生成单个工具缺失的详细报告
 * @param {string} toolName
 * @param {Object} checkResult - tool-checker 的检测结果
 * @returns {string}
 */
function formatSingleMissingReport(toolName, checkResult) {
  let report = `🔴 **${toolName}**\n`;
  report += `   描述: ${checkResult.registry?.description || '未知'}\n`;
  report += `   类型: ${checkResult.type}\n`;

  if (checkResult.type === 'plugin') {
    report += `   插件: ${checkResult.plugin}\n`;
  }
  if (checkResult.reason) {
    report += `   原因: ${checkResult.reason}\n`;
  }

  const alt = getAlternative(toolName);
  if (alt && alt.fallback !== 'none') {
    report += `   💡 替代方案: ${alt.description}\n`;
    if (alt.fallback) {
      report += `   推荐: 使用 **${alt.fallback}** 替代\n`;
    }
  } else if (alt && alt.fallback === 'none') {
    report += `   ⚠️ 无替代方案 — 此功能需要对应工具\n`;
  }

  return report;
}

/**
 * 生成完整的缺失工具报告
 * @param {Object} validationResult - tool-checker.validateWorkflowTools 的结果
 * @param {Object} options
 * @param {boolean} [options.verbose=false] - 是否包含详细信息
 * @param {string} [options.format='markdown'] - 输出格式: markdown | text | json
 * @returns {string|Object}
 */
function formatMissingToolReport(validationResult, options = {}) {
  const { verbose = false, format = 'markdown' } = options;
  const { missing, results, grouped, valid } = validationResult;
  const registry = loadRegistry();

  if (valid) {
    return format === 'json'
      ? { valid: true, message: 'All tools available', count: validationResult.missing?.length || 0 }
      : '✅ 所有工具均可用，工作流可以正常执行';
  }

  if (format === 'json') {
    const jsonReport = {
      valid: false,
      totalMissing: missing.length,
      missing: missing.map(name => {
        const r = results[name];
        const alt = getAlternative(name);
        return {
          tool: name,
          type: r.type,
          plugin: r.plugin || null,
          reason: r.reason || null,
          description: registry.tools[name]?.description || null,
          alternative: alt ? { description: alt.description, fallback: alt.fallback } : null,
        };
      }),
      byCategory: {},
    };
    // 按类别分组
    for (const [name] of Object.entries(results)) {
      const cat = registry.tools[name]?.category || 'unknown';
      if (!jsonReport.byCategory[cat]) jsonReport.byCategory[cat] = [];
      if (!results[name].available) jsonReport.byCategory[cat].push(name);
    }
    return jsonReport;
  }

  // Markdown / Text 格式
  let report = `## ⚠️ 工具缺失报告\n\n`;
  report += `**缺失工具数:** ${missing.length} / ${Object.keys(results).length}\n\n`;

  // 按类型分组报告
  if (grouped.unknown.length > 0) {
    report += `### ❓ 未知工具\n`;
    for (const name of grouped.unknown) {
      report += `- \`${name}\` — 未在注册表中登记\n`;
    }
    report += `\n`;
  }

  const pluginMissing = {};
  for (const [name, result] of Object.entries(results)) {
    if (!result.available && result.type === 'plugin') {
      const p = result.plugin;
      if (!pluginMissing[p]) pluginMissing[p] = [];
      pluginMissing[p].push({ name, result });
    }
  }

  if (Object.keys(pluginMissing).length > 0) {
    report += `### 🔌 插件工具缺失\n`;
    for (const [plugin, entries] of Object.entries(pluginMissing)) {
      report += `**插件: ${plugin}**\n`;
      for (const { name, result } of entries) {
        report += formatSingleMissingReport(name, result);
      }
    }
  }

  // 批量替代建议
  const allMissingCategories = [...new Set(
    missing.map(n => registry.tools[n]?.category).filter(Boolean)
  )];

  if (allMissingCategories.length > 0 && verbose) {
    report += `\n### 💡 类别级替代建议\n`;
    for (const cat of allMissingCategories) {
      const alts = getAlternativesByCategory(cat);
      if (alts.length > 0) {
        report += `- 类别 **${cat}** 可用替代: \`${alts.join('`, `')}\`\n`;
      }
    }
  }

  // 操作建议
  report += `\n---\n**建议操作:**\n`;
  if (Object.keys(pluginMissing).length > 0) {
    const plugins = Object.keys(pluginMissing);
    report += `1. 安装/启用所需插件: ${plugins.join(', ')}\n`;
  }
  report += `2. 检查 OpenClaw 配置中的工具注册\n`;
  report += `3. 或调整工作流，使用可用的替代工具\n`;

  return report;
}

/**
 * 生成简洁的 diff 风格报告（适合嵌入日志）
 * @param {string[]} required - 需要的工具
 * @param {string[]} available - 当前可用的工具
 * @returns {string}
 */
function formatDiffReport(required, available) {
  const missing = required.filter(t => !available.includes(t));
  if (missing.length === 0) return '';

  let lines = ['[tool-detector] Missing tools:'];
  for (const t of missing) {
    const alt = getAlternative(t);
    const altLine = alt && alt.fallback ? ` (use: ${alt.fallback})` : '';
    lines.push(`  - ${t}${altLine}`);
  }
  return lines.join('\n');
}

module.exports = {
  getAlternative,
  getAlternativesByCategory,
  formatSingleMissingReport,
  formatMissingToolReport,
  formatDiffReport,
};
