/**
 * Orchestrator Flow Wrapper - 阳神编排包装器
 * 
 * 功能：
 * 1. 保持原有orchestrator.js接口完全兼容
 * 2. 内部使用Flow编排引擎
 * 3. 提供平滑的迁移路径
 * 
 * 【2026-04-27 修复】6个运行逻辑冲突：
 * - Conflict 1: 因果链启动移到预防检查之后
 * - Conflict 2: 统一执行入口（executeWithFlow已移除）
 * - Conflict 3: 先检查后解锁（修复逻辑漏洞）
 * - Conflict 4: 因果链和Tracker统一
 * - Conflict 5: 删除generation-tools-guard，统一使用prevention-hooks
 * - Conflict 6: 添加子Agent结果记录到阴神的钩子
 */

const path = require('path');
const fs = require('fs');

// ============ 加载依赖 ============
let preventionHooks, taskDecomposer, qualityChecker, teamBuilder,
    executionCoordinator, trackerIncrement, causalChain, unifiedTracker;

// 初始化加载
(function loadModules() {
    // 因果链
    try {
        causalChain = require('./causal-chain.js');
        console.log('✅ causal-chain loaded');
    } catch(e) {
        causalChain = null;
    }
    
    // 统一追踪器（Conflict 4: 合并因果链和Tracker）
    try {
        unifiedTracker = require('./unified-tracker.js');
        console.log('✅ unified-tracker loaded');
    } catch(e) {
        unifiedTracker = null;
    }
    
    // 预防钩子（Conflict 5: 唯一防火墙）
    try {
        preventionHooks = require('./prevention-hooks.js');
        console.log('✅ prevention-hooks loaded');
    } catch(e) {
        preventionHooks = null;
    }
    
    // 任务分解器
    try {
        taskDecomposer = require('./task-decomposer.js');
        console.log('✅ task-decomposer loaded');
    } catch(e) {
        taskDecomposer = null;
    }
    
    // 质量检查器
    try {
        qualityChecker = require('./quality-checker.js');
        console.log('✅ quality-checker loaded');
    } catch(e) {
        qualityChecker = null;
    }
    
    // 团队构建器
    try {
        teamBuilder = require('./team-builder.js');
        console.log('✅ team-builder loaded');
    } catch(e) {
        teamBuilder = null;
    }
    
    // 执行协调器
    try {
        executionCoordinator = require('./execution-coordinator.js');
        console.log('✅ executionCoordinator loaded');
    } catch(e) {
        executionCoordinator = null;
    }
    
    // Tracker（Conflict 4: 如果没有unified-tracker才用旧的）
    if (!unifiedTracker) {
        try {
            trackerIncrement = require('./subagent-manager/tracker-increment.js');
            console.log('✅ tracker-increment loaded (fallback mode)');
        } catch(e) {
            trackerIncrement = null;
        }
    }
})();

// ============ 注册表加载 ============
const REGISTRY_PATH = path.join(__dirname, 'agency-registry', 'registry.json');

function loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        console.log('⚠️ registry.json not found');
        return null;
    }
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

// ============ 分类关键词映射 ============
const CATEGORY_KEYWORD_MAP = {
    '生成': ['文档生成器', '代码生成', '内容创作'],
    '创意': ['内容创作者', '开发者布道师', '文案撰写'],
    '歌曲': ['音乐创作Agent', '歌词创作Agent'],
    '音乐': ['音乐创作Agent', '歌词创作Agent'],
    '代码': ['代码生成Agent', '提示词工程师'],
    '分析': ['数据分析Agent', '报告生成Agent'],
    '报告': ['报告生成Agent', '数据分析Agent'],
    '营销': ['营销策略Agent', '内容创作者'],
    '搜索': ['研究Agent', '数据提取Agent'],
    '研究': ['研究Agent', '数据分析Agent'],
    '测试': ['测试Agent', 'QA专家'],
    '审查': ['合规Agent', '审计Agent']
};

// ============ Agent匹配 ============
function matchAgents(taskDescription, registry) {
    if (!registry || !registry.agents) return [];
    
    const taskLower = taskDescription.toLowerCase();
    const matches = [];
    
    // 精确匹配
    for (const [id, agent] of Object.entries(registry.agents)) {
        let score = 0;
        for (const kw of agent.trigger_keywords || []) {
            if (taskLower.includes(kw.toLowerCase())) {
                score += 1;
            }
        }
        if (score > 0) {
            matches.push({ id, agent, score, matchType: 'keyword' });
        }
    }
    
    matches.sort((a, b) => b.score - a.score);
    
    // Fallback匹配
    if (matches.length < 3) {
        const fallbackMatches = fallbackMatch(taskDescription, registry, matches);
        fallbackMatches.forEach(fm => {
            if (!matches.find(m => m.id === fm.id)) {
                matches.push(fm);
            }
        });
        matches.sort((a, b) => b.score - a.score);
    }
    
    // 去重
    const seen = new Set();
    return matches.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    }).slice(0, 10);
}

