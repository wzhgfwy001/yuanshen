/**
 * PreventionHooks - 预防系统集成入口
 * 
 * 在任务执行的关键节点自动调用预防系统
 * 
 * 【核心功能】生成工具防火墙 - 机械拦截绕过阳神系统的行为
 * 
 * 使用方式：
 * const hooks = require('./prevention-hooks.js');
 * 
 * // ⚠️ 任务开始前【必须调用】- 否则生成工具会被拦截
 * hooks.beforeTask({ taskType, command, tools, environment });
 * 
 * // 任务完成后
 * hooks.afterTask(taskContext, success, result);
 *
 * 【机械拦截规则】
 * - 如果任务使用生成工具（music_generate/image_generate/video_generate）
 * - 并且orchestrator未被调用（_orchestratorCalled = false）
 * - 则抛出错误，阻止任务执行
 * 
 * 【正确流程】
 * 1. 调用 orchestrator.executeTask() 或通过阳神系统
 * 2. 阳神系统内部调用 markOrchestratorCalled()
 * 3. 然后才可以使用生成工具
 */

const path = require('path');

// 延迟加载预防系统
let activePrevention = null;
let lessonQuerier = null;
let avoidanceEngine = null;

// ============ 生成工具防火墙状态 ============
// 追踪orchestrator是否已被调用
let _orchestratorCalled = false;
let _orchestratorCallTime = null;
let _orchestratorSessionId = null;

// 生成工具列表
const GENERATION_TOOLS = ['music_generate', 'image_generate', 'video_generate'];

/**
 * 标记orchestrator已被调用（由orchestrator或wrapper调用）
 */
function markOrchestratorCalled(sessionId) {
    _orchestratorCalled = true;
    _orchestratorCallTime = new Date().toISOString();
    _orchestratorSessionId = sessionId;
    console.log('[PreventionHooks] 🛡️ Orchestrator已标记为已调用 - Session:', sessionId);
}

/**
 * 重置orchestrator调用状态
 */
function resetOrchestratorStatus() {
    _orchestratorCalled = false;
    _orchestratorCallTime = null;
    _orchestratorSessionId = null;
}

/**
 * 检查是否允许调用生成工具
 * @param {string} toolName - 工具名称
 * @returns {object} { allowed: boolean, reason: string }
 */
function checkGenerationTool(toolName) {
    // 检查是否是生成工具
    const isGenerationTool = GENERATION_TOOLS.some(t => toolName?.toLowerCase().includes(t));
    
    if (!isGenerationTool) {
        return { allowed: true, reason: '非生成工具' };
    }
    
    if (!_orchestratorCalled) {
        console.log('[PreventionHooks] ⛔ 阻止生成工具调用:', toolName);
        console.log('[PreventionHooks]    原因: orchestrator未被调用 - 必须通过阳神系统执行');
        return { 
            allowed: false, 
            reason: 'orchestrator-not-called',
            message: `禁止直接调用${toolName}，必须先调用orchestrator.executeTask()或使用阳神系统`
        };
    }
    
    return { allowed: true, reason: 'orchestrator已调用' };
}

function loadPreventionSystem() {
  if (!activePrevention) {
    try {
      const preventionPath = path.join(__dirname, 'active-prevention-system.js');
      activePrevention = require(preventionPath);
      console.log('[PreventionHooks] ✅ 主动预防系统已加载');
    } catch (e) {
      console.warn('[PreventionHooks] 主动预防系统加载失败:', e.message);
    }
  }
  return activePrevention;
}

function loadLessonQuerier() {
  if (!lessonQuerier) {
    try {
      const querierPath = path.join(__dirname, 'lesson-querier.js');
      lessonQuerier = require(querierPath);
      console.log('[PreventionHooks] ✅ 教训查询器已加载');
    } catch (e) {
      console.warn('[PreventionHooks] 教训查询器加载失败:', e.message);
    }
  }
  return lessonQuerier;
}

function loadAvoidanceEngine() {
  if (!avoidanceEngine) {
    try {
      const enginePath = path.join(__dirname, 'avoidance-engine.js');
      avoidanceEngine = require(enginePath);
      console.log('[PreventionHooks] ✅ 规避引擎已加载');
    } catch (e) {
      console.warn('[PreventionHooks] 规避引擎加载失败:', e.message);
    }
  }
  return avoidanceEngine;
}

/**
 * 任务开始前的预防检查
 * @param {object} taskContext - 任务上下文 { taskId, taskType, command, tools, environment }
 * @returns {object} 预防结果
 */
