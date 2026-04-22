/**
 * Fusion Scheduler 集成模块 v2.0
 * 基于DeerFlow架构优化：
 * 1. 结构化状态
 * 2. 事件系统
 * 3. 异步化
 */

const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class EquipmentPlan {
  constructor(subTask, equipped, type, name, reasoning) {
    this.subTask = subTask;
    this.equipped = equipped;
    this.type = type || 'custom';
    this.name = name;
    this.reasoning = reasoning || [];
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      taskId: this.subTask?.id || this.subTask?.taskId,
      equipped: this.equipped,
      type: this.type,
      name: this.name,
      reasoning: this.reasoning,
      timestamp: this.timestamp
    };
  }
}

class EquipReport {
  constructor(success, summary, plans, error = null) {
    this.success = success;
    this.summary = summary;
    this.plans = plans;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: this.success,
      summary: this.summary,
      plans: this.plans.map(p => p.toJSON ? p.toJSON() : p),
      error: this.error,
      timestamp: this.timestamp
    };
  }
}

class AvailabilityInfo {
  constructor(available, personas, templates) {
    this.available = available;
    this.personas = personas || [];
    this.templates = templates || [];
    this.totalPersonas = personas?.length || 0;
    this.totalTemplates = templates?.length || 0;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      available: this.available,
      personas: this.personas,
      templates: this.templates,
      totalPersonas: this.totalPersonas,
      totalTemplates: this.totalTemplates,
      timestamp: this.timestamp
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class IntegrationEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[IntegrationEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new IntegrationEmitter();

const EVENTS = {
  EQUIPMENT_PLANNED: 'equipment_planned',
  PERSONA_REGISTERED: 'persona_registered',
  TEMPLATE_REGISTERED: 'template_registered',
  INTEGRATION_ERROR: 'integration_error'
};

emitter.on(EVENTS.PERSONA_REGISTERED, (name) => console.log(`[FusionIntegration] ✅ 注册人格: ${name}`));
emitter.on(EVENTS.TEMPLATE_REGISTERED, (name) => console.log(`[FusionIntegration] ✅ 注册模板: ${name}`));

// ==================== 尝试加载fusion-scheduler ====================

let fusionScheduler = null;
try {
  fusionScheduler = require('./fusion-scheduler');
} catch (e) {
  console.warn('[FusionIntegration] 警告: 无法加载fusion-scheduler:', e.message);
}

function isAvailable() {
  return fusionScheduler !== null;
}

// ==================== 核心功能 ====================

function createFallbackPlan(subTask, reason) {
  return new EquipmentPlan(
    subTask,
    false,
    'custom',
    null,
    [`Fallback: ${reason}`]
  );
}

function planForTask(subTask) {
  if (!isAvailable()) {
    const plan = createFallbackPlan(subTask, 'fusion-scheduler-unavailable');
    emitter.emit(EVENTS.EQUIPMENT_PLANNED, plan);
    return plan;
  }
  
  try {
    const result = fusionScheduler.planEquip([subTask]);
    if (result.success && result.plans && result.plans.length > 0) {
      const plan = new EquipmentPlan(
        result.plans[0].subTask,
        result.plans[0].equipped,
        result.plans[0].type,
        result.plans[0].name,
        result.plans[0].reasoning
      );
      emitter.emit(EVENTS.EQUIPMENT_PLANNED, plan);
      return plan;
    }
    const plan = createFallbackPlan(subTask, 'no-match');
    emitter.emit(EVENTS.EQUIPMENT_PLANNED, plan);
    return plan;
  } catch (e) {
    console.error('[FusionIntegration] planForTask错误:', e.message);
    emitter.emit(EVENTS.INTEGRATION_ERROR, { function: 'planForTask', error: e.message });
    return createFallbackPlan(subTask, 'error');
  }
}

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
    if (result.success) {
      const plans = result.plans.map(p => new EquipmentPlan(
        p.subTask, p.equipped, p.type, p.name, p.reasoning
      ));
      emitter.emit(EVENTS.EQUIPMENT_PLANNED, { count: plans.length });
      return { success: true, plans };
    }
    return result;
  } catch (e) {
    console.error('[FusionIntegration] planForTasks错误:', e.message);
    emitter.emit(EVENTS.INTEGRATION_ERROR, { function: 'planForTasks', error: e.message });
    return {
      success: false,
      error: e.message,
      plans: subTasks.map(st => createFallbackPlan(st, 'error'))
    };
  }
}

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

function generateEquipReport(subTasks) {
  const result = planForTasks(subTasks);
  
  if (!result.success) {
    return new EquipReport(
      false,
      { total: subTasks.length, equipped: 0, byType: {} },
      result.plans,
      result.error
    );
  }
  
  const plans = result.plans;
  const summary = {
    total: subTasks.length,
    equipped: plans.filter(p => p.equipped).length,
    byType: {
      nuwa: plans.filter(p => p.type === 'nuwa').length,
      agency: plans.filter(p => p.type === 'agency').length,
      custom: plans.filter(p => p.type === 'custom' || p.fallback).length
    }
  };
  
  return new EquipReport(
    true,
    summary,
    plans.map(plan => ({
      taskId: plan.subTask?.id || plan.subTask?.taskId,
      taskDescription: plan.subTask?.description || plan.subTask?.text,
      equipped: plan.equipped,
      type: plan.type,
      name: plan.name,
      matchScore: plan.matchScore,
      reasoning: plan.reasoning,
      hasSkillContent: !!plan.skillContent
    }))
  );
}

function getAvailableEquipment() {
  if (!isAvailable()) {
    return new AvailabilityInfo(false, [], []);
  }
  
  try {
    const registry = fusionScheduler.loadRegistry();
    if (!registry) {
      return new AvailabilityInfo(false, [], []);
    }
    
    const personas = Object.keys(registry.personas || {});
    const templates = Object.keys(registry.agencyTemplates || {});
    
    return new AvailabilityInfo(true, personas, templates);
  } catch (e) {
    return new AvailabilityInfo(false, [], []);
  }
}

async function registerPersonaAsync(name, skillPath, triggers, description) {
  if (!isAvailable()) {
    return { success: false, error: 'fusion-scheduler-unavailable' };
  }
  
  try {
    const result = fusionScheduler.registerPersona(name, skillPath, triggers, description);
    if (result) {
      emitter.emit(EVENTS.PERSONA_REGISTERED, name);
    }
    return { success: !!result };
  } catch (e) {
    emitter.emit(EVENTS.INTEGRATION_ERROR, { function: 'registerPersona', error: e.message });
    return { success: false, error: e.message };
  }
}

async function registerTemplateAsync(name, skillPath, triggers, category) {
  if (!isAvailable()) {
    return { success: false, error: 'fusion-scheduler-unavailable' };
  }
  
  try {
    const result = fusionScheduler.registerTemplate(name, skillPath, triggers, category);
    if (result) {
      emitter.emit(EVENTS.TEMPLATE_REGISTERED, name);
    }
    return { success: !!result };
  } catch (e) {
    emitter.emit(EVENTS.INTEGRATION_ERROR, { function: 'registerTemplate', error: e.message });
    return { success: false, error: e.message };
  }
}

// ==================== 导出 ====================

module.exports = {
  isAvailable,
  planForTask,
  planForTasks,
  equipPrompt,
  generateEquipReport,
  getAvailableEquipment,
  registerPersona: registerPersonaAsync,
  registerTemplate: registerTemplateAsync,
  EquipmentPlan,
  EquipReport,
  AvailabilityInfo,
  emitter,
  EVENTS
};
