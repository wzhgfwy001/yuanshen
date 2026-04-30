/**
 * task-decomposer.js
 * 【分裂残渣】任务分解器
 * 
 * 功能：
 * - 分析用户任务
 * - 判断任务类型（类型1-4）
 * - 计算任务复杂度
 * - 分解为子任务
 * 
 * 导出函数：
 * - decomposeTask(taskDescription) - 分解任务
 * - classifyTask(taskDescription) - 判断类型
 * - calculateComplexity(task) - 计算复杂度
 */

const path = require('path');

/**
 * 任务类型分类
 * @typedef {Object} TaskClassification
 * @property {number} type - 类型1-4
 * @property {string} typeName - 类型名称
 * @property {string} description - 类型描述
 * @property {number} confidence - 置信度 0-1
 * @property {string[]} dimensions - 识别的维度
 * @property {boolean} requiresAgencyAgent - 是否需要Agency Agent
 * @property {string} agencyAgentName - Agency Agent名称（如果有）
 */

/**
 * 复杂度评估
 * @typedef {Object} ComplexityResult
 * @property {string} level - 简单/中等/复杂/极复杂
 * @property {number} score - 复杂度分数
 * @property {number} dimensionCount - 维度数
 * @property {number} subagentCount - 推荐子Agent数量
 * @property {Object} breakdown - 各维度复杂度分解
 */

/**
 * 任务分解结果
 * @typedef {Object} DecompositionResult
 * @property {string} taskId - 任务ID
 * @property {string} originalTask - 原始任务描述
 * @property {TaskClassification} classification - 任务分类
 * @property {ComplexityResult} complexity - 复杂度评估
 * @property {SubTask[]} subtasks - 子任务列表
 * @property {DependencyGraph} dependencyGraph - 依赖图
 * @property {ExecutionPlan} executionPlan - 执行计划
 */

/**
 * @typedef {Object} SubTask
 * @property {string} id - 子任务ID
 * @property {string} name - 子任务名称
 * @property {string} agentRole - Agent角色
 * @property {string} description - 描述
 * @property {string[]} input - 输入依赖
 * @property {string} output - 输出描述
 * @property {number} estimatedTime - 预估时间(秒)
 * @property {string} model - 推荐模型
 */

/**
 * @typedef {Object} DependencyGraph
 * @property {string[]} nodes - 节点列表
 * @property {Array<{from: string, to: string}>} edges - 边列表
 * @property {string[][]} parallelGroups - 并行组
 */

/**
 * @typedef {Object} ExecutionPlan
 * @property {number} totalEstimatedTime - 总预估时间
 * @property {string[]} criticalPath - 关键路径
 * @property {number} parallelismDegree - 并行度
 */

// ============ 任务类型判断 ============

/**
 * 判断任务类型
 * 类型1：单一任务 - 单维度，主Agent可直接完成
 * 类型2：标准任务 - 有对应Skill，执行次数≥3
 * 类型3：创新+标准 - 标准任务+定制
 * 类型4：创新任务 - 无匹配Skill，需要动态组建团队
 * 
 * @param {string} taskDescription - 任务描述
 * @returns {TaskClassification}
 */
