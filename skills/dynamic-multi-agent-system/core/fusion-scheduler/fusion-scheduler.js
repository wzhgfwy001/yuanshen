/**
 * 融合调度器 - Fusion Scheduler
 * 
 * 核心功能：
 * 1. 分析任务，匹配女娲人格或Agency模板
 * 2. 自动装备对应的SKILL.md内容
 * 3. 无匹配时spawn自定义子Agent
 * 
 * 使用方式：
 * const scheduler = require('./fusion-scheduler.js');
 * const equipPlan = await scheduler.planEquip(subTask, registry);
 */

const fs = require('fs');
const path = require('path');

// 注册表路径
const REGISTRY_PATH = path.join(__dirname, 'fusion-registry.json');

// 工作空间路径
const WORKSPACE = process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace';

// Agency模板目录 - 完整agency-registry (230个模板)
const AGENCY_REGISTRY_DIR = path.join(__dirname, '..', '..', 'agency-registry');

// 映射加载器 - category-mapping.json 集成
const MAPPING_LOADER_PATH = path.join(__dirname, '..', 'subagent-manager', 'mapping-loader.js');
let mappingLoader = null;

// 延迟加载mapping-loader（避免循环依赖）
function getMappingLoader() {
  if (!mappingLoader) {
    try {
      mappingLoader = require(MAPPING_LOADER_PATH);
      console.log('[FusionScheduler] mapping-loader.js 集成成功');
    } catch (e) {
      console.warn('[FusionScheduler] mapping-loader.js 加载失败:', e.message);
      mappingLoader = null;
    }
  }
  return mappingLoader;
}

/**
 * 应用category映射（Issue #67648修复）
 * @param {string} category - 原始分类
 * @param {string} agentName - Agent名称
 * @returns {object} { mappedCategory, wasMapped, source }
 */
function applyCategoryMapping(category, agentName) {
  const loader = getMappingLoader();
  if (!loader) {
    return { mappedCategory: category, wasMapped: false, source: 'no_loader' };
  }
  
  const result = loader.getMappedCategory(category, agentName);
  
  if (result.wasMapped) {
    console.log(`[FusionScheduler] 分类映射: ${category}/${agentName} → ${result.mappedCategory}`);
  }
  
  return result;
}

/**
 * 加载注册表
 */
function loadRegistry() {
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(content);
    
    // 1. 动态扫描brain/agents，发现新的人格（女娲蒸馏）
    const dynamicPersonas = scanDynamicPersonas();
    for (const [name, persona] of Object.entries(dynamicPersonas)) {
      if (!registry.personas[name]) {
        registry.personas[name] = persona;
        console.log(`[FusionScheduler] 发现新女娲人格: ${name}`);
      } else {
        registry.personas[name].path = persona.path;
        registry.personas[name].triggers = persona.triggers;
      }
    }
    
    // 2. 动态扫描roles/目录，发现新的Agency模板
    const dynamicTemplates = scanDynamicAgencyTemplates();
    for (const [key, template] of Object.entries(dynamicTemplates)) {
      if (!registry.agencyTemplates[key]) {
        registry.agencyTemplates[key] = template;
        console.log(`[FusionScheduler] 发现新Agency模板: ${template.name}`);
      }
    }
    
    return registry;
  } catch (e) {
    console.error('[FusionScheduler] 注册表加载失败:', e.message);
    return null;
  }
}

/**
 * 动态扫描agency-registry目录，发现所有Agency模板（递归扫描子目录）
 */
function scanDynamicAgencyTemplates() {
  const templates = {};
  
  if (!fs.existsSync(AGENCY_REGISTRY_DIR)) {
    return templates;
  }
  
  // 递归扫描所有.md文件
  function scanDir(dir, relativePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // 递归扫描子目录
          scanDir(fullPath, relPath);
        } else if (entry.name.endsWith('.md')) {
          // 构建key：category/filename 或 filename
          const key = relPath.replace(/\.md$/, '').replace(/\\/g, '/');
          const info = extractTemplateInfo(fullPath, entry.name.replace('.md', ''));
          
          templates[key] = {
            name: info.name,
            path: fullPath,
            category: info.category || path.dirname(relPath).replace(/\\/g, '/'),
            triggers: info.triggers,
            capabilities: info.capabilities,
            source: 'agency-registry',
            discovered: true
          };
        }
      }
    } catch (e) {
      console.error(`[FusionScheduler] 扫描${dir}失败:`, e.message);
    }
  }
  
  scanDir(AGENCY_REGISTRY_DIR);
  return templates;
}

