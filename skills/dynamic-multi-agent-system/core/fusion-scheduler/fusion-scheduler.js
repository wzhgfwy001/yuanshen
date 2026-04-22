/**
 * 融合调度器 - Fusion Scheduler v2.0
 * 
 * 基于DeerFlow架构优化：
 * 1. 中间件管道钩子 (before_plan/after_plan)
 * 2. 并发目录扫描
 * 3. 模板提取缓存
 * 4. 多策略匹配回退
 * 
 * 核心功能：
 * 1. 分析任务，匹配女娲人格或Agency模板
 * 2. 自动装备对应的SKILL.md内容
 * 3. 无匹配时spawn自定义子Agent
 */

const fs = require('fs');
const path = require('path');

// 注册表路径
const REGISTRY_PATH = path.join(__dirname, 'fusion-registry.json');

// 工作空间路径
const WORKSPACE = process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace';

// Agency模板目录 - 完整agency-registry
const AGENCY_REGISTRY_DIR = path.join(__dirname, '..', '..', 'agency-registry');

// 映射加载器
const MAPPING_LOADER_PATH = path.join(__dirname, '..', 'subagent-manager', 'mapping-loader.js');
let mappingLoader = null;

// ==================== DeerFlow借鉴1: 模板提取缓存 ====================

const templateCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

function getCachedTemplateInfo(skillPath, fallbackKey) {
  const cacheKey = skillPath;
  const cached = templateCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }
  
  const data = extractTemplateInfo(skillPath, fallbackKey);
  templateCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

function clearTemplateCache() {
  templateCache.clear();
}

// ==================== DeerFlow借鉴2: 并发目录扫描 ====================

/**
 * 并发扫描目录 - 替代递归串行扫描
 */
async function scanDirectoriesConcurrently(dirs) {
  const results = await Promise.allSettled(
    dirs.map(dir => scanDirAsync(dir))
  );
  
  const templates = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      Object.assign(templates, result.value);
    } else {
      console.warn(`[FusionScheduler] 目录扫描失败: ${dirs[index]}`, result.reason);
    }
  });
  return templates;
}

async function scanDirAsync(dir, relativePath = '') {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(dir)) {
        resolve({});
        return;
      }
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const promises = [];
      const files = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          promises.push(scanDirAsync(fullPath, relPath));
        } else if (entry.name.endsWith('.md')) {
          const key = relPath.replace(/\.md$/, '').replace(/\\/g, '/');
          files.push({ key, fullPath, name: entry.name.replace('.md', '') });
        }
      }
      
      Promise.all(promises).then(childResults => {
        const templates = {};
        childResults.forEach(child => Object.assign(templates, child));
        
        // 处理文件
        for (const file of files) {
          const info = getCachedTemplateInfo(file.fullPath, file.name);
          templates[file.key] = {
            name: info.name,
            path: file.fullPath,
            category: info.category || path.dirname(file.key).replace(/\\/g, '/'),
            triggers: info.triggers,
            capabilities: info.capabilities,
            source: 'agency-registry',
            discovered: true
          };
        }
        
        resolve(templates);
      }).catch(reject);
      
    } catch (e) {
      reject(e);
    }
  });
}

// ==================== DeerFlow借鉴3: 中间件管道 ====================

class SchedulerMiddleware {
  before_plan(taskText, context) { return { taskText, context }; }
  after_plan(plan, context) { return plan; }
  on_error(error, context) { return context; }
}

class SchedulerPipeline {
  constructor() {
    this.middlewares = [];
  }
  
  use(mw) {
    this.middlewares.push(mw);
    return this;
  }
  
  execute_plan(taskText, context, planFn) {
    let ctx = { taskText, context, errors: [] };
    
    // BEFORE钩子
    for (const mw of this.middlewares) {
      try {
        const result = mw.before_plan(ctx.taskText, ctx.context);
        ctx.taskText = result.taskText;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(`[${mw.constructor.name}] ${e.message}`);
        mw.on_error(e, ctx);
      }
    }
    
    // 执行规划
    let plan;
    try {
      plan = planFn(ctx.taskText, ctx.context);
    } catch (e) {
      ctx.errors.push(`[PlanFn] ${e.message}`);
      for (const mw of this.middlewares) {
        mw.on_error(e, ctx);
      }
      plan = { success: false, error: e.message };
    }
    
    // AFTER钩子
    for (const mw of this.middlewares) {
      try {
        plan = mw.after_plan(plan, ctx.context) || plan;
      } catch (e) {
        ctx.errors.push(`[${mw.constructor.name}] ${e.message}`);
      }
    }
    
    // 添加错误信息到plan
    if (ctx.errors.length > 0) {
      plan.middlewareErrors = ctx.errors;
    }
    
    return plan;
  }
}