function fallbackMatch(taskDescription, registry, existingMatches = []) {
    const taskLower = taskDescription.toLowerCase();
    const matches = [];
    const existingIds = new Set(existingMatches.map(m => m.id));
    
    for (const [keyword, agentNames] of Object.entries(CATEGORY_KEYWORD_MAP)) {
        if (taskLower.includes(keyword)) {
            for (const agentName of agentNames) {
                const agent = Object.values(registry.agents).find(a => {
                    const name = (a.name_zh || a.name || '').toLowerCase();
                    return name.includes(agentName.toLowerCase().replace('Agent', ''));
                });
                if (agent && !existingIds.has(agent.id) && !matches.find(m => m.id === agent.id)) {
                    matches.push({ id: agent.id, agent, score: 0.3, matchType: 'fallback' });
                }
            }
        }
    }
    
    return matches;
}

// ============ 默认配置 ============
const DEFAULT_OPTIONS = {
    forceYangShen: true,
    ignoreComplexity: true,
    agentRole: 'dispatcher',
    parallelByDefault: true,
    useTemplateAgents: true,
    enableCausalChain: true,
    autoSelectAgents: true,
    maxAgents: 3
};

// ============ 【Conflict 6】子Agent结果记录到阴神 ============
const BRAIN_SUBAGENT_LOG_PATH = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.openclaw', 'workspace', 'brain', 'subagent-log.md'
);

function logSubagentResultToYinShen(subagentResult) {
    try {
        const entry = `\n## ${new Date().toISOString()} - 子Agent执行记录\n`;
        const content = [
            entry,
            `- Agent: ${subagentResult.agentName || 'unknown'}`,
            `- Task: ${subagentResult.task || 'unknown'}`,
            `- Success: ${subagentResult.success}`,
            `- Duration: ${subagentResult.duration || 'unknown'}ms`,
            subagentResult.result ? `- Result: ${JSON.stringify(subagentResult.result).substring(0, 200)}` : '',
            '---'
        ].join('\n');
        
        // 确保目录存在
        const brainDir = path.dirname(BRAIN_SUBAGENT_LOG_PATH);
        if (!fs.existsSync(brainDir)) {
            fs.mkdirSync(brainDir, { recursive: true });
        }
        
        fs.appendFileSync(BRAIN_SUBAGENT_LOG_PATH, content);
        console.log('✅ 子Agent结果已记录到阴神:', subagentResult.agentName);
    } catch(e) {
        console.log('⚠️ 记录子Agent结果失败:', e.message);
    }
}

// ============ 主执行函数（修复后的版本）===========
/**
 * 执行任务 - 统一入口
 * 
 * 【修复内容】：
 * - Conflict 1: 因果链启动移到预防检查之后
 * - Conflict 3: 先检查后解锁（修复逻辑漏洞）
 * - Conflict 4: 使用unified-tracker或组合方式
 * - Conflict 6: 添加子Agent结果记录钩子
 */