/**
 * 从Agency模板文件提取信息
 */
function extractTemplateInfo(skillPath, fallbackKey) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    
    // 提取模板名称（从标题）
    let name = fallbackKey;
    const titleMatch = content.match(/^#\s+(.+?)\s*[-–]/m);
    if (titleMatch) {
      name = titleMatch[1].trim();
    }
    
    // 提取分类（从适用任务或角色ID）
    let category = 'general';
    const categoryMatch = content.match(/专业领域[：:]\s*([^\n]+)/);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
    }
    
    // 提取触发词（从标题名称和职责中提取关键词）
    const triggers = [];
    
    // 从文件名提取（已转为key）
    const keyWords = fallbackKey.split(/[-_]/).filter(w => w.length > 1 && w !== 'md');
    triggers.push(...keyWords);
    
    // 从标题提取
    const titleWords = name.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    triggers.push(...titleWords);
    
    // 从职责中提取
    const dutiesMatch = content.match(/职责\n([\s\S]+?)\n---/);
    if (dutiesMatch) {
      const duties = dutiesMatch[1];
      const dutyWords = duties.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
      triggers.push(...dutyWords.slice(0, 5));
    }
    
    // 提取能力列表
    const capabilities = [];
    const skillsMatch = content.match(/技能\n([\s\S]+?)\n---/);
    if (skillsMatch) {
      const skills = skillsMatch[1];
      const skillLines = skills.split('\n').filter(l => l.trim());
      for (const line of skillLines) {
        const skill = line.replace(/^[-*•\s]+/, '').trim();
        if (skill) capabilities.push(skill);
      }
    }
    
    return {
      name,
      category,
      triggers: [...new Set(triggers)],
      capabilities
    };
  } catch (e) {
    return {
      name: fallbackKey,
      category: 'general',
      triggers: [fallbackKey],
      capabilities: []
    };
  }
}

/**
 * 动态扫描brain/agents目录，发现所有女娲人格
 */
function scanDynamicPersonas() {
  const agentsDir = path.join(WORKSPACE, 'brain', 'agents');
  const personas = {};
  
  if (!fs.existsSync(agentsDir)) {
    return personas;
  }
  
  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const dirName = entry.name;  // 目录名（英文）
      const skillPath = path.join(agentsDir, dirName, 'SKILL.md');
      
      if (!fs.existsSync(skillPath)) continue;
      
      // 提取人格信息（info.name是真实中文名）
      const info = extractPersonaInfo(skillPath, dirName);
      const personaName = info.name;  // 使用真实名称（如"毛泽东"）作为key
      
      personas[personaName] = {
        name: personaName,
        path: skillPath,
        type: 'nuwa',
        description: info.description,
        triggers: info.triggers,
        source: 'brain/agents',
        discovered: true,
        originalDir: dirName  // 保留原始目录名
      };
    }
  } catch (e) {
    console.error('[FusionScheduler] 扫描brain/agents失败:', e.message);
  }
  
  return personas;
}

/**
 * 从SKILL.md提取人格信息
 */