// 具体中间件
class InputNormalizationMiddleware extends SchedulerMiddleware {
  before_plan(taskText, context) {
    // 规范化输入
    const normalized = taskText
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
    return { taskText: normalized, context };
  }
}

class TaskEnrichmentMiddleware extends SchedulerMiddleware {
  after_plan(plan, context) {
    // 丰富plan信息
    plan.pipelineVersion = '2.0';
    plan.plannedAt = new Date().toISOString();
    return plan;
  }
}

class FallbackMiddleware extends SchedulerMiddleware {
  constructor(fusionScheduler) {
    super();
    this.scheduler = fusionScheduler;
  }
  
  after_plan(plan, context) {
    // 如果匹配失败，尝试回退策略
    if (!plan.success || plan.plans.every(p => !p.equipped)) {
      return this.applyFallback(plan, context);
    }
    return plan;
  }
  
  applyFallback(plan, context) {
    // 回退到通用模板
    plan.fallbackApplied = true;
    plan.fallbackStrategy = 'generic_template';
    return plan;
  }
}

// ==================== 核心调度器类 ====================

class FusionScheduler {
  constructor() {
    this.pipeline = new SchedulerPipeline();
    this.pipeline.use(new InputNormalizationMiddleware());
    this.pipeline.use(new TaskEnrichmentMiddleware());
    
    this.registry = null;
    this.registryLoaded = false;
  }
  
  // 延迟加载mapping-loader
  getMappingLoader() {
    if (!mappingLoader) {
      try {
        mappingLoader = require(MAPPING_LOADER_PATH);
      } catch (e) {
        console.warn('[FusionScheduler] mapping-loader.js 加载失败');
      }
    }
    return mappingLoader;
  }
  
  // 应用category映射
  applyCategoryMapping(category, agentName) {
    const loader = this.getMappingLoader();
    if (!loader) {
      return { mappedCategory: category, wasMapped: false };
    }
    return loader.getMappedCategory(category, agentName);
  }
  
  // 加载注册表
  loadRegistry() {
    try {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const registry = JSON.parse(content);
      
      // 动态扫描personas
      const dynamicPersonas = this.scanDynamicPersonas();
      for (const [name, persona] of Object.entries(dynamicPersonas)) {
        if (!registry.personas[name]) {
          registry.personas[name] = persona;
        }
      }
      
      this.registry = registry;
      this.registryLoaded = true;
      return registry;
    } catch (e) {
      console.error('[FusionScheduler] 注册表加载失败:', e.message);
      return null;
    }
  }
  
  // 扫描女娲人格
  scanDynamicPersonas() {
    const agentsDir = path.join(WORKSPACE, 'brain', 'agents');
    const personas = {};
    
    if (!fs.existsSync(agentsDir)) {
      return personas;
    }
    
    try {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const dirName = entry.name;
        const skillPath = path.join(agentsDir, dirName, 'SKILL.md');
        
        if (!fs.existsSync(skillPath)) continue;
        
        const info = this.extractPersonaInfo(skillPath, dirName);
        const personaName = info.name;
        
        personas[personaName] = {
          name: personaName,
          path: skillPath,
          type: 'nuwa',
          description: info.description,
          triggers: info.triggers,
          source: 'brain/agents',
          discovered: true
        };
      }
    } catch (e) {
      console.error('[FusionScheduler] 扫描brain/agents失败:', e.message);
    }
    