async function executeTask(taskDescription, options = {}) {
    options = { ...DEFAULT_OPTIONS, ...options };
    
    const startTime = Date.now();
    const results = {
        task: taskDescription,
        timestamp: new Date().toISOString(),
        steps: [],
        agents: [],
        success: false,
        error: null,
        blocked: false,
        blockReason: null
    };
    
    console.log('\n========== 阳神系统开始执行 ==========');
    console.log('任务:', taskDescription);
    console.log('角色: [调度员] - 元神只调度，不执行');
    
    // ========== 执行顺序修复（Conflict 1 & 3）==========
    // 步骤1：预防检查（可能抛错，拦截任务）
    if (preventionHooks && preventionHooks.beforeTask) {
        try {
            console.log('[执行顺序] 步骤1/5: 预防检查...');
            const preventionResult = preventionHooks.beforeTask({
                taskType: 'auto',
                command: taskDescription,
                tools: [],
                environment: 'openclaw'
            });
            results.steps.push({ step: 'prevention', result: preventionResult });
            console.log('[执行顺序] ✅ 预防检查通过');
        } catch(e) {
            // 【修复】如果预防检查拦截，不继续执行
            console.log('[执行顺序] 🔴 预防检查拦截任务:', e.message);
            results.blocked = true;
            results.blockReason = e.message;
            results.error = 'BLOCKED_BY_PREVENTION';
            return results;
        }
    }
    
    // 步骤2：因果链启动（只有通过步骤1才执行）- Conflict 1修复
    let causalChainId = null;
    if (!results.blocked && options.enableCausalChain) {
        try {
            console.log('[执行顺序] 步骤2/5: 启动因果链...');
            if (unifiedTracker) {
                // 【修复】使用统一追踪器 - Conflict 4
                const trackInfo = unifiedTracker.start(taskDescription, { taskType: 'auto' });
                causalChainId = trackInfo.id;
                results.trackId = trackInfo.taskId;
            } else if (causalChain) {
                causalChainId = causalChain.start(taskDescription).id;
            }
            results.causalChainId = causalChainId;
            console.log('[执行顺序] ✅ 因果链已启动:', causalChainId);
        } catch(e) {
            console.log('⚠️ 因果链启动失败:', e.message);
        }
    }
    
    // 步骤3：解锁生成工具（只有通过步骤1才执行）- Conflict 3修复
    if (!results.blocked && preventionHooks && preventionHooks.markOrchestratorCalled) {
        try {
            console.log('[执行顺序] 步骤3/5: 解锁生成工具...');
            preventionHooks.markOrchestratorCalled('orch-' + Date.now());
            console.log('[执行顺序] ✅ 生成工具已解锁');
        } catch(e) {
            console.log('⚠️ 解锁失败:', e.message);
        }
    }
    
    // 步骤4：加载注册表和匹配Agent
    console.log('[执行顺序] 步骤4/5: 加载注册表...');
    const registry = loadRegistry();
    if (!registry) {
        results.error = 'registry not found';
        return results;
    }
    
    const matchedAgents = matchAgents(taskDescription, registry);
    results.matchedAgents = matchedAgents.slice(0, options.maxAgents || 5);
    console.log('✅ 匹配到', results.matchedAgents.length, '个Agent');
    
    if (options.autoSelectAgents && results.matchedAgents.length > 0) {
        results.agents = results.matchedAgents.map(m => m.agent);
    }
    
    // 步骤5：任务分解
    console.log('[执行顺序] 步骤5/5: 任务分解...');
    if (taskDecomposer && taskDecomposer.decomposeTask) {
        try {
            const decomposition = taskDecomposer.decomposeTask(taskDescription);
            results.steps.push({ step: 'decomposition', result: decomposition });
            results.taskType = decomposition.taskType;
            results.complexity = decomposition.complexity;
            results.subTasks = decomposition.subTasks || [];
            console.log('✅ 任务分解完成:', decomposition.taskType, '-', decomposition.complexity);
        } catch(e) {
            console.log('⚠️ 任务分解失败:', e.message);
        }
    }
    
    // 生成Spawn配置
    if (results.matchedAgents && results.matchedAgents.length > 0) {
        try {
            const spawnConfigs = buildMultiSpawnConfig(results.matchedAgents, taskDescription, options);
            results.spawnConfigs = spawnConfigs;
        } catch(e) {}
    }
    
    // Tracker记录（Conflict 4: 使用unified-tracker或旧的）
    if (!results.blocked) {
        try {
            if (unifiedTracker && results.trackId) {
                // 统一追踪器已经在步骤2启动，不需要再次increment
            } else if (trackerIncrement) {
                trackerIncrement.increment({
                    taskId: 'task-' + Date.now(),
                    category: results.taskType || 'unknown',
                    agentName: 'orchestrator',
                    success: true
                });
            }
        } catch(e) {
            console.log('⚠️ Tracker记录失败:', e.message);
        }
    }
    
    results.success = true;
    results.duration = Date.now() - startTime;
    
    // 因果链结束（Conflict 4: 使用unified-tracker或旧的）
    if (!results.blocked && options.enableCausalChain) {
        try {
            if (unifiedTracker && results.trackId) {
                unifiedTracker.complete(results.trackId, {
                    success: results.success,
                    duration: results.duration
                });
            } else if (causalChain && causalChainId) {
                causalChain.complete(causalChainId, {
                    success: results.success,
                    duration: results.duration,
                    agentsCount: results.agents?.length || 0
                });
            }
        } catch(e) {}
    }
    
    console.log('========== 阳神系统执行完成 ==========\n');
    
    return {
        task: results.task,
        timestamp: results.timestamp,
        causalChainId,
        trackId: results.trackId,
        success: results.success,
        duration: results.duration,
        matchedAgents: results.matchedAgents,
        agents: results.agents,
        taskType: results.taskType,
        complexity: results.complexity,
        subTasks: results.subTasks,
        steps: results.steps,
        blocked: results.blocked,
        blockReason: results.blockReason,
        error: results.error,
        rules: {
            forceYangShen: options.forceYangShen,
            ignoreComplexity: options.ignoreComplexity,
            agentRole: options.agentRole,
            parallelByDefault: options.parallelByDefault,
            useTemplateAgents: options.useTemplateAgents
        }
    };
}

