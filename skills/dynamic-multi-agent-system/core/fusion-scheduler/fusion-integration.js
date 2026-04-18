/**
 * Fusion Scheduler 集成模块
 * 
 * 将融合调度器接入subagent-manager的核心集成点
 * 
 * 使用方式:
 * const fusionIntegration = require('./fusion-integration');
 * 
 * // 为子任务生成装备计划
 * const plan = fusionIntegration.planForTask(subTask);
 * 
 * // 生成装备后的prompt
 * const enhancedPrompt = fusionIntegration.equipPrompt(taskPrompt, plan);
 * 
 * // 获取完整的装备报告
 * const report = fusionIntegration.generateEquipReport(subTasks);
 */

const path = require('path');
const fs = require('fs');

// 尝试加载fusion-scheduler
let fusionScheduler = null;
try {
  fusionScheduler = require('./fusion-scheduler');
} catch (e) {
  console.warn('[FusionIntegration] 警告: 无法加载fusion-scheduler:', e.message);
}

/**
 * 检查fusion-scheduler是否可用
 */
function isAvailable() {
  return fusionScheduler !== null;
}

/**
 * 为单个子任务生成装备计划
 * @param {object} subTask - 子任务对象
 * @returns {object} 装备计划
 */
function planForTask(subTask) {
  if (!isAvailable()) {
    return createFallbackPlan(subTask, 'fusion-scheduler-unavailable');
  }
  
  try {
    const result = fusionScheduler.planEquip([subTask]);
    if (result.success && result.plans && result.plans.length > 0) {
      return result.plans[0];
    }
    return createFallbackPlan(subTask, 'no-match');
  } catch (e) {
    console.error('[FusionIntegration] planForTask错误:', e.message);
    return createFallbackPlan(subTask, 'error');
  }
}

/**
 * 为多个子任务生成装备计划
 * @param {array} subTasks - 子任务数组
 * @returns {object} 装备报告
 */
function planForTasks(subTasks) {
  if (!isAvailable()) {
    return {
      success: false,
      error: 'fusion-scheduler-unavailable',
      plans: subTasks.map(st => createFallbackPlan(st, 'fusion-scheduler-unavailable'))
    };
  }
  
  try {
    const result = fusionScheduler.planEquip(subTasks);
    return result;
  } catch (e) {
    console.error('[FusionIntegration] planForTasks错误:', e.message);
    return {
      success: false,
      error: e.message,
      plans: subTasks.map(st => createFallbackPlan(st, 'error'))
    };
  }
}

/**
 * 为prompt添加装备内容
 * @param {string} basePrompt - 基础prompt
 * @param {object} plan - 装备计划
 * @returns {string} 增强后的prompt
 */
function equipPrompt(basePrompt, plan) {
  if (!plan || !plan.equipped || !plan.skillContent) {
    return basePrompt;
  }
  
  if (plan.type === 'nuwa') {
    return `${basePrompt}

--- 女娲人格注入 ---
角色: ${plan.name}
${plan.skillContent}
--- 人格注入结束 ---`;
  }
  
  if (plan.type === 'agency') {
    return `${basePrompt}

--- Agency角色装备 ---
角色: ${plan.name}
${plan.skillContent}
--- 角色装备结束 ---`;
  }
  
  return basePrompt;
}

/**
 * 生成完整的装备报告（用于日志）
 * @param {array} subTasks - 子任务数组
 * @returns {object} 装备报告
 */
function generateEquipReport(subTasks) {
  const result = planForTasks(subTasks);
  
  if (!result.success) {
    return {
      fusionSchedulerAvailable: isAvailable(),
      error: result.error,
      summary: {
        total: subTasks.length,
        equipped: 0,
        byType: {}
      },
      plans: result.plans
    };
  }
  
  // 统计
  const summary = {
    total: subTasks.length,
    equipped: result.plans.filter(p => p.equipped).length,
    byType: {
      nuwa: result.plans.filter(p => p.type === 'nuwa').length,
      agency: result.plans.filter(p => p.type === 'agency').length,
      custom: result.plans.filter(p => p.type === 'custom' || p.fallback).length
    }
  };
  
  return {
    fusionSchedulerAvailable: isAvailable(),
    success: true,
    summary,
    plans: result.plans.map(plan => ({
      taskId: plan.subTask.id || plan.subTask.taskId,
      taskDescription: plan.subTask.description || plan.subTask.text,
      equipped: plan.equipped,
      type: plan.type,
      name: plan.name,
      matchScore: plan.matchScore,
      reasoning: plan.reasoning,
      hasSkillContent: !!plan.skillContent
    }))
  };
}

/**
 * 获取可用的人格和模板列表（用于调试/展示）
 */
function getAvailableEquipment() {
  if (!isAvailable()) {
    return { available: false };
  }
  
  try {
    const registry = fusionScheduler.loadRegistry();
    if (!registry) {
      return { available: false, error: 'registry-load-failed' };
    }
    
    const personas = Object.keys(registry.personas || {});
    const templates = Object.keys(registry.agencyTemplates || {});
    
    return {
      available: true,
      personas,
      templates,
      totalPersonas: personas.length,
      totalTemplates: templates.length
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

/**
 * 创建fallback计划
 */
function createFallbackPlan(subTask, reason) {
  return {
    subTask,
    equipped: false,
    type: 'custom',
    name: null,
    skillContent: null,
    skillPath: null,
    fallback: true,
    matchScore: null,
    matchType: null,
    reasoning: [`Fallback: ${reason}`]
  };
}

/**
 * 注册新人格（女娲蒸馏后调用）
 */
function registerPersona(name, skillPath, triggers, description) {
  if (!isAvailable()) {
    return { success: false, error: 'fusion-scheduler-unavailable' };
  }
  
  try {
    const result = fusionScheduler.registerPersona(name, skillPath, triggers, description);
    return { success: !!result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 注册新模板
 */
function registerTemplate(name, skillPath, triggers, category) {
  if (!isAvailable()) {
    return { success: false, error: 'fusion-scheduler-unavailable' };
  }
  
  try {
    const result = fusionScheduler.registerTemplate(name, skillPath, triggers, category);
    return { success: !!result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  isAvailable,
  planForTask,
  planForTasks,
  equipPrompt,
  generateEquipReport,
  getAvailableEquipment,
  registerPersona,
  registerTemplate
};
