/**
 * AvoidanceEngine - 规避引擎
 * 
 * 功能：使用教训查询结果，生成规避策略并注入到执行计划
 * 
 * 使用方式：
 * const avoidance = require('./avoidance-engine.js');
 * const plan = avoidance.applyAvoidance(basePlan, context);
 */

const path = require('path');

// 延迟加载lesson-querier
let lessonQuerier = null;
function getLessonQuerier() {
  if (!lessonQuerier) {
    try {
      lessonQuerier = require('./lesson-querier.js');
    } catch (e) {
      console.warn('[AvoidanceEngine] lesson-querier未加载:', e.message);
    }
  }
  return lessonQuerier;
}

/**
 * 为执行计划应用规避策略
 * @param {object} basePlan - 基础执行计划
 * @param {object} context - 任务上下文 { taskType, tool, command, environment }
 * @returns {object} 带有规避策略的计划
 */
function applyAvoidance(basePlan, context) {
  const querier = getLessonQuerier();
  if (!querier) {
    return { ...basePlan, avoidanceApplied: false, reason: 'no-querier' };
  }
  
  try {
    // 1. 查询相关教训
    const lessons = querier.queryByContext(context.taskType || 'general', context);
    const highImpactLessons = lessons.filter(l => (l.impactScope || 0) >= 7);
    
    if (highImpactLessons.length === 0) {
      return { ...basePlan, avoidanceApplied: false, reason: 'no-relevant-lessons' };
    }
    
    // 2. 生成规避规则
    const rules = generateAvoidanceRules(highImpactLessons, context);
    
    // 3. 将规避规则注入到计划
    const enhancedPlan = injectRules(basePlan, rules);
    
    console.log(`[AvoidanceEngine] 应用了 ${rules.length} 条规避规则`);
    
    return enhancedPlan;
  } catch (e) {
    console.error('[AvoidanceEngine] 应用规避失败:', e.message);
    return { ...basePlan, avoidanceApplied: false, reason: 'error', error: e.message };
  }
}

/**
 * 生成规避规则
 * @param {array} lessons - 相关教训列表
 * @param {object} context - 任务上下文
 * @returns {array} 规避规则列表
 */
function generateAvoidanceRules(lessons, context) {
  const rules = [];
  
  for (const lesson of lessons) {
    const rule = {
      source: lesson.filename,
      impact: lesson.impactScope,
      pattern: lesson.errorMessage,
      rootCause: lesson.rootCause,
      preventions: []
    };
    
    // 从教训的"避免方式"提取规避方法
    if (lesson.resolution && Array.isArray(lesson.resolution)) {
      for (const res of lesson.resolution) {
        // 解析规避方法
        // 格式如："1. 使用 --unsafe-perm 或 sudo"
        const match = res.match(/^\d+\.\s*(.+)/);
        if (match) {
          rule.preventions.push({
            action: match[1].trim(),
            type: classifyPrevention(match[1])
          });
        }
      }
    }
    
    rules.push(rule);
  }
  
  return rules;
}

/**
 * 分类规避类型
 * @param {string} action - 规避动作描述
 * @returns {string} 类型: precheck, fallback, warning, modify
 */
function classifyPrevention(action) {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('检查') || actionLower.includes('验证') || actionLower.includes('确认')) {
    return 'precheck';
  }
  if (actionLower.includes('使用') && (actionLower.includes('sudo') || actionLower.includes('unsafe'))) {
    return 'fallback';
  }
  if (actionLower.includes('警告') || actionLower.includes('提示')) {
    return 'warning';
  }
  if (actionLower.includes('改用') || actionLower.includes('改写') || actionLower.includes('调整')) {
    return 'modify';
  }
  
  return 'general';
}

/**
 * 将规避规则注入到执行计划
 * @param {object} plan - 基础计划
 * @param {array} rules - 规避规则
 * @returns {object} 增强后的计划
 */
