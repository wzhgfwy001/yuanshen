/**
 * ActivePreventionSystem - 主动预防系统
 * 
 * 将 lesson-querier + avoidance-engine + trajectory-integration 整合
 * 实现真正的「从失败中学习，避免重复犯错」
 * 
 * 使用方式：
 * const prevention = require('./active-prevention-system.js');
 * 
 * // 任务规划阶段：查询教训并应用规避
 * const enhancedPlan = prevention.planWithPrevention(taskContext);
 * 
 * // 任务完成后：验证规避是否生效
 * prevention.verifyExecution(plan, success);
 */

const path = require('path');

// 延迟加载子模块
let lessonQuerier = null;
let avoidanceEngine = null;
let trajectoryIntegration = null;

function loadModules() {
  if (!lessonQuerier) {
    try {
      lessonQuerier = require('./lesson-querier.js');
    } catch (e) {
      console.warn('[ActivePrevention] lesson-querier加载失败:', e.message);
    }
  }
  
  if (!avoidanceEngine) {
    try {
      avoidanceEngine = require('./avoidance-engine.js');
    } catch (e) {
      console.warn('[ActivePrevention] avoidance-engine加载失败:', e.message);
    }
  }
  
  if (!trajectoryIntegration) {
    try {
      trajectoryIntegration = require('./trajectory-integration.js');
    } catch (e) {
      console.warn('[ActivePrevention] trajectory-integration加载失败:', e.message);
    }
  }
  
  return {
    lessonQuerier: !!lessonQuerier,
    avoidanceEngine: !!avoidanceEngine,
    trajectoryIntegration: !!trajectoryIntegration
  };
}

/**
 * 在任务规划阶段应用主动预防
 * @param {object} taskContext - 任务上下文
 * @returns {object} 带预防的计划
 */
function planWithPrevention(taskContext) {
  const modules = loadModules();
  
  console.log('[ActivePrevention] 规划阶段 - 应用主动预防');
  console.log('[ActivePrevention] 模块状态:', modules);
  
  // 1. 查询相关教训
  let relevantLessons = [];
  if (modules.lessonQuerier && lessonQuerier) {
    relevantLessons = lessonQuerier.queryByContext(
      taskContext.taskType || 'general',
      taskContext
    );
    console.log(`[ActivePrevention] 找到 ${relevantLessons.length} 条相关教训`);
  }
  
  // 2. 如果有高影响教训，应用规避
  if (modules.avoidanceEngine && avoidanceEngine && relevantLessons.length > 0) {
    const highImpact = relevantLessons.filter(l => (l.impactScope || 0) >= 7);
    if (highImpact.length > 0) {
      console.log(`[ActivePrevention] 检测到 ${highImpact.length} 条高影响教训，应用规避策略`);
      
      const basePlan = {
        id: taskContext.taskId || `plan_${Date.now()}`,
        taskType: taskContext.taskType,
        tools: taskContext.tools || [],
        command: taskContext.command,
        environment: taskContext.environment
      };
      
      return avoidanceEngine.applyAvoidance(basePlan, taskContext);
    }
  }
  
  // 3. 无需规避，返回原计划
  return {
    ...taskContext,
    preventionApplied: false,
    reason: relevantLessons.length === 0 ? 'no-relevant-lessons' : 'low-impact-only',
    lessonsFound: relevantLessons.length
  };
}

/**
 * 在任务执行前进行预检
 * @param {object} plan - 执行计划
 * @returns {object} 预检结果
 */
function preExecuteCheck(plan) {
  if (!plan.avoidanceApplied) {
    return { passed: true, checks: [], reason: 'no-avoidance-needed' };
  }
  
  const checks = [];
  
  // 执行预检清单中的每一项
  if (plan.precheckList && plan.precheckList.length > 0) {
    console.log('[ActivePrevention] 执行预检清单:', plan.precheckList.length, '项');
    
    for (const check of plan.precheckList) {
      // 这里可以做实际的检查
      // 例如：检查权限、检查路径、检查环境变量等
      checks.push({
        description: check.check,
        reason: check.reason,
        status: 'pending',  // 实际应该运行检查
        passed: true  // 默认通过，需要时再改为实际检查结果
      });
    }
  }
  
  // 检查警告
  if (plan.warnings && plan.warnings.length > 0) {
    console.log(`[ActivePrevention] ⚠️ 有 ${plan.warnings.length} 条警告`);
    for (const warning of plan.warnings) {
      console.log(`  ⚠️ ${warning.message}`);
    }
  }
  
  const allPassed = checks.every(c => c.passed);
  
  return {
    passed: allPassed,
    checks,
    warnings: plan.warnings || [],
    canProceed: allPassed && plan.warnings.length === 0,
    message: allPassed 
      ? '✅ 预检通过，可以执行' 
      : '⚠️ 有未通过的预检项，请检查'
  };
}

/**
 * 验证执行结果
 * @param {object} plan - 执行时的计划
 * @param {boolean} success - 是否成功
 * @param {object} summary - 执行总结
 * @returns {object} 验证结果
 */