function extractPersonaInfo(skillPath, fallbackName) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    
    // 提取真正的角色名称（多种方式尝试）
    let realName = null;
    
    // 方式1: frontmatter中description包含的"XX视角"或"XX·"
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/m);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      // 匹配description: | 或 description: 后面包含的中文名
      const descMatch = fm.match(/description:[\s]*[|:]?\s*([^\n]+)/);
      if (descMatch) {
        const descText = descMatch[1];
        // 提取"XX视角"或"XX·"格式
        const viewMatch = descText.match(/([^\s*]+)视角/);
        if (viewMatch) {
          realName = viewMatch[1].trim();
        } else {
          // 尝试提取第一个2-4字的中文词组
          const chineseMatch = descText.match(/[\u4e00-\u9fa5]{2,4}/);
          if (chineseMatch) {
            realName = chineseMatch[0];
          }
        }
      }
    }
    
    // 方式2: 表格中的"角色名称"或"**名字**"
    if (!realName) {
      const nameMatch = content.match(/角色名称\s*[|:]\s*\*\*([^\*]+)\*\*/);
      if (nameMatch) {
        realName = nameMatch[1].trim();
      }
    }
    
    // 方式3: 标题格式 # 名字 · ... 或 # 名字 - ...
    if (!realName) {
      const titleMatch = content.match(/^#\s+([^\s·-]+?)(?:\s*[·-]|$)/m);
      if (titleMatch) {
        realName = titleMatch[1].trim();
      }
    }
    
    // 方式4: 标题格式 # 名字AI角色
    if (!realName) {
      const titleMatch = content.match(/^#\s*([^\n#]+?)AI角色/i);
      if (titleMatch) {
        realName = titleMatch[1].trim();
      }
    }
    
    // 使用真实名称或回退到目录名
    const personaName = realName || fallbackName;
    
    // 提取描述（从第一个##标题）
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
    
    // 优先从triggers字段提取
    const triggerMatch = content.match(/triggers:\s*\[([^\]]+)\]/i);
    if (triggerMatch) {
      triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
    }
    
    // 如果没有triggers字段，从内容中提取关键词
    if (triggers.length === 0) {
      // 提取2-4个字的词
      const words = content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
      // 过滤掉常见无意义词
      const filtered = words.filter(w => !['角色信息', '核心能力', '适用场景', '思想对话', '人生指导', '诗词鉴赏', '回答工作流'].includes(w));
      triggers = [...new Set(filtered)].slice(0, 8);
    }
    
    // 确保真实名字在触发词中
    if (!triggers.includes(personaName)) {
      triggers.unshift(personaName);
    }
    
    return { 
      name: personaName,
      description, 
      triggers: [...new Set(triggers)] 
    };
  } catch (e) {
    return { 
      name: fallbackName, 
      description: fallbackName, 
      triggers: [fallbackName] 
    };
  }
}

/**
 * 保存注册表
 */
function saveRegistry(registry) {
  try {
    registry.updated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[FusionScheduler] 注册表保存失败:', e.message);
    return false;
  }
}

/**
 * 匹配触发词
 * @param {string} taskText - 任务描述
 * @param {string[]} triggers - 触发词列表
 * @param {object} rules - 匹配规则
 * @returns {number} 匹配分数 0-1
 */
function matchTriggers(taskText, triggers, rules = {}) {
  const { 
    caseSensitive = false, 
    allowPartialMatch = true 
  } = rules;
  
  const text = caseSensitive ? taskText : taskText.toLowerCase();
  let matchCount = 0;
  let exactMatch = false;
  
  for (const trigger of triggers) {
    const triggerText = caseSensitive ? trigger : trigger.toLowerCase();
    
    if (text.includes(triggerText)) {
      matchCount++;
      
      // 检查是否是精确匹配（整个任务文本就是这个触发词）
      if (text === triggerText) {
        exactMatch = true;
      }
    }
  }
  
  // 如果没有任何匹配
  if (matchCount === 0) {
    return 0;
  }
  
  // 有匹配：基础分数0.6，多重匹配和精确匹配加分
  let score = 0.6;
  
  // 多重匹配加分（每多一个+0.05，上限0.2）
  score += Math.min((matchCount - 1) * 0.05, 0.2);
  
  // 精确匹配加分
  if (exactMatch) {
    score += 0.2;
  }
  
  // 匹配数超过5个给满分
  if (matchCount >= 5) {
    score = 1.0;
  }
  
  return Math.min(score, 1.0);
}

/**
 * 查找最佳匹配的女娲人格
 * @param {string} taskText - 任务描述
 * @param {object} registry - 注册表
 * @returns {object|null} 匹配的人格或null
 */
function findMatchingPersona(taskText, registry) {
  const { personas, matchingRules } = registry;
  let bestMatch = null;
  let bestScore = matchingRules.matchThreshold || 0.6;
  
  for (const [name, persona] of Object.entries(personas)) {
    // 首先检查直接名字匹配（高优先级）
    if (taskText.includes(name)) {
      const directScore = 0.9; // 直接名字匹配给0.9分
      if (directScore >= bestScore) {
        bestScore = directScore;
        bestMatch = { name, ...persona, matchScore: directScore, matchType: 'direct' };
      }
      continue;
    }
    
    // 然后检查触发词匹配
    const score = matchTriggers(taskText, persona.triggers || [], matchingRules);
    
    if (score >= bestScore) {
      bestScore = score;
      bestMatch = { name, ...persona, matchScore: score, matchType: 'trigger' };
    }
  }
  
  return bestMatch;
}

/**
 * 查找最佳匹配的Agency模板
 * @param {string} taskText - 任务描述
 * @param {object} registry - 注册表
 * @returns {object|null} 匹配的模板或null
 */