function beforeTask(taskContext) {
  console.log('[PreventionHooks] ===== 任务开始前预防检查 =====');
  console.log('[PreventionHooks] 任务:', taskContext.taskType || 'unknown', taskContext.command?.substring(0, 50));
  
  // 0. 【核心检查】生成工具防火墙（机械拦截，不是警告）
  if (taskContext.tools && taskContext.tools.length > 0) {
    for (const tool of taskContext.tools) {
      const check = checkGenerationTool(tool);
      if (!check.allowed) {
        // 【修改】抛出错误，机械拦截
        const error = new Error(
          `[PreventionHooks] ⛔ 机械拦截: ${check.message}`
        );
        error.code = 'ORCHESTRATOR_NOT_CALLED';
        error.blockedTool = tool;
        console.log('[PreventionHooks] 🔴 任务被拦截 - orchestrator未被调用');
        console.log('[PreventionHooks]    必须先调用 orchestrator.executeTask()');
        throw error;  // 机械拦截，停止执行
      }
    }
  }
  
  // 1. 加载系统
  const prevention = loadPreventionSystem();
  const querier = loadLessonQuerier();
  const engine = loadAvoidanceEngine();
  
  // 2. 如果有预防系统，使用它
  if (prevention && prevention.planWithPrevention) {
    try {
      const enhancedPlan = prevention.planWithPrevention(taskContext);
      console.log('[PreventionHooks] 预防结果:', {
        applied: enhancedPlan.avoidanceApplied,
        reason: enhancedPlan.reason,
        lessonsFound: enhancedPlan.lessonsFound || 0
      });
      return enhancedPlan;
    } catch (e) {
      console.warn('[PreventionHooks] planWithPrevention失败:', e.message);
    }
  }
  
  // 3. 如果没有预防系统，回退到基础查询
  if (querier) {
    try {
      const lessons = querier.queryByContext(taskContext.taskType || 'general', taskContext);
      console.log('[PreventionHooks] 查询到', lessons.length, '条相关教训');
      return {
        taskContext,
        preventionApplied: false,
        lessonsFound: lessons.length,
        lessons: lessons.slice(0, 3) // 最多返回3条
      };
    } catch (e) {
      console.warn('[PreventionHooks] queryByContext失败:', e.message);
    }
  }
  
  return {
    taskContext,
    preventionApplied: false,
    reason: 'system-not-available',
    lessonsFound: 0
  };
}

/**
 * 任务完成后的验证和记录
 * @param {object} taskContext - 任务上下文
 * @param {boolean} success - 是否成功
 * @param {object} result - 执行结果
 * @returns {object} 验证结果
 */
function afterTask(taskContext, success, result) {
  console.log('[PreventionHooks] ===== 任务完成后验证 =====');
  console.log('[PreventionHooks] 任务:', taskContext.taskType || 'unknown', '- 成功:', success);
  
  // 加载模块
  const prevention = loadPreventionSystem();
  const querier = loadLessonQuerier();
  
  // 查询是否有相关教训被应用
  if (querier) {
    try {
      const lessons = querier.queryByContext(taskContext.taskType || 'general', taskContext);
      console.log('[PreventionHooks] 相关教训数量:', lessons.length);
      
      // 检查是否有高影响教训
      const highImpact = lessons.filter(l => (l.impactScope || 0) >= 7);
      if (highImpact.length > 0) {
        console.log('[PreventionHooks] ⚠️ 检测到', highImpact.length, '条高影响教训未应用!');
        return {
          verified: false,
          warnings: highImpact.length,
          message: '存在未应用的高影响教训'
        };
      }
    } catch (e) {
      console.warn('[PreventionHooks] afterTask查询失败:', e.message);
    }
  }
  
  return {
    verified: true,
    warnings: 0
  };
}

/**
 * 手动查询教训（供调试使用）
 * @param {string} taskType - 任务类型
 * @param {object} context - 任务上下文
 * @returns {array} 教训列表
 */
function queryLessons(taskType, context = {}) {
  const querier = loadLessonQuerier();
  if (!querier) {
    return [];
  }
  
  try {
    const lessons = querier.queryByContext(taskType, context);
    return lessons;
  } catch (e) {
    console.warn('[PreventionHooks] queryLessons失败:', e.message);
    return [];
  }
}

module.exports = {
  beforeTask,
  afterTask,
  queryLessons,
  loadPreventionSystem,
  loadLessonQuerier,
  loadAvoidanceEngine,
  markOrchestratorCalled,
  resetOrchestratorStatus,
  checkGenerationTool
};