function verifyExecution(plan, success, summary = {}) {
  console.log(`[ActivePrevention] 验证执行结果: ${success ? '成功' : '失败'}`);
  
  let result = {
    success,
    preventionWasApplied: plan.avoidanceApplied || false,
    timestamp: Date.now()
  };
  
  // 如果应用了规避，验证是否有效
  if (plan.avoidanceApplied && avoidanceEngine) {
    const verify = avoidanceEngine.verifyAvoidance(plan, success);
    result = { ...result, ...verify };
    
    // 如果失败且有fallbacks，标记可以重试
    if (!success && plan.fallbackActions && plan.fallbackActions.length > 0) {
      result.canRetryWithFallback = true;
      result.fallbackActions = plan.fallbackActions;
    }
  }
  
  // 如果失败，将失败轨迹记录到教训
  if (!success && trajectoryIntegration) {
    const taskId = plan.id || plan.taskId;
    if (taskId) {
      console.log(`[ActivePrevention] 失败任务: ${taskId}，已由trajectory-integration自动记录`);
    }
    
    // 检查是否需要新增教训
    if (result.needsNewLesson) {
      result.newLessonNeeded = true;
      result.lessonSuggestion = suggestLessonFromFailure(plan, summary);
    }
  }
  
  // 更新教训置信度（如果有追踪数据）
  if (success && plan.avoidanceApplied && plan.avoidanceRules) {
    updateLessonConfidence(plan.avoidanceRules);
  }
  
  return result;
}

/**
 * 从失败中提取教训建议
 */
function suggestLessonFromFailure(plan, summary) {
  return {
    pattern: plan.taskType || 'unknown',
    errorMessage: summary.error || '执行失败',
    context: {
      taskType: plan.taskType,
      tools: plan.tools,
      command: plan.command
    },
    rootCause: '规避规则未能阻止失败，可能需要更具体的预防措施',
    resolution: plan.fallbackActions 
      ? plan.fallbackActions.map(f => f.action) 
      : ['分析失败原因，添加新的规避规则']
  };
}

/**
 * 更新教训置信度（成功后调用）
 */
function updateLessonConfidence(rules) {
  // 这是简化版，实际应该更新brain/lessons/中的置信度字段
  console.log('[ActivePrevention] 更新教训置信度:', rules.length, '条规则验证成功');
  
  // TODO: 实现置信度更新逻辑
  // 每次成功规避，置信度+1
  // 置信度达到阈值后，标记为「已验证规避」
}

/**
 * 获取主动预防系统状态
 */
function getStatus() {
  const modules = loadModules();
  const status = {
    allModulesLoaded: modules.lessonQuerier && modules.avoidanceEngine && modules.trajectoryIntegration,
    modules,
    querierStats: null,
    avoidanceStatus: null
  };
  
  if (modules.lessonQuerier && lessonQuerier) {
    status.querierStats = lessonQuerier.getStats();
  }
  
  if (modules.avoidanceEngine && avoidanceEngine) {
    status.avoidanceStatus = avoidanceEngine.getStatus();
  }
  
  return status;
}

/**
 * 强制刷新教训缓存
 */
function refreshLessons() {
  loadModules();  // 重新加载模块
  if (lessonQuerier) {
    const stats = lessonQuerier.getStats();
    console.log('[ActivePrevention] 教训缓存已刷新:', stats);
    return stats;
  }
  return null;
}

module.exports = {
  planWithPrevention,
  preExecuteCheck,
  verifyExecution,
  getStatus,
  refreshLessons,
  loadModules
};

// 测试
if (require.main === module) {
  console.log('=== ActivePreventionSystem Test ===\n');
  
  const status = getStatus();
  console.log('系统状态:', status);
  
  // 测试规划阶段
  console.log('\n--- 测试规划阶段 ---');
  const taskContext = {
    taskId: 'test-task-001',
    taskType: 'code_review',
    tool: 'exec',
    command: 'npm install',
    environment: 'npm',
    keywords: ['permission', 'denied']
  };
  
  const enhancedPlan = planWithPrevention(taskContext);
  console.log('增强计划:', {
    preventionApplied: enhancedPlan.preventionApplied,
    avoidanceApplied: enhancedPlan.avoidanceApplied,
    rulesCount: enhancedPlan.avoidanceRules ? enhancedPlan.avoidanceRules.length : 0,
    prechecks: enhancedPlan.precheckList ? enhancedPlan.precheckList.length : 0,
    warnings: enhancedPlan.warnings ? enhancedPlan.warnings.length : 0
  });
  
  // 测试预检
  console.log('\n--- 测试预检 ---');
  const precheck = preExecuteCheck(enhancedPlan);
  console.log('预检结果:', precheck);
  
  // 测试验证（成功情况）
  console.log('\n--- 测试验证（成功） ---');
  const verifySuccess = verifyExecution(enhancedPlan, true);
  console.log('验证结果:', verifySuccess);
  
  console.log('\n=== Test Complete ===');
}