function injectRules(plan, rules) {
  const enhanced = {
    ...plan,
    avoidanceApplied: true,
    avoidanceRules: rules,
    warningCount: rules.filter(r => r.preventions.some(p => p.type === 'warning')).length,
    precheckCount: rules.filter(r => r.preventions.some(p => p.type === 'precheck')).length,
    fallbackAvailable: rules.some(r => r.preventions.some(p => p.type === 'fallback'))
  };
  
  // 添加预检清单
  const prechecks = [];
  const warnings = [];
  const fallbacks = [];
  
  for (const rule of rules) {
    for (const prevention of rule.preventions) {
      if (prevention.type === 'precheck') {
        prechecks.push({
          check: prevention.action,
          reason: `防止: ${rule.pattern.substring(0, 50)}`
        });
      } else if (prevention.type === 'warning') {
        warnings.push({
          message: prevention.action,
          ifTriggered: rule.rootCause
        });
      } else if (prevention.type === 'fallback') {
        fallbacks.push({
          action: prevention.action,
          when: rule.pattern
        });
      }
    }
  }
  
  if (prechecks.length > 0) {
    enhanced.precheckList = prechecks;
  }
  if (warnings.length > 0) {
    enhanced.warnings = warnings;
  }
  if (fallbacks.length > 0) {
    enhanced.fallbackActions = fallbacks;
  }
  
  return enhanced;
}

/**
 * 验证规避是否生效（任务完成后调用）
 * @param {object} plan - 执行时的计划（带有avoidanceRules）
 * @param {boolean} success - 任务是否成功
 * @returns {object} 验证结果
 */
function verifyAvoidance(plan, success) {
  if (!plan.avoidanceApplied) {
    return { verified: false, reason: 'no-avoidance-applied' };
  }
  
  const result = {
    verified: true,
    rulesApplied: plan.avoidanceRules.length,
    prechecksTriggered: plan.precheckList ? plan.precheckList.length : 0,
    fallbacksTriggered: 0,
    success,
    message: ''
  };
  
  if (success) {
    result.message = `✅ 规避有效，任务成功完成`;
  } else {
    result.message = `⚠️ 规避未能阻止失败，需分析是否需要新教训`;
    result.needsNewLesson = true;
  }
  
  return result;
}

/**
 * 获取当前规避引擎状态
 */
function getStatus() {
  const querier = getLessonQuerier();
  if (!querier) {
    return { available: false, reason: 'lesson-querier-not-loaded' };
  }
  
  const stats = querier.getStats();
  
  return {
    available: true,
    totalLessons: stats.total,
    highImpactLessons: stats.byImpact ? stats.byImpact.high : 0,
    readyForAvoidance: stats.byImpact && stats.byImpact.high > 0
  };
}

module.exports = {
  applyAvoidance,
  verifyAvoidance,
  getStatus,
  generateAvoidanceRules
};

// 测试
if (require.main === module) {
  console.log('=== AvoidanceEngine Test ===\n');
  
  const status = getStatus();
  console.log('状态:', status);
  
  // 测试应用规避
  console.log('\n--- 测试应用规避 ---');
  const basePlan = {
    id: 'task-001',
    type: 'code_review',
    tools: ['exec', 'read'],
    command: 'npm install'
  };
  
  const context = {
    taskType: 'code_review',
    tool: 'exec',
    command: 'npm install',
    environment: 'npm'
  };
  
  const enhanced = applyAvoidance(basePlan, context);
  console.log('增强计划:', {
    avoidanceApplied: enhanced.avoidanceApplied,
    rulesCount: enhanced.avoidanceRules ? enhanced.avoidanceRules.length : 0,
    prechecks: enhanced.precheckList ? enhanced.precheckList.length : 0,
    warnings: enhanced.warnings ? enhanced.warnings.length : 0
  });
  
  // 测试验证
  console.log('\n--- 测试验证 ---');
  const verify = verifyAvoidance(enhanced, true);
  console.log('验证结果:', verify);
}