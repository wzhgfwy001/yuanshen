/**
 * team-builder.js - 子Agent团队组建器
 * 
 * 【召唤盟友】功能模块
 * 
 * 功能：
 * - 根据任务分解结果组建子Agent团队
 * - 读取 roles/ 目录中的角色定义
 * - 根据复杂度分配Agent数量
 * - 为每个子任务分配合适的Agent角色
 * 
 * 角色分配原则：
 * - 基于任务上下文分解
 * - 一个Agent可承担多个Skill（非1:1对应）
 * - 根据复杂度分配：简单1-2个，中等3个，复杂4-6个
 * 
 * 导出函数：
 * - buildTeam(taskDecomposition, complexity) - 组建团队
 * - assignRoles(taskParts) - 分配角色
 * - getAvailableRoles() - 获取可用角色列表
 */

const fs = require('fs');
const path = require('path');

// ===== 配置路径（Windows兼容）=====
const ROLES_DIR = path.join(__dirname, 'subagent-manager', 'roles');
const MAPPING_LOADER_PATH = path.join(__dirname, 'subagent-manager', 'mapping-loader.js');

// ===== 角色缓存 =====
let _rolesCache = null;
let _rolesCacheTime = null;
const ROLES_CACHE_TTL = 60000; // 60秒缓存

// ===== 模型选择矩阵 =====
const MODEL_SELECTION = {
  'creative-writing': 'qwen3.5-plus',
  'complex-reasoning': 'qwen3-max',
  'code-development': 'qwen3-coder-plus',
  'fast-execution': 'MiniMax-M2.5',
  'default': 'qwen3.5-plus'
};

// ===== 复杂度与Agent数量映射 =====
const COMPLEXITY_AGENT_MAP = {
  'simple': { min: 1, max: 2 },
  'standard': { min: 2, max: 3 },
  'medium': { min: 3, max: 3 },
  'complex': { min: 4, max: 6 },
  'innovative': { min: 4, max: 6 },
  'hybrid': { min: 4, max: 6 }
};

// ===== 角色到技能的映射（一个Agent可承担多个Skill）=====
const ROLE_SKILLS_MAP = {
  'architect': ['system-design', 'technical-review', 'performance-optimization'],
  'data-analyst': ['data-analysis', 'statistics', 'visualization', 'reporting'],
  'bi-analyst': ['business-intelligence', 'kpi-tracking', 'dashboard'],
  'devops-engineer': ['ci-cd', 'infrastructure', 'deployment', 'monitoring'],
  'security-engineer': ['security-audit', 'vulnerability-assessment', 'compliance'],
  'qa-engineer': ['testing', 'quality-assurance', 'test-automation'],
  'frontend-developer': ['ui-development', 'responsive-design', 'frontend-optimization'],
  'backend-developer': ['api-development', 'database-design', 'server-logic'],
  'full-stack-developer': ['frontend', 'backend', 'database', 'deployment'],
  'content-strategist': ['content-planning', 'seo', 'social-media'],
  'growth-hacker': ['growth-marketing', 'a-b-testing', 'funnel-optimization'],
  'product-manager': ['roadmap-planning', 'prioritization', 'user-stories'],
  'project-manager': ['timeline-planning', 'resource-allocation', 'risk-management'],
  'technical-writer': ['documentation', 'api-docs', 'user-guides'],
  'ux-researcher': ['user-research', 'usability-testing', 'persona-development'],
  'ui-designer': ['interface-design', 'visual-design', 'prototyping'],
  'market-researcher': ['market-analysis', 'competitor-research', 'trend-forecasting'],
  'financial-analyst': ['financial-modeling', 'investment-analysis', 'risk-assessment'],
  'legal-advisor': ['contract-review', 'compliance-checking', 'risk-analysis'],
  'customer-success-manager': ['client-onboarding', 'support', 'success-tracking']
};

// ===== 任务类型到角色的映射 =====
const TASK_TYPE_ROLE_MAP = {
  'creative-writing': ['content-strategist', 'technical-writer'],
  'code-development': ['architect', 'frontend-developer', 'backend-developer', 'qa-engineer'],
  'data-analysis': ['data-analyst', 'bi-analyst'],
  'system-design': ['architect', 'devops-engineer', 'security-engineer'],
  'marketing': ['content-strategist', 'growth-hacker', 'market-researcher'],
  'business-analysis': ['bi-analyst', 'financial-analyst', 'market-researcher'],
  'project-management': ['project-manager', 'product-manager'],
  'security': ['security-engineer', 'legal-advisor'],
  'quality-assurance': ['qa-engineer'],
  'documentation': ['technical-writer'],
  'user-research': ['ux-researcher', 'ui-designer']
};