    return personas;
  }
  
  // 提取人格信息
  extractPersonaInfo(skillPath, fallbackName) {
    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      
      // 提取名称
      let realName = null;
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/m);
      if (frontmatterMatch) {
        const descMatch = frontmatterMatch[1].match(/description:[\s]*[|:]?\s*([^\n]+)/);
        if (descMatch) {
          const viewMatch = descMatch[1].match(/([^\s*]+)视角/);
          if (viewMatch) realName = viewMatch[1].trim();
        }
      }
      
      const personaName = realName || fallbackName;
      
      // 提取描述
      let description = personaName;
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('## ') && !line.includes('---')) {
          const title = line.replace('## ', '').trim();
          if (title && title !== '角色信息' && title !== '核心能力') {
            description = title;
            break;
          }
        }
      }
      
      // 提取触发词
      let triggers = [];
      const triggerMatch = content.match(/triggers:\s*\[([^\]]+)\]/i);
      if (triggerMatch) {
        triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
      }
      
      if (triggers.length === 0) {
        const words = content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
        const filtered = words.filter(w => !['角色信息', '核心能力', '适用场景'].includes(w));
        triggers = [...new Set(filtered)].slice(0, 8);
      }
      
      if (!triggers.includes(personaName)) {
        triggers.unshift(personaName);
      }
      
      return { name: personaName, description, triggers };
    } catch (e) {
      return { name: fallbackName, description: fallbackName, triggers: [fallbackName] };
    }
  }
  
  // 匹配触发词
  matchTriggers(taskText, triggers, rules = {}) {
    const { caseSensitive = false } = rules;
    const text = caseSensitive ? taskText : taskText.toLowerCase();
    let matchCount = 0;
    let exactMatch = false;
    
    for (const trigger of triggers) {
      const triggerText = caseSensitive ? trigger : trigger.toLowerCase();
      if (text.includes(triggerText)) {
        matchCount++;
        if (text === triggerText) exactMatch = true;
      }
    }
    
    if (matchCount === 0) return 0;
    
    let score = 0.6;
    score += Math.min((matchCount - 1) * 0.05, 0.2);
    if (exactMatch) score += 0.2;
    if (matchCount >= 5) score = 1.0;
    
    return Math.min(score, 1.0);
  }
  
  // 查找最佳人格
  findMatchingPersona(taskText, registry) {
    const { personas, matchingRules } = registry;
    let bestMatch = null;
    const threshold = matchingRules?.matchThreshold || 0.6;
    
    for (const [name, persona] of Object.entries(personas)) {
      if (taskText.includes(name)) {
        const score = 0.9;
        if (score >= threshold) {
          bestMatch = { name, ...persona, matchScore: score, matchType: 'direct' };
        }
        continue;
      }
      
      const score = this.matchTriggers(taskText, persona.triggers || [], matchingRules);
      if (score >= threshold) {
        bestMatch = { name, ...persona, matchScore: score, matchType: 'trigger' };
      }
    }
    
    return bestMatch;
  }
  
  // 查找最佳模板
  findMatchingAgencyTemplate(taskText, registry) {
    const { agencyTemplates, matchingRules } = registry;
    let bestMatch = null;
    const threshold = matchingRules?.matchThreshold || 0.6;
    
    for (const [name, template] of Object.entries(agencyTemplates)) {
      if (taskText.includes(name)) {
        const score = 0.9;
        if (score >= threshold) {
          bestMatch = { name, ...template, matchScore: score, matchType: 'direct' };
        }
        continue;
      }
      
      const score = this.matchTriggers(taskText, template.triggers || [], matchingRules);
      if (score >= threshold) {
        bestMatch = { name, ...template, matchScore: score, matchType: 'trigger' };
      }
    }
    
    return bestMatch;
  }
  
  // 加载SKILL内容
  loadSkillContent(skillPath) {
    try {
      const workspacePath = path.join(WORKSPACE, skillPath);
      if (fs.existsSync(workspacePath)) {
        return fs.readFileSync(workspacePath, 'utf8');
      }
      if (fs.existsSync(skillPath)) {
        return fs.readFileSync(skillPath, 'utf8');
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  
  // 检查明确提到的人格
  findExplicitPersonaMention(taskText, registry) {
    const { personas } = registry;
    for (const [name, persona] of Object.entries(personas)) {
      if (taskText.includes(name)) {
        return { name, ...persona, matchScore: 0.95, matchType: 'explicit' };
      }
    }
    return null;
  }
  
  // 生成装备计划
  generateEquipPlan(subTask, registry) {
    const plan = {
      subTask: subTask,
      equipped: false,
      type: null,
      name: null,
      skillContent: null,
      skillPath: null,
      fallback: false,
      reasoning: []
    };
    
    const taskText = subTask.description || subTask.text || JSON.stringify(subTask);
    
    // 特殊处理：明确提到人格
    const explicitPersona = this.findExplicitPersonaMention(taskText, registry);
    if (explicitPersona) {
      plan.equipped = true;
      plan.type = 'nuwa';
      plan.name = explicitPersona.name;
      plan.skillPath = explicitPersona.path;
      plan.skillContent = this.loadSkillContent(explicitPersona.path);
      plan.matchScore = explicitPersona.matchScore;
      plan.reasoning.push(`明确提到人格: ${explicitPersona.name}`);
      return plan;
    }
    
    // 按优先级检查
    const { priorityOrder } = registry.matchingRules || { priorityOrder: ['persona', 'agencyTemplate'] };
    
    for (const type of priorityOrder) {
      if (type === 'persona') {
        const persona = this.findMatchingPersona(taskText, registry);
        if (persona) {
          plan.equipped = true;
          plan.type = 'nuwa';
          plan.name = persona.name;
          plan.skillPath = persona.path;
          plan.skillContent = this.loadSkillContent(persona.path);
          plan.matchScore = persona.matchScore;
          plan.reasoning.push(`匹配人格: ${persona.name}`);
          return plan;
        }
      }
      
      if (type === 'agencyTemplate') {
        const template = this.findMatchingAgencyTemplate(taskText, registry);
        if (template) {
          const mappingResult = this.applyCategoryMapping(template.category, template.name);
          plan.equipped = true;
          plan.type = 'agency';
          plan.name = template.name;
          plan.skillPath = template.path;
          plan.skillContent = this.loadSkillContent(template.path);
          plan.matchScore = template.matchScore;
          plan.category = template.category;
          plan.mapping = mappingResult;
          plan.reasoning.push(`匹配模板: ${template.name}`);
          return plan;
        }
      }
    }
    
    plan.fallback = true;
    plan.type = 'custom';
    plan.reasoning.push('触发Fallback');
    return plan;
  }
  
  // 批量生成计划
  generateBatchPlans(subTasks, registry) {
    return subTasks.map((task, index) => {
      const plan = this.generateEquipPlan(task, registry);
      plan.index = index;
      plan.taskId = task.id || `task_${index}`;
      return plan;
    });
  }
  
  // 装备prompt
  equipPrompt(plan, basePrompt) {
    if (!plan.equipped || !plan.skillContent) {
      return basePrompt;
    }
    
    if (plan.type === 'nuwa') {
      return `${basePrompt}\n\n--- 女娲人格注入 ---\n你扮演: ${plan.name}\n${plan.skillContent}\n--- 人格注入结束 ---`;
    }
    
    if (plan.type === 'agency') {
      return `${basePrompt}\n\n--- Agency角色装备 ---\n角色: ${plan.name}\n${plan.skillContent}\n--- 角色装备结束 ---`;
    }
    
    return basePrompt;
  }
  
  // 主规划函数
  planEquip(subTasks, options = {}) {
    // 使用管道执行
    const planFn = (taskText, context) => {
      if (!this.registry) {
        this.loadRegistry();
      }
      
      if (!this.registry) {
        return { success: false, error: '注册表加载失败', plans: [] };
      }
      
      const taskArray = Array.isArray(subTasks) ? subTasks : [subTasks];
      const plans = this.generateBatchPlans(taskArray, this.registry);
      
      return {
        success: true,
        plans: plans,
        summary: {
          total: plans.length,
          equipped: plans.filter(p => p.equipped).length,
          fallback: plans.filter(p => p.fallback).length,
          nuwaCount: plans.filter(p => p.type === 'nuwa').length,
          agencyCount: plans.filter(p => p.type === 'agency').length,
          customCount: plans.filter(p => p.type === 'custom').length
        }
      };
    };
    
    return this.pipeline.execute_plan(
      Array.isArray(subTasks) ? subTasks.map(t => t.description || JSON.stringify(t)).join('; ') : (subTasks.description || JSON.stringify(subTasks)),
      { options },
      planFn
    );
  }
  
  // 列出人格
  listPersonas() {
    if (!this.registry) this.loadRegistry();
    if (!this.registry) return [];
    return Object.entries(this.registry.personas || {}).map(([name, data]) => ({
      name,
      description: data.description,
      triggers: data.triggers
    }));
  }
  
  // 列出模板
  listTemplates() {
    if (!this.registry) this.loadRegistry();
    if (!this.registry) return [];
    return Object.entries(this.registry.agencyTemplates || {}).map(([name, data]) => ({
      name,
      category: data.category,
      capabilities: data.capabilities,
      triggers: data.triggers
    }));
  }
  
  // 清除缓存
  clearCache() {
    clearTemplateCache();
  }
}

// 导出单例和类
const scheduler = new FusionScheduler();

module.exports = {
  FusionScheduler,
  scheduler,
  SchedulerPipeline,
  SchedulerMiddleware,
  clearTemplateCache
};

// 直接运行时显示状态
if (require.main === module) {
  console.log('=== 融合调度器 v2.0 状态 ===');
  console.log('新增功能:');
  console.log('  - 中间件管道钩子');
  console.log('  - 模板提取缓存');
  console.log('  - 并发目录扫描');
  console.log('');
  const registry = scheduler.loadRegistry();
  if (registry) {
    console.log(`女娲人格: ${Object.keys(registry.personas || {}).length}个`);
    console.log(`Agency模板: ${Object.keys(registry.agencyTemplates || {}).length}个`);
  }
}