function findMatchingAgencyTemplate(taskText, registry) {
  const { agencyTemplates, matchingRules } = registry;
  let bestMatch = null;
  let bestScore = matchingRules.matchThreshold || 0.6;
  
  for (const [name, template] of Object.entries(agencyTemplates)) {
    // 首先检查直接名字匹配（高优先级）
    if (taskText.includes(name)) {
      const directScore = 0.9; // 直接名字匹配给0.9分
      if (directScore >= bestScore) {
        bestScore = directScore;
        bestMatch = { name, ...template, matchScore: directScore, matchType: 'direct' };
      }
      continue;
    }
    
    // 然后检查触发词匹配
    const score = matchTriggers(taskText, template.triggers || [], matchingRules);
    
    if (score >= bestScore) {
      bestScore = score;
      bestMatch = { name, ...template, matchScore: score, matchType: 'trigger' };
    }
  }
  
  return bestMatch;
}

/**
 * 读取SKILL.md内容
 * @param {string} skillPath - 相对路径
 * @returns {string|null} SKILL内容或null
 */
function loadSkillContent(skillPath) {
  try {
    // skillPath是相对于workspace的
    const workspacePath = path.join(
      process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace',
      skillPath
    );
    
    if (fs.existsSync(workspacePath)) {
      return fs.readFileSync(workspacePath, 'utf8');
    }
    
    // 尝试直接读取
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf8');
    }
    
    return null;
  } catch (e) {
    console.error('[FusionScheduler] SKILL加载失败:', skillPath, e.message);
    return null;
  }
}

/**
 * 生成装备计划
 * @param {object} subTask - 子任务
 * @param {object} registry - 注册表
 * @returns {object} 装备计划
 */
function generateEquipPlan(subTask, registry) {
  const { priorityOrder } = registry.matchingRules;
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
  
  // 特殊处理：如果任务明确提到女娲人格名字，跳过Agency直接装备人格
  const explicitPersona = findExplicitPersonaMention(taskText, registry);
  if (explicitPersona) {
    plan.equipped = true;
    plan.type = 'nuwa';
    plan.name = explicitPersona.name;
    plan.skillPath = explicitPersona.path;
    plan.skillContent = loadSkillContent(explicitPersona.path);
    plan.matchScore = explicitPersona.matchScore;
    plan.reasoning.push(`明确提到女娲人格: ${explicitPersona.name} (${explicitPersona.matchScore})`);
    return plan;
  }
  
  // 按优先级检查（Agency优先）
  for (const type of priorityOrder) {
    if (type === 'persona') {
      const persona = findMatchingPersona(taskText, registry);
      if (persona) {
        plan.equipped = true;
        plan.type = 'nuwa';
        plan.name = persona.name;
        plan.skillPath = persona.path;
        plan.skillContent = loadSkillContent(persona.path);
        plan.matchScore = persona.matchScore;
        plan.reasoning.push(`匹配女娲人格: ${persona.name} (${persona.matchScore})`);
        return plan;
      }
      plan.reasoning.push('未匹配到女娲人格');
    }
    
    if (type === 'agencyTemplate') {
      const template = findMatchingAgencyTemplate(taskText, registry);
      if (template) {
        // 应用category映射（Issue #67648修复）
        const mappingResult = applyCategoryMapping(template.category, template.name);
        
        plan.equipped = true;
        plan.type = 'agency';
        plan.name = template.name;
        plan.skillPath = template.path;
        plan.skillContent = loadSkillContent(template.path);
        plan.matchScore = template.matchScore;
        plan.category = template.category;
        plan.mapping = mappingResult;  // 添加映射信息
        plan.reasoning.push(`匹配Agency模板: ${template.name} (${template.matchScore})`);
        if (mappingResult.wasMapped) {
          plan.reasoning.push(`分类映射: ${template.category} → ${mappingResult.mappedCategory}`);
        }
        return plan;
      }
      plan.reasoning.push('未匹配到Agency模板');
    }
  }
  
  // 触发fallback
  plan.fallback = true;
  plan.type = 'custom';
  plan.reasoning.push('触发Fallback: 无匹配，spawn自定义Agent');
  
  return plan;
}

/**
 * 检查任务是否明确提到某个女娲人格名字
 * @param {string} taskText - 任务描述
 * @param {object} registry - 注册表
 * @returns {object|null} 匹配的人格或null
 */
function findExplicitPersonaMention(taskText, registry) {
  const { personas } = registry;
  
  for (const [name, persona] of Object.entries(personas)) {
    // 如果任务文本包含人格名字，认为是"明确提到"
    if (taskText.includes(name)) {
      return { name, ...persona, matchScore: 0.95, matchType: 'explicit' };
    }
  }
  
  return null;
}