function classifyTask(taskDescription) {
    const task = taskDescription.toLowerCase();
    
    // 已知的Skill类型（简化版本）
    const knownSkills = {
        '代码审查': ['review', '审查', 'audit', '检查代码', 'code review'],
        '博客写作': ['blog', '博客', '文章', '写博客'],
        '数据分析': ['分析', 'analysis', '数据', '报表', '统计'],
        '研究调研': ['研究', 'research', '调研', '调查'],
        '项目规划': ['规划', 'plan', '项目', 'project'],
        '可视化': ['可视化', '图表', 'visualization', 'chart'],
        '内容采集': ['采集', '收集', '抓取', 'scrape', 'collect'],
        '小红书': ['小红书', 'xhs'],
        'PPT': ['ppt', '演示', 'slides', 'presentation'],
        '写作': ['写', '创作', '写一个', '写一篇', '写一本']
    };

    // 检测维度
    const dimensions = detectDimensions(taskDescription);
    
    // 检测是否有特殊定制要求
    const hasCustomRequirements = detectCustomRequirements(taskDescription);
    
    // 检测是否需要Agency Agent
    const agencyAgentInfo = detectAgencyAgent(taskDescription);
    
    // 检测是否需要多角色协作（4+维度或明确的多步骤）
    const multiStepIndicators = [
        '开发', '设计', '系统', '平台', '完整', '全套',
        '多个', '几个', '不同', '各种', '章', '模块',
        '从零开始', '全新'
    ];
    const hasMultiStep = multiStepIndicators.some(indicator => task.includes(indicator));

    // 分类逻辑
    let type, typeName, confidence, description;

    if (dimensions.length === 1 && !hasMultiStep) {
        // 类型1：单一任务
        type = 1;
        typeName = '单一任务';
        description = '单维度任务，主Agent可直接完成或创建1个子Agent';
        confidence = 0.9;
    } else if (agencyAgentInfo.name && !hasCustomRequirements) {
        // 类型2：标准任务（有对应Agency Agent）
        type = 2;
        typeName = '标准任务';
        description = `有对应Skill（${agencyAgentInfo.name}），按固化流程执行`;
        confidence = 0.85;
    } else if (agencyAgentInfo.name && hasCustomRequirements) {
        // 类型3：创新+标准
        type = 3;
        typeName = '创新+标准任务';
        description = `主体有对应Skill（${agencyAgentInfo.name}），但有定制需求`;
        confidence = 0.8;
    } else {
        // 类型4：创新任务
        type = 4;
        typeName = '创新任务';
        description = '无匹配Skill，需要动态组建团队';
        confidence = 0.75;
    }

    return {
        type,
        typeName,
        description,
        confidence,
        dimensions,
        requiresAgencyAgent: !!agencyAgentInfo.name,
        agencyAgentName: agencyAgentInfo.name,
        isMultiStep: hasMultiStep || dimensions.length > 2
    };
}

/**
 * 检测任务维度
 * @param {string} taskDescription 
 * @returns {string[]}
 */
function detectDimensions(taskDescription) {
    const task = taskDescription.toLowerCase();
    const dimensions = [];

    // 内容维度
    const contentKeywords = ['写', '创作', '生成', '分析', '研究', '设计', '开发'];
    if (contentKeywords.some(k => task.includes(k))) {
        dimensions.push('content');
    }

    // 结构维度
    const structureKeywords = ['大纲', '结构', '框架', '架构', '章', '节', '模块'];
    if (structureKeywords.some(k => task.includes(k))) {
        dimensions.push('structure');
    }

    // 风格维度
    const styleKeywords = ['风格', '调性', '语气', '口吻', '文风', '写法'];
    if (styleKeywords.some(k => task.includes(k))) {
        dimensions.push('style');
    }

    // 技术维度
    const techKeywords = ['代码', '技术', '实现', 'api', '数据库', '系统', '开发', '编程'];
    if (techKeywords.some(k => task.includes(k))) {
        dimensions.push('technical');
    }

    // 质量维度
    const qualityKeywords = ['质量', '专业', '标准', '规范', '审核', '审查'];
    if (qualityKeywords.some(k => task.includes(k))) {
        dimensions.push('quality');
    }

    // 数据维度
    const dataKeywords = ['数据', '分析', '统计', '报表', '图表', '可视化'];
    if (dataKeywords.some(k => task.includes(k))) {
        dimensions.push('data');
    }

    // 默认至少一个维度
    if (dimensions.length === 0) {
        dimensions.push('content');
    }

    return dimensions;
}

/**
 * 检测是否有定制要求
 * @param {string} taskDescription 
 * @returns {boolean}
 */