// ============ 【Conflict 6】子Agent执行后记录到阴神 ============
/**
 * 在子Agent完成后调用，记录到阴神系统
 * @param {object} subagentResult - 子Agent执行结果
 */
function recordSubagentResult(subagentResult) {
    logSubagentResultToYinShen(subagentResult);
    
    // 如果有阳神学习系统，也调用它
    try {
        const yangshenLearning = require('../scripts/yangshen/learn-from-experience.js');
        if (yangshenLearning && yangshenLearning.learnFromExperience) {
            yangshenLearning.learnFromExperience({
                type: 'subagent_execution',
                data: subagentResult
            });
        }
    } catch(e) {
        // 阳神学习系统不可用，忽略
    }
}

// ============ Agent Persona生成器 ============
function buildAgentPersona(agent, taskDescription) {
    const name = agent.name_zh || agent.name;
    const emoji = agent.emoji || '🤖';
    
    let persona = `${emoji} 你是「${name}」\n\n`;
    persona += `## 身份\n${agent.description || '专业助手'}\n\n`;
    
    if (agent.trigger_keywords && agent.trigger_keywords.length > 0) {
        persona += `## 专长领域\n${agent.trigger_keywords.join('、')}\n\n`;
    }
    
    if (agent.workflow && agent.workflow.length > 0) {
        persona += `## 工作流程\n${agent.workflow.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n`;
    }
    
    if (agent.deliverables && agent.deliverables.length > 0) {
        persona += `## 交付物\n${agent.deliverables.map(d => `- ${d}`).join('\n')}\n\n`;
    }
    
    persona += `---\n## 当前任务\n${taskDescription}\n\n请按照工作流程执行任务。`;
    
    return persona;
}

function buildSpawnConfig(agentMatch, taskDescription, options = {}) {
    const { agent, score } = agentMatch;
    const persona = buildAgentPersona(agent, taskDescription);
    
    return {
        task: taskDescription,
        runtime: 'subagent',
        mode: options.mode || 'run',
        systemPrompt: persona,
        agentId: options.agentId || null,
        metadata: {
            agentId: agentMatch.id,
            agentName: agent.name,
            agentNameZh: agent.name_zh,
            category: agent.category,
            matchScore: score,
            emoji: agent.emoji
        }
    };
}

function buildMultiSpawnConfig(agentMatches, taskDescription, options = {}) {
    return agentMatches.slice(0, options.maxAgents || 3).map(match => {
        return buildSpawnConfig(match, taskDescription, options);
    });
}

// ============ 查询函数 ============
function queryAgents(taskDescription) {
    const registry = loadRegistry();
    if (!registry) return [];
    return matchAgents(taskDescription, registry);
}

function getAllAgents() {
    return loadRegistry();
}

function getAgent(agentId) {
    const registry = loadRegistry();
    if (!registry) return null;
    return registry.agents[agentId] || null;
}

// ============ prepareSpawn快捷函数 ============
function prepareSpawn(taskDescription, options = {}) {
    options = { ...DEFAULT_OPTIONS, ...options };
    
    const registry = loadRegistry();
    if (!registry) return { agents: [], taskInfo: { error: 'registry not found' } };
    
    const matched = matchAgents(taskDescription, registry);
    const selected = matched.slice(0, options.maxAgents || 3);
    const spawnConfigs = buildMultiSpawnConfig(selected, taskDescription, options);
    
    return {
        agents: spawnConfigs,
        taskInfo: {
            task: taskDescription,
            matchedCount: matched.length,
            selectedCount: spawnConfigs.length,
            topAgent: spawnConfigs[0]?.metadata?.agentNameZh || '未知'
        }
    };
}

// ============ 辅助执行（内部使用）============
// executeWithFlow 已移除（2026-04-27），Flow引擎未实现
// 统一使用 executeTask 作为唯一执行入口

// ============ 初始化 ============
// loadModules() 在 IIFE 内部执行（第26行），此处不再需要调用
// loadModules();

// ============ 导出（统一入口）===========
module.exports = {
    DEFAULT_OPTIONS,
    executeTask,           // 唯一执行入口
    queryAgents,
    getAllAgents,
    getAgent,
    buildAgentPersona,
    buildSpawnConfig,
    buildMultiSpawnConfig,
    prepareSpawn,
    recordSubagentResult,  // 【新增】Conflict 6: 子Agent结果记录到阴神
    causalChain: causalChain || null
};