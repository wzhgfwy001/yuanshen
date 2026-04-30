/**
 * Skill Evolution Analyzer - 技能进化分析器
 * 
 * 功能：
 * - 分析任务执行经验
 * - 判断是否需要固化流程
 * - 当执行次数≥3次时，提示可固化
 * - 更新brain/patterns/目录
 * - 成功3次的流程固化为可复用Skill
 * 
 * 使用方式：
 * const { analyzeExecution, shouldEvolve, evolveToSkill, getEvolutionSuggestions } = require('./skill-evolution-analyzer');
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const WORKSPACE_ROOT = path.join(__dirname, '..', '..', '..', '..', '..');
const BRAIN_PATTERNS_PATH = path.join(WORKSPACE_ROOT, 'brain', 'patterns');
const SKILL_EVOLUTION_DIR = __dirname;

// 确保目录存在
if (!fs.existsSync(BRAIN_PATTERNS_PATH)) {
  fs.mkdirSync(BRAIN_PATTERNS_PATH, { recursive: true });
}

// ============================================================
// 执行记录管理
// ============================================================

const EXECUTION_LOG_PATH = path.join(SKILL_EVOLUTION_DIR, 'execution-log.json');

/**
 * 加载执行日志
 */
function loadExecutionLog() {
  try {
    if (fs.existsSync(EXECUTION_LOG_PATH)) {
      const data = fs.readFileSync(EXECUTION_LOG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[SkillEvolution] Failed to load execution log:', e.message);
  }
  return {
    executions: [],
    patterns: {},
    evolutions: []
  };
}

/**
 * 保存执行日志
 */
function saveExecutionLog(log) {
  try {
    fs.writeFileSync(EXECUTION_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.error('[SkillEvolution] Failed to save execution log:', e.message);
  }
}

// ============================================================
// 核心分析函数
// ============================================================

/**
 * 分析执行结果
 * @param {string} taskId - 任务ID
 * @param {boolean} success - 是否成功
 * @param {Object} context - 执行上下文
 * @returns {Object} - 分析结果
 */
function analyzeExecution(taskId, success, context = {}) {
  const log = loadExecutionLog();
  
  const entry = {
    taskId,
    success,
    timestamp: new Date().toISOString(),
    context: {
      taskType: context.taskType || 'unknown',
      category: context.category || null,
      agentName: context.agentName || null,
      duration: context.duration || null,
      steps: context.steps || [],
      result: context.result || null,
      error: context.error || null,
      metadata: context.metadata || {}
    }
  };
  
  log.executions.push(entry);
  
  // 更新任务类型的统计
  const taskType = context.taskType || 'unknown';
  if (!log.patterns[taskType]) {
    log.patterns[taskType] = {
      taskType,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      avgDuration: 0,
      lastExecution: null,
      evolutionCandidates: []
    };
  }
  
  const pattern = log.patterns[taskType];
  pattern.totalExecutions++;
  if (success) {
    pattern.successfulExecutions++;
  } else {
    pattern.failedExecutions++;
  }
  pattern.successRate = pattern.successfulExecutions / pattern.totalExecutions;
  pattern.lastExecution = entry.timestamp;
  
  // 更新平均执行时间
  if (context.duration) {
    const prevTotal = pattern.avgDuration * (pattern.totalExecutions - 1);
    pattern.avgDuration = (prevTotal + context.duration) / pattern.totalExecutions;
  }
  
  // 检查是否应该进化
  const shouldEvolveResult = shouldEvolve(taskType, pattern.totalExecutions);
  
  if (shouldEvolveResult.canEvolve) {
    // 添加到进化候选
    if (!pattern.evolutionCandidates.find(c => c.taskType === taskType)) {
      pattern.evolutionCandidates.push({
        taskType,
        successCount: pattern.successfulExecutions,
        trigger: 'success_threshold',
        suggestedAt: new Date().toISOString(),
        reason: `成功执行${pattern.successfulExecutions}次，成功率${(pattern.successRate * 100).toFixed(1)}%`
      });
    }
  }
  
  saveExecutionLog(log);
  
  const result = {
    taskId,
    taskType,
    success,
    analyzed: true,
    pattern: {
      totalExecutions: pattern.totalExecutions,
      successfulExecutions: pattern.successfulExecutions,
      successRate: pattern.successRate,
      avgDuration: pattern.avgDuration
    },
    evolution: shouldEvolveResult
  };
  
  console.log(`[SkillEvolution] Analyzed execution: ${taskId} | ${success ? 'SUCCESS' : 'FAIL'} | ${taskType} | evolution: ${shouldEvolveResult.canEvolve}`);
  
  return result;
}

/**
 * 判断是否应该进化
 * @param {string} taskType - 任务类型
 * @param {number} successCount - 成功次数（可选，从日志获取）
 * @returns {Object} - 进化建议
 */
function shouldEvolve(taskType, successCount) {
  const log = loadExecutionLog();
  const pattern = log.patterns[taskType];
  
  // 如果没有记录，返回默认值
  if (!pattern) {
    return {
      canEvolve: false,
      reason: 'no_execution_history',
      currentCount: 0,
      requiredCount: 3
    };
  }
  
  const currentCount = pattern.successfulExecutions;
  const successRate = pattern.successRate;
  
  // 条件：成功次数 >= 3 且 成功率 >= 70%
  const canEvolve = currentCount >= 3 && successRate >= 0.7;
  
  let reason;
  if (currentCount < 3) {
    reason = `success_count_insufficient: ${currentCount}/3`;
  } else if (successRate < 0.7) {
    reason = `success_rate_low: ${(successRate * 100).toFixed(1)}% < 70%`;
  } else {
    reason = 'ready_for_evolution';
  }
  
  return {
    canEvolve,
    reason,
    currentCount,
    requiredCount: 3,
    successRate: successRate,
    confidence: calculateConfidence(pattern)
  };
}

/**
 * 计算进化置信度
 */
function calculateConfidence(pattern) {
  if (!pattern || pattern.totalExecutions < 3) return 0;
  
  // 基于执行次数和成功率计算置信度
  const executionScore = Math.min(1, pattern.totalExecutions / 10); // 最多10次
  const successScore = pattern.successRate;
  const recencyBonus = getRecencyBonus(pattern.lastExecution);
  
  return Math.min(1, (executionScore * 0.4 + successScore * 0.4 + recencyBonus * 0.2));
}

/**
 * 获取时间衰减因子
 */
function getRecencyBonus(lastExecution) {
  if (!lastExecution) return 0;
  
  const daysSince = (Date.now() - new Date(lastExecution).getTime()) / 86400000;
  
  if (daysSince <= 1) return 1;
  if (daysSince <= 7) return 0.8;
  if (daysSince <= 30) return 0.5;
  return 0.2;
}

// ============================================================
// 技能固化
// ============================================================

/**
 * 固化为Skill
 * @param {Object} taskPattern - 任务模式
 * @returns {Object} - 固化结果
 */
async function evolveToSkill(taskPattern) {
  const log = loadExecutionLog();
  
  if (!taskPattern || !taskPattern.taskType) {
    throw new Error('Invalid task pattern: missing taskType');
  }
  
  const pattern = log.patterns[taskPattern.taskType];
  
  if (!pattern) {
    throw new Error(`No pattern found for taskType: ${taskPattern.taskType}`);
  }
  
  if (!shouldEvolve(taskPattern.taskType).canEvolve) {
    throw new Error(`Pattern ${taskPattern.taskType} does not meet evolution criteria`);
  }
  
  // 生成Skill内容
  const skillContent = generateSkillContent(pattern, taskPattern);
  
  // 保存Skill文件
  const skillName = toSkillName(taskPattern.taskType);
  const skillPath = path.join(BRAIN_PATTERNS_PATH, `${skillName}.md`);
  
  fs.writeFileSync(skillPath, skillContent, 'utf8');
  
  // 记录进化历史
  const evolution = {
    id: `evo_${Date.now()}`,
    taskType: taskPattern.taskType,
    skillName,
    skillPath,
    evolvedAt: new Date().toISOString(),
    pattern: {
      totalExecutions: pattern.totalExecutions,
      successfulExecutions: pattern.successfulExecutions,
      successRate: pattern.successRate,
      avgDuration: pattern.avgDuration
    },
    successCount: pattern.successfulExecutions
  };
  
  log.evolutions.push(evolution);
  
  // 从候选中移除
  if (pattern.evolutionCandidates) {
    pattern.evolutionCandidates = pattern.evolutionCandidates.filter(
      c => c.taskType !== taskPattern.taskType
    );
  }
  
  saveExecutionLog(log);
  
  console.log(`[SkillEvolution] Evolved ${taskPattern.taskType} to skill: ${skillName}`);
  
  return evolution;
}

/**
 * 生成Skill Markdown内容
 */
function generateSkillContent(pattern, customContent = {}) {
  const skillName = toSkillName(pattern.taskType);
  const displayName = toDisplayName(pattern.taskType);
  
  return `# ${displayName} Skill

> Auto-generated by Skill Evolution Analyzer
> Evolved from ${pattern.totalExecutions} executions (${pattern.successfulExecutions} successful)

## Metadata

- **Task Type**: ${pattern.taskType}
- **Success Rate**: ${(pattern.successRate * 100).toFixed(1)}%
- **Avg Duration**: ${pattern.avgDuration ? pattern.avgDuration.toFixed(0) + 'ms' : 'N/A'}
- **Total Executions**: ${pattern.totalExecutions}
- **Evolved At**: ${new Date().toISOString()}

## Trigger Conditions

\`\`\`yaml
taskType: ${pattern.taskType}
minSuccessRate: 0.7
minExecutions: 3
\`\`\`${customContent.triggerDescription ? `

## Description

${customContent.triggerDescription}` : ''}${customContent.steps ? `

## Execution Steps

${customContent.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}` : ''}${customContent.bestPractices ? `

## Best Practices

${customContent.bestPractices.map(p => `- ${p}`).join('\n')}` : ''}${customContent.examples ? `

## Examples

${customContent.examples.map(ex => `- ${ex}`).join('\n')}` : ''}

---

*This skill was automatically evolved based on execution data.*
`;
}

/**
 * 转换为Skill名称（kebab-case）
 */
function toSkillName(taskType) {
  return taskType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 转换为显示名称（Title Case）
 */
function toDisplayName(taskType) {
  return taskType
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// 进化建议
// ============================================================

/**
 * 获取进化建议
 * @returns {Array} - 进化建议列表
 */
function getEvolutionSuggestions() {
  const log = loadExecutionLog();
  const suggestions = [];
  
  for (const [taskType, pattern] of Object.entries(log.patterns)) {
    if (!pattern.evolutionCandidates || pattern.evolutionCandidates.length === 0) {
      // 计算是否应该添加候选
      const evolutionStatus = shouldEvolve(taskType);
      if (evolutionStatus.canEvolve) {
        suggestions.push({
          taskType,
          priority: calculatePriority(pattern),
          successRate: pattern.successRate,
          successCount: pattern.successfulExecutions,
          totalExecutions: pattern.totalExecutions,
          confidence: evolutionStatus.confidence,
          avgDuration: pattern.avgDuration,
          lastExecution: pattern.lastExecution,
          reason: evolutionStatus.reason,
          action: 'evolve'
        });
      }
    } else {
      // 已经添加过候选
      const evolutionStatus = shouldEvolve(taskType);
      suggestions.push({
        taskType,
        priority: calculatePriority(pattern),
        successRate: pattern.successRate,
        successCount: pattern.successfulExecutions,
        totalExecutions: pattern.totalExecutions,
        confidence: evolutionStatus?.confidence || 0,
        avgDuration: pattern.avgDuration,
        lastExecution: pattern.lastExecution,
        reason: 'already_candidate',
        action: 'pending_review'
      });
    }
  }
  
  // 按优先级排序
  suggestions.sort((a, b) => {
    if (a.action === 'evolve' && b.action !== 'evolve') return -1;
    if (a.action !== 'evolve' && b.action === 'evolve') return 1;
    return b.priority - a.priority;
  });
  
  return suggestions;
}

/**
 * 计算优先级
 */
function calculatePriority(pattern) {
  const successRate = pattern.successRate || 0;
  const executionCount = pattern.totalExecutions || 0;
  const recency = getRecencyBonus(pattern.lastExecution);
  
  return successRate * 0.4 + Math.min(1, executionCount / 10) * 0.4 + recency * 0.2;
}

/**
 * 获取进化历史
 */
function getEvolutionHistory() {
  const log = loadExecutionLog();
  return log.evolutions;
}

// ============================================================
// 模式分析
// ============================================================

/**
 * 获取所有模式的分析报告
 */
function getPatternReport() {
  const log = loadExecutionLog();
  const patterns = [];
  
  for (const [taskType, pattern] of Object.entries(log.patterns)) {
    const evolutionStatus = shouldEvolve(taskType);
    
    patterns.push({
      taskType,
      ...pattern,
      evolutionStatus,
      priority: calculatePriority(pattern)
    });
  }
  
  return {
    totalPatterns: patterns.length,
    totalExecutions: log.executions.length,
    evolutionCandidates: patterns.filter(p => p.evolutionStatus.canEvolve).length,
    evolvedCount: log.evolutions.length,
    patterns: patterns.sort((a, b) => b.priority - a.priority)
  };
}

/**
 * 获取特定类型的执行历史
 */
function getExecutionHistory(taskType, limit = 10) {
  const log = loadExecutionLog();
  
  return log.executions
    .filter(e => e.context.taskType === taskType)
    .slice(-limit)
    .reverse();
}

// ============================================================
// 维护函数
// ============================================================

/**
 * 清理旧的执行记录
 * @param {number} daysToKeep - 保留天数
 */
function clearOldExecutions(daysToKeep = 30) {
  const log = loadExecutionLog();
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  
  const originalCount = log.executions.length;
  log.executions = log.executions.filter(e => e.timestamp >= cutoff);
  
  saveExecutionLog(log);
  
  console.log(`[SkillEvolution] Cleared ${originalCount - log.executions.length} old executions`);
  
  return {
    removed: originalCount - log.executions.length,
    kept: log.executions.length
  };
}

/**
 * 重置所有数据
 */
function reset() {
  const freshLog = {
    executions: [],
    patterns: {},
    evolutions: []
  };
  
  saveExecutionLog(freshLog);
  
  console.log('[SkillEvolution] All data reset');
  
  return { success: true };
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  // 核心函数
  analyzeExecution,
  shouldEvolve,
  evolveToSkill,
  getEvolutionSuggestions,
  
  // 查询
  getEvolutionHistory,
  getPatternReport,
  getExecutionHistory,
  getEvolutionSuggestions,
  
  // 维护
  clearOldExecutions,
  reset,
  
  // 路径常量
  BRAIN_PATTERNS_PATH
};