function detectCustomRequirements(taskDescription) {
    const customKeywords = [
        '重点', '特别', '特殊', '定制', '自定义',
        '强调', '注意', '务必', '必须', '严格',
        '除了', '还要', '以外', '另外'
    ];
    return customKeywords.some(k => taskDescription.includes(k));
}

/**
 * 检测是否需要Agency Agent
 * @param {string} taskDescription 
 * @returns {{name: string, reason: string}}
 */
function detectAgencyAgent(taskDescription) {
    const task = taskDescription.toLowerCase();
    
    const agencyMappings = [
        { name: 'marketing-xiaohongshu-specialist', keywords: ['小红书', 'xhs'] },
        { name: 'engineering-architect', keywords: ['架构', 'architecture', '系统设计'] },
        { name: 'code-developer', keywords: ['代码', '开发', '编程', '写代码'] },
        { name: 'content-strategist', keywords: ['内容策略', 'content strategy'] },
        { name: 'data-analyst', keywords: ['数据分析', 'data analysis'] }
    ];

    for (const mapping of agencyMappings) {
        if (mapping.keywords.some(k => task.includes(k))) {
            return { name: mapping.name, reason: `匹配关键词: ${mapping.keywords[0]}` };
        }
    }

    return { name: '', reason: '' };
}

// ============ 复杂度计算 ============

/**
 * 计算任务复杂度
 * 
 * 复杂度 = 维度数 × 平均维度复杂度 × 依赖深度
 * 
 * 复杂度等级：
 * - 简单：1-2维度 → 1-2个子Agent
 * - 中等：2-3维度 → 3个子Agent
 * - 复杂：4+维度 → 4-6个子Agent
 * 
 * @param {Object} task - 任务对象（可以是字符串或对象）
 * @returns {ComplexityResult}
 */
function calculateComplexity(task) {
    // 支持传入字符串或对象
    let dimensions = [];
    let dimensionCount = 0;
    let subtaskCount = 0;
    let breakdown = {};

    if (typeof task === 'string') {
        // 如果是字符串，先分类再计算
        const classification = classifyTask(task);
        dimensions = classification.dimensions;
    } else if (task.dimensions) {
        dimensions = task.dimensions;
    } else if (task.classification && task.classification.dimensions) {
        dimensions = task.classification.dimensions;
    }

    dimensionCount = dimensions.length || 1;

    // 每个维度的复杂度估算（1-5分）
    const dimensionComplexity = {
        'content': 3,      // 内容创作
        'structure': 2,    // 结构设计
        'style': 2,       // 风格调性
        'technical': 4,    // 技术实现
        'quality': 2,     // 质量把控
        'data': 3         // 数据处理
    };

    // 计算各维度复杂度
    let totalDimComplexity = 0;
    for (const dim of dimensions) {
        breakdown[dim] = dimensionComplexity[dim] || 2;
        totalDimComplexity += breakdown[dim];
    }
    const avgDimComplexity = dimensions.length > 0 
        ? totalDimComplexity / dimensions.length 
        : 2;

    // 依赖深度（最长依赖链）
    const dependencyDepth = Math.min(dimensionCount, 4);

    // 计算复杂度分数
    const score = Math.round(dimensionCount * avgDimComplexity * (1 + dependencyDepth * 0.1));

    // 确定复杂度等级和子Agent数量
    let level, subagentCount;

    if (dimensionCount <= 2) {
        level = '简单';
        subagentCount = Math.min(2, Math.max(1, dimensionCount));
    } else if (dimensionCount <= 3) {
        level = '中等';
        subagentCount = 3;
    } else if (dimensionCount <= 5) {
        level = '复杂';
        subagentCount = Math.min(6, Math.max(4, dimensionCount));
    } else {
        level = '极复杂';
        subagentCount = 6; // 建议拆分任务
    }

    return {
        level,
        score,
        dimensionCount,
        subagentCount,
        breakdown,
        avgDimComplexity: Math.round(avgDimComplexity * 10) / 10,
        dependencyDepth,
        recommendation: level === '极复杂' 
            ? '建议拆分为多个独立任务' 
            : '可直接执行'
    };
}