/**
 * 加载角色列表（带缓存）
 * @returns {Array} 角色列表
 */
function loadRoles() {
  const now = Date.now();
  
  // 检查缓存
  if (_rolesCache && _rolesCacheTime && (now - _rolesCacheTime < ROLES_CACHE_TTL)) {
    return _rolesCache;
  }
  
  try {
    if (!fs.existsSync(ROLES_DIR)) {
      console.log('[team-builder] Roles directory not found:', ROLES_DIR);
      return [];
    }
    
    const files = fs.readdirSync(ROLES_DIR).filter(f => f.endsWith('.md'));
    const roles = [];
    
    for (const file of files) {
      const roleId = path.basename(file, '.md');
      const content = fs.readFileSync(path.join(ROLES_DIR, file), 'utf-8');
      
      // 解析角色元数据
      const metaMatch = content.match(/^#\s+(.+?)(?:\n|$)/);
      const descMatch = content.match(/\*\*专业领域\*\*[：:]\s*(.+?)(?:\n|$)/i);
      const skillsMatch = content.match(/\*\*适用任务\*\*[：:]\s*(.+?)(?:\n|$)/i);
      
      const role = {
        id: roleId,
        name: metaMatch ? metaMatch[1] : roleId,
        domain: descMatch ? descMatch[1] : '',
        applicableTasks: skillsMatch ? skillsMatch[1] : '',
        skills: ROLE_SKILLS_MAP[roleId] || [],
        path: path.join(ROLES_DIR, file)
      };
      
      roles.push(role);
    }
    
    _rolesCache = roles;
    _rolesCacheTime = now;
    
    console.log(`[team-builder] Loaded ${roles.length} roles from ${ROLES_DIR}`);
    return roles;
    
  } catch (error) {
    console.error('[team-builder] Failed to load roles:', error.message);
    return [];
  }
}

/**
 * 根据任务类型匹配角色
 * @param {string} taskType - 任务类型
 * @returns {Array} 匹配的角色列表
 */
function matchRolesForTask(taskType) {
  const roles = loadRoles();
  const taskTypeLower = taskType.toLowerCase();
  
  // 1. 精确匹配
  const exactMatch = TASK_TYPE_ROLE_MAP[taskTypeLower] || [];
  
  // 2. 模糊匹配（关键词匹配）
  const keywords = [];
  if (taskTypeLower.includes('write') || taskTypeLower.includes('创作') || taskTypeLower.includes('写作')) {
    keywords.push('content-strategist', 'technical-writer');
  }
  if (taskTypeLower.includes('code') || taskTypeLower.includes('开发') || taskTypeLower.includes('编程')) {
    keywords.push('architect', 'frontend-developer', 'backend-developer');
  }
  if (taskTypeLower.includes('data') || taskTypeLower.includes('数据')) {
    keywords.push('data-analyst', 'bi-analyst');
  }
  if (taskTypeLower.includes('security') || taskTypeLower.includes('安全')) {
    keywords.push('security-engineer');
  }
  if (taskTypeLower.includes('test') || taskTypeLower.includes('测试') || taskTypeLower.includes('质量')) {
    keywords.push('qa-engineer');
  }
  if (taskTypeLower.includes('design') || taskTypeLower.includes('设计')) {
    keywords.push('ui-designer', 'ux-researcher');
  }
  if (taskTypeLower.includes('manage') || taskTypeLower.includes('管理')) {
    keywords.push('project-manager', 'product-manager');
  }
  
  // 合并唯一结果
  const allMatches = [...new Set([...exactMatch, ...keywords])];
  
  // 返回匹配的角色
  return roles.filter(r => allMatches.includes(r.id));
}

/**
 * 根据复杂度确定Agent数量
 * @param {string} complexity - 复杂度等级
 * @param {number} subtaskCount - 子任务数量
 * @returns {number} Agent数量
 */
function determineAgentCount(complexity, subtaskCount) {
  const config = COMPLEXITY_AGENT_MAP[complexity] || COMPLEXITY_AGENT_MAP['standard'];
  
  // Agent数量不能少于子任务数量，但也不能超过配置上限
  const count = Math.min(Math.max(subtaskCount, config.min), config.max);
  
  console.log(`[team-builder] Complexity=${complexity}, Subtasks=${subtaskCount}, Agents=${count}`);
  return count;
}

/**
 * 选择合适的模型
 * @param {string} taskType - 任务类型
 * @returns {string} 模型名称
 */
function selectModel(taskType) {
  const taskTypeLower = taskType.toLowerCase();
  
  if (taskTypeLower.includes('creative') || taskTypeLower.includes('写作') || taskTypeLower.includes('创作')) {
    return MODEL_SELECTION['creative-writing'];
  }
  if (taskTypeLower.includes('reasoning') || taskTypeLower.includes('推理') || taskTypeLower.includes('分析')) {
    return MODEL_SELECTION['complex-reasoning'];
  }
  if (taskTypeLower.includes('code') || taskTypeLower.includes('开发')) {
    return MODEL_SELECTION['code-development'];
  }
  
  return MODEL_SELECTION['default'];
}

/**
 * 获取可用角色列表
 * @returns {Object} { roles, count, lastLoadTime }
 */
function getAvailableRoles() {
  const roles = loadRoles();
  
  return {
    roles: roles.map(r => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      applicableTasks: r.applicableTasks,
      skills: r.skills
    })),
    count: roles.length,
    lastLoadTime: _rolesCacheTime ? new Date(_rolesCacheTime).toISOString() : null,
    path: ROLES_DIR
  };
}

/**
 * 分配角色给子任务
 * @param {Array} taskParts - 子任务列表
 * @returns {Array} 分配了角色的任务列表
 */
function assignRoles(taskParts) {
  const assignedTasks = [];
  
  for (let i = 0; i < taskParts.length; i++) {
    const task = taskParts[i];
    
    // 匹配角色
    const matchedRoles = matchRolesForTask(task.type || task.name);
    
    // 选择最合适的角色（第一个）
    const selectedRole = matchedRoles.length > 0 ? matchedRoles[0] : {
      id: 'general',
      name: '通用助手',
      domain: '综合任务',
      skills: []
    };
    
    // 确定模型
    const model = selectModel(task.type || task.name);
    
    // 构建Agent配置
    const agentConfig = {
      index: i + 1,
      role: selectedRole,
      model: model,
      skills: selectedRole.skills, // 一个Agent可承担多个Skill
      task: task,
      estimatedTime: task.estimatedTime || 120
    };
    
    assignedTasks.push(agentConfig);
  }
  
  console.log(`[team-builder] Assigned roles to ${assignedTasks.length} tasks`);
  return assignedTasks;
}

/**
 * 组建团队
 * @param {Object} taskDecomposition - 任务分解结果
 * @param {string} complexity - 复杂度等级
 * @returns {Object} 团队组建结果
 */
function buildTeam(taskDecomposition, complexity) {
  console.log('[team-builder] Building team for task:', taskDecomposition.taskId);
  console.log('[team-builder] Complexity:', complexity);
  
  // 1. 获取子任务列表
  const subtasks = taskDecomposition.subtasks || [];
  const subtaskCount = subtasks.length;
  
  // 2. 确定Agent数量
  const agentCount = determineAgentCount(complexity, subtaskCount);
  
  // 3. 如果Agent数量少于子任务，合并任务
  let taskParts = subtasks;
  if (agentCount < subtaskCount) {
    console.log(`[team-builder] Merging ${subtaskCount} tasks into ${agentCount} agents`);
    taskParts = mergeTasks(subtasks, agentCount);
  }
  
  // 4. 分配角色
  const assignedTasks = assignRoles(taskParts);
  
  // 5. 构建团队配置
  const team = {
    taskId: taskDecomposition.taskId || generateTaskId(),
    complexity: complexity,
    createdAt: new Date().toISOString(),
    agents: assignedTasks.map((t, i) => ({
      id: `agent-${String(i + 1).padStart(3, '0')}`,
      role: t.role.id,
      roleName: t.role.name,
      model: t.model,
      skills: t.skills,
      task: t.task,
      status: 'pending'
    })),
    executionOrder: calculateExecutionOrder(assignedTasks),
    estimatedCompletion: estimateCompletion(assignedTasks)
  };
  
  console.log(`[team-builder] Team built: ${team.agents.length} agents`);
  return team;
}

/**
 * 合并多个任务到一个Agent
 * @param {Array} tasks - 子任务列表
 * @param {number} targetCount - 目标Agent数量
 * @returns {Array} 合并后的任务列表
 */