/**
 * 批量生成装备计划
 * @param {array} subTasks - 子任务列表
 * @param {object} registry - 注册表
 * @returns {array} 装备计划列表
 */
function generateBatchPlans(subTasks, registry) {
  return subTasks.map((task, index) => {
    const plan = generateEquipPlan(task, registry);
    plan.index = index;
    plan.taskId = task.id || `task_${index}`;
    return plan;
  });
}

/**
 * 为子Agent生成装备prompt
 * @param {object} plan - 装备计划
 * @param {string} basePrompt - 基础prompt
 * @returns {string} 增强后的prompt
 */
function equipPrompt(plan, basePrompt) {
  if (!plan.equipped || !plan.skillContent) {
    return basePrompt;
  }
  
  if (plan.type === 'nuwa') {
    return `${basePrompt}

--- 女娲人格注入 ---
你扮演: ${plan.name}
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
 * 自动注册新人格（女娲蒸馏后自动调用）
 * @param {string} name - 人格名称
 * @param {string} skillPath - SKILL.md路径
 * @param {string[]} triggers - 触发词
 * @param {string} description - 描述
 */
function registerPersona(name, skillPath, triggers, description) {
  const registry = loadRegistry();
  if (!registry) return false;
  
  registry.personas[name] = {
    name,
    path: skillPath,
    type: 'nuwa',
    description: description || '',
    triggers: triggers || [],
    autoRegistered: true,
    registeredAt: new Date().toISOString()
  };
  
  return saveRegistry(registry);
}

/**
 * 自动注册新模板
 * @param {string} name - 模板名称
 * @param {string} skillPath - SKILL.md路径
 * @param {string[]} triggers - 触发词
 * @param {string} category - 分类
 */
function registerTemplate(name, skillPath, triggers, category) {
  const registry = loadRegistry();
  if (!registry) return false;
  
  registry.agencyTemplates[name] = {
    name,
    path: skillPath,
    category: category || 'general',
    triggers: triggers || [],
    autoRegistered: true,
    registeredAt: new Date().toISOString()
  };
  
  return saveRegistry(registry);
}

/**
 * 获取所有可用的人格列表
 */
function listPersonas() {
  const registry = loadRegistry();
  if (!registry) return [];
  
  return Object.entries(registry.personas).map(([name, data]) => ({
    name,
    description: data.description,
    triggers: data.triggers
  }));
}

/**
 * 获取所有可用的模板列表
 */
function listTemplates() {
  const registry = loadRegistry();
  if (!registry) return [];
  
  return Object.entries(registry.agencyTemplates).map(([name, data]) => ({
    name,
    category: data.category,
    capabilities: data.capabilities,
    triggers: data.triggers
  }));
}

// 主调度函数
function planEquip(subTasks, options = {}) {
  const registry = loadRegistry();
  if (!registry) {
    return {
      success: false,
      error: '注册表加载失败',
      plans: []
    };
  }
  
  // 支持单个任务或多个任务
  const taskArray = Array.isArray(subTasks) ? subTasks : [subTasks];
  
  const plans = generateBatchPlans(taskArray, registry);
  
  return {
    success: true,
    registry: registry.matchingRules,
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
}

// 导出模块
module.exports = {
  // 核心函数
  loadRegistry,
  saveRegistry,
  matchTriggers,
  findMatchingPersona,
  findMatchingAgencyTemplate,
  loadSkillContent,
  generateEquipPlan,
  generateBatchPlans,
  equipPrompt,
  
  // 注册函数
  registerPersona,
  registerTemplate,
  
  // 查询函数
  listPersonas,
  listTemplates,
  
  // 主函数
  planEquip
};

// 如果直接运行，显示状态
if (require.main === module) {
  console.log('=== 融合调度器状态 ===');
  const registry = loadRegistry();
  if (registry) {
    console.log(`女娲人格: ${Object.keys(registry.personas).length}个`);
    console.log(`Agency模板: ${Object.keys(registry.agencyTemplates).length}个`);
    console.log(`更新日期: ${registry.updated}`);
    console.log('\n可用人格:');
    listPersonas().forEach(p => console.log(`  - ${p.name}: ${p.description}`));
    console.log('\n可用模板:');
    listTemplates().forEach(t => console.log(`  - ${t.name} (${t.category})`));
  } else {
    console.log('注册表加载失败');
  }
}