// ============ 任务分解 ============

/**
 * 分解任务为子任务
 * 
 * @param {string} taskDescription - 任务描述
 * @returns {DecompositionResult}
 */
function decomposeTask(taskDescription) {
    const taskId = generateUUID();
    const classification = classifyTask(taskDescription);
    const complexity = calculateComplexity({ classification });
    
    const subtasks = generateSubtasks(taskDescription, classification, complexity);
    const dependencyGraph = buildDependencyGraph(subtasks);
    const executionPlan = buildExecutionPlan(subtasks, dependencyGraph);

    return {
        taskId,
        originalTask: taskDescription,
        classification,
        complexity,
        subtasks,
        dependencyGraph,
        executionPlan
    };
}

/**
 * 根据任务类型生成子任务
 * @param {string} taskDescription 
 * @param {TaskClassification} classification 
 * @param {ComplexityResult} complexity 
 * @returns {SubTask[]}
 */
function generateSubtasks(taskDescription, classification, complexity) {
    const subtasks = [];
    const task = taskDescription.toLowerCase();
    const baseTime = 60; // 基础时间（秒）

    // 检测任务领域
    const isWriting = task.includes('写') || task.includes('创作') || task.includes('小说') || task.includes('文章');
    const isCode = task.includes('代码') || task.includes('开发') || task.includes('编程');
    const isData = task.includes('分析') || task.includes('数据') || task.includes('统计');
    const isDesign = task.includes('设计') || task.includes('规划') || task.includes('方案');

    if (complexity.level === '简单') {
        // 简单任务：1-2个子Agent
        if (isWriting) {
            subtasks.push(createSubtask('subtask-1', '素材收集', '搜索专家', 
                '搜索和整理相关信息素材', [], '素材包', baseTime));
            subtasks.push(createSubtask('subtask-2', '内容撰写', '写作专家', 
                '根据素材撰写内容', ['subtask-1'], '文章草稿', baseTime * 2));
        } else if (isCode) {
            subtasks.push(createSubtask('subtask-1', '需求分析', '需求分析师', 
                '分析需求和技术方案', [], '需求文档', baseTime));
            subtasks.push(createSubtask('subtask-2', '代码实现', '开发者', 
                '实现代码功能', ['subtask-1'], '代码文件', baseTime * 3));
        } else if (isData) {
            subtasks.push(createSubtask('subtask-1', '数据获取', '数据工程师', 
                '获取和整理数据', [], '数据集', baseTime));
            subtasks.push(createSubtask('subtask-2', '数据分析', '数据分析师', 
                '分析数据并生成结论', ['subtask-1'], '分析报告', baseTime * 2));
        } else {
            // 默认分解
            subtasks.push(createSubtask('subtask-1', '任务执行', '执行专家', 
                '执行任务', [], '执行结果', baseTime * 2));
        }
    } else if (complexity.level === '中等') {
        // 中等任务：3个子Agent
        if (isWriting) {
            subtasks.push(createSubtask('subtask-1', '素材收集', '搜索专家', 
                '搜索和整理相关信息素材', [], '素材包', baseTime));
            subtasks.push(createSubtask('subtask-2', '大纲设计', '架构专家', 
                '设计内容结构和章节规划', ['subtask-1'], '内容大纲', baseTime));
            subtasks.push(createSubtask('subtask-3', '内容撰写', '写作专家', 
                '撰写完整内容', ['subtask-2'], '完整文稿', baseTime * 3));
        } else if (isCode) {
            subtasks.push(createSubtask('subtask-1', '需求分析', '需求分析师', 
                '分析需求', [], '需求文档', baseTime));
            subtasks.push(createSubtask('subtask-2', '架构设计', '架构师', 
                '设计系统架构', ['subtask-1'], '架构文档', baseTime));
            subtasks.push(createSubtask('subtask-3', '代码实现', '开发者', 
                '实现核心功能', ['subtask-2'], '代码', baseTime * 3));
        } else {
            // 默认分解
            for (let i = 1; i <= 3; i++) {
                subtasks.push(createSubtask(`subtask-${i}`, `步骤${i}`, '执行专家', 
                    `执行步骤${i}`, i > 1 ? [`subtask-${i-1}`] : [], `结果${i}`, baseTime * (4-i)));
            }
        }
    } else {
        // 复杂/极复杂任务：4-6个子Agent
        if (isWriting) {
            subtasks.push(createSubtask('subtask-1', '世界观构建', '世界观专家', 
                '构建世界观和背景设定', [], '世界观文档', baseTime));
            subtasks.push(createSubtask('subtask-2', '素材收集', '搜索专家', 
                '收集相关素材和参考资料', [], '素材库', baseTime));
            subtasks.push(createSubtask('subtask-3', '大纲设计', '架构专家', 
                '设计故事结构和章节规划', ['subtask-1', 'subtask-2'], '完整大纲', baseTime));
            subtasks.push(createSubtask('subtask-4', '内容撰写', '写作专家', 
                '撰写章节内容', ['subtask-3'], '章节文稿', baseTime * 4));
            subtasks.push(createSubtask('subtask-5', '质量审查', '审查专家', 
                '审查内容质量和逻辑', ['subtask-4'], '审查报告', baseTime));
        } else if (isCode) {
            subtasks.push(createSubtask('subtask-1', '需求分析', '需求分析师', 
                '分析详细需求', [], '需求文档', baseTime));
            subtasks.push(createSubtask('subtask-2', '架构设计', '架构师', 
                '设计系统架构', ['subtask-1'], '架构文档', baseTime));
            subtasks.push(createSubtask('subtask-3', '数据库设计', '数据库工程师', 
                '设计数据库结构', ['subtask-1'], '数据库设计', baseTime));
            subtasks.push(createSubtask('subtask-4', '后端开发', '后端开发者', 
                '实现后端功能', ['subtask-2', 'subtask-3'], '后端代码', baseTime * 2));
            subtasks.push(createSubtask('subtask-5', '前端开发', '前端开发者', 
                '实现前端界面', ['subtask-2'], '前端代码', baseTime * 2));
            subtasks.push(createSubtask('subtask-6', '测试集成', '测试工程师', 
                '测试和集成', ['subtask-4', 'subtask-5'], '测试报告', baseTime));
        } else {
            // 默认分解
            const defaultSteps = ['调研', '分析', '设计', '实现', '验证', '交付'];
            const stepCount = Math.min(complexity.subagentCount, 6);
            for (let i = 0; i < stepCount; i++) {
                const deps = i > 1 ? [`subtask-${i}`] : (i > 0 ? ['subtask-1'] : []);
                subtasks.push(createSubtask(
                    `subtask-${i + 1}`, 
                    defaultSteps[i], 
                    '执行专家',
                    `执行${defaultSteps[i]}工作`,
                    deps,
                    `${defaultSteps[i]}结果`,
                    baseTime * (stepCount - i)
                ));
            }
        }
    }

    return subtasks;
}