function mergeTasks(tasks, targetCount) {
  if (tasks.length <= targetCount) return tasks;
  
  const merged = [];
  const batchSize = Math.ceil(tasks.length / targetCount);
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    merged.push({
      name: batch.map(t => t.name).join(' + '),
      type: batch[0].type || 'general',
      description: batch.map(t => t.description).join('; '),
      inputs: batch.flatMap(t => t.inputs || []),
      outputs: batch.flatMap(t => t.outputs || []),
      estimatedTime: batch.reduce((sum, t) => sum + (t.estimatedTime || 120), 0)
    });
  }
  
  return merged;
}

/**
 * 计算执行顺序
 * @param {Array} assignedTasks - 分配了角色的任务列表
 * @returns {Array} 执行顺序组（并行任务在同一组）
 */
function calculateExecutionOrder(assignedTasks) {
  // 从taskDecomposition获取依赖关系
  // 这里简化处理，按顺序执行
  const order = [];
  
  for (let i = 0; i < assignedTasks.length; i++) {
    // 可以并行执行的任务放同一组
    const current = assignedTasks[i];
    const parallelGroup = [current.id || `task-${i}`];
    
    // 检查是否有后续依赖
    const hasDependent = assignedTasks.slice(i + 1).some(t => 
      t.task.inputs && t.task.inputs.includes(current.task.id)
    );
    
    if (!hasDependent && i < assignedTasks.length - 1) {
      // 可以和下一个并行
    } else {
      order.push(parallelGroup);
    }
  }
  
  // 简化：每个任务单独一组，按顺序执行
  return assignedTasks.map((_, i) => [`agent-${String(i + 1).padStart(3, '0')}`]);
}

/**
 * 估算完成时间
 * @param {Array} assignedTasks - 分配了角色的任务列表
 * @returns {string} ISO时间字符串
 */
function estimateCompletion(assignedTasks) {
  // 估算最长路径的时间
  let totalTime = 0;
  
  for (const task of assignedTasks) {
    totalTime += task.estimatedTime || 120;
  }
  
  const completionTime = new Date(Date.now() + totalTime * 1000);
  return completionTime.toISOString();
}

/**
 * 生成任务ID
 * @returns {string}
 */
function generateTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取映射加载器（如果可用）
 * @returns {Object|null}
 */
function getMappingLoader() {
  try {
    if (fs.existsSync(MAPPING_LOADER_PATH)) {
      return require(MAPPING_LOADER_PATH);
    }
  } catch (e) {
    // 映射加载器不可用
  }
  return null;
}

/**
 * 清除角色缓存
 */
function clearCache() {
  _rolesCache = null;
  _rolesCacheTime = null;
  console.log('[team-builder] Cache cleared');
}

// ===== 导出 =====
module.exports = {
  buildTeam,
  assignRoles,
  getAvailableRoles,
  clearCache,
  
  // 导出配置供外部使用
  MODEL_SELECTION,
  COMPLEXITY_AGENT_MAP,
  ROLE_SKILLS_MAP,
  TASK_TYPE_ROLE_MAP
};

// ===== 快速测试 =====
if (require.main === module) {
  console.log('=== team-builder.js 快速测试 ===\n');
  
  // 测试1: 获取可用角色
  console.log('1. 获取可用角色列表:');
  const rolesInfo = getAvailableRoles();
  console.log(`   角色数量: ${rolesInfo.count}`);
  console.log(`   路径: ${rolesInfo.path}\n`);
  
  // 测试2: 构建测试团队
  console.log('2. 构建测试团队:');
  const mockDecomposition = {
    taskId: 'test-task-001',
    subtasks: [
      { id: 'sub-1', name: '素材收集', type: 'data-analysis', estimatedTime: 60 },
      { id: 'sub-2', name: '大纲设计', type: 'creative-writing', estimatedTime: 120 },
      { id: 'sub-3', name: '内容撰写', type: 'creative-writing', estimatedTime: 300 },
      { id: 'sub-4', name: '质量审查', type: 'quality-assurance', estimatedTime: 60 }
    ]
  };
  
  const team = buildTeam(mockDecomposition, 'standard');
  console.log(`   团队ID: ${team.taskId}`);
  console.log(`   Agent数量: ${team.agents.length}`);
  console.log(`   执行顺序: ${JSON.stringify(team.executionOrder)}\n`);
  
  console.log('3. Agent配置:');
  for (const agent of team.agents) {
    console.log(`   - ${agent.id}: ${agent.roleName} (${agent.model})`);
    console.log(`     技能: ${agent.skills.join(', ')}`);
  }
  
  console.log('\n=== 测试完成 ===');
}