/**
 * 创建子任务对象
 */
function createSubtask(id, name, agentRole, description, input, output, estimatedTime) {
    const modelByRole = {
        '搜索专家': 'MiniMax-M2.7',
        '写作专家': 'MiniMax-M2.7',
        '架构专家': 'MiniMax-M2.7',
        '审查专家': 'MiniMax-M2.7',
        '需求分析师': 'MiniMax-M2.7',
        '架构师': 'MiniMax-M2.7',
        '开发者': 'MiniMax-M2.7',
        '数据工程师': 'MiniMax-M2.7',
        '数据分析师': 'MiniMax-M2.7',
        '世界观专家': 'MiniMax-M2.7',
        '后端开发者': 'MiniMax-M2.7',
        '前端开发者': 'MiniMax-M2.7',
        '测试工程师': 'MiniMax-M2.7',
        '数据库工程师': 'MiniMax-M2.7',
        '执行专家': 'MiniMax-M2.7'
    };

    return {
        id,
        name,
        agentRole,
        description,
        input,
        output,
        estimatedTime,
        model: modelByRole[agentRole] || 'MiniMax-M2.7'
    };
}

/**
 * 构建依赖图
 * @param {SubTask[]} subtasks 
 * @returns {DependencyGraph}
 */
function buildDependencyGraph(subtasks) {
    const nodes = subtasks.map(t => t.id);
    const edges = [];

    for (const task of subtasks) {
        for (const inputId of task.input) {
            edges.push({ from: inputId, to: task.id });
        }
    }

    // 计算并行组（同一批可以并行的任务）
    const parallelGroups = [];
    const processed = new Set();

    // 找出没有依赖的任务（第一批并行）
    const firstGroup = subtasks
        .filter(t => t.input.length === 0)
        .map(t => t.id);
    if (firstGroup.length > 0) {
        parallelGroups.push(firstGroup);
        firstGroup.forEach(id => processed.add(id));
    }

    // 逐层计算后续并行组
    let changed = true;
    while (processed.size < subtasks.length) {
        const group = [];
        for (const task of subtasks) {
            if (!processed.has(task.id) && 
                task.input.every(inputId => processed.has(inputId))) {
                group.push(task.id);
            }
        }
        if (group.length === 0) break;
        parallelGroups.push(group);
        group.forEach(id => processed.add(id));
    }

    return { nodes, edges, parallelGroups };
}

/**
 * 构建执行计划
 * @param {SubTask[]} subtasks 
 * @param {DependencyGraph} dependencyGraph 
 * @returns {ExecutionPlan}
 */
function buildExecutionPlan(subtasks, dependencyGraph) {
    // 计算总预估时间
    const totalEstimatedTime = subtasks.reduce((sum, t) => sum + t.estimatedTime, 0);

    // 找出关键路径（耗时最长的依赖链）
    const taskMap = new Map(subtasks.map(t => [t.id, t]));
    let criticalPath = [];
    let maxTime = 0;

    function findLongestPath(taskId, path, time) {
        const task = taskMap.get(taskId);
        if (!task) return;
        
        const newPath = [...path, taskId];
        const newTime = time + task.estimatedTime;

        if (task.input.length === 0) {
            if (newTime > maxTime) {
                maxTime = newTime;
                criticalPath = newPath;
            }
            return;
        }

        for (const inputId of task.input) {
            findLongestPath(inputId, newPath, newTime);
        }
    }

    for (const task of subtasks) {
        findLongestPath(task.id, [], 0);
    }

    // 关键路径名称转换
    const criticalPathNames = criticalPath.map(id => {
        const task = taskMap.get(id);
        return task ? task.name : id;
    });

    // 计算并行度
    const maxParallel = Math.max(...dependencyGraph.parallelGroups.map(g => g.length));

    return {
        totalEstimatedTime,
        criticalPath: criticalPathNames,
        criticalPathIds: criticalPath,
        parallelismDegree: maxParallel
    };
}

/**
 * 生成UUID
 */
function generateUUID() {
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// ============ 导出 ============

module.exports = {
    // 核心函数
    decomposeTask,
    classifyTask,
    calculateComplexity,
    
    // 辅助函数（暴露用于测试）
    detectDimensions,
    detectCustomRequirements,
    detectAgencyAgent,
    generateSubtasks,
    buildDependencyGraph,
    buildExecutionPlan,
    
    // 常量
    TASK_TYPES: {
        SINGLE: 1,
        STANDARD: 2,
        INNOVATIVE_STANDARD: 3,
        INNOVATIVE: 4
    },
    COMPLEXITY_LEVELS: {
        SIMPLE: '简单',
        MEDIUM: '中等',
        COMPLEX: '复杂',
        EXTREME: '极复杂'
    }
};
