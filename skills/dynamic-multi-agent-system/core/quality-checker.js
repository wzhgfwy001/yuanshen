/**
 * quality-checker.js
 * 【鉴定物品】质量检查器
 * 
 * 功能：
 * - 三层检查机制
 *   1. 自我检查 - 子Agent完成任务后自检
 *   2. 主Agent确认 - 确认输出是否符合需求
 *   3. 审查Agent审查 - 复杂任务时（≥4子Agent）
 * 
 * 导出函数：
 * - selfCheck(agentOutput) - 自我检查
 * - agentConfirm(output, requirements) - 主Agent确认
 * - reviewAgentCheck(output, context) - 审查Agent检查
 * - runQualityGates(task, outputs) - 运行三层质检
 */

const path = require('path');

/**
 * 自我检查结果
 * @typedef {Object} SelfCheckResult
 * @property {boolean} passed - 是否通过
 * @property {number} score - 评分 1-5
 * @property {Object} checklist - 检查清单
 * @property {string[]} issues - 发现的问题
 * @property {number} confidence - 置信度 0-1
 * @property {string} recommendation - 建议
 */

/**
 * 主Agent确认结果
 * @typedef {Object} AgentConfirmResult
 * @property {string} decision - pass/modify/reject
 * @property {Object} feedback - 反馈信息
 * @property {string[]} passedItems - 通过的检查项
 * @property {Issue[]} issues - 发现的问题
 * @property {number} maxRetries - 最大重试次数
 * @property {number} currentRetry - 当前重试次数
 */

/**
 * 审查Agent检查结果
 * @typedef {Object} ReviewAgentResult
 * @property {boolean} passed - 是否通过
 * @property {number} score - 综合评分
 * @property {Object} layerResults - 各层检查结果
 * @property {Issue[]} issues - 发现的问题
 * @property {string[]} suggestions - 改进建议
 * @property {string} finalDecision - 最终决定
 */

/**
 * 问题对象
 * @typedef {Object} Issue
 * @property {string} location - 问题位置
 * @property {string} problem - 问题描述
 * @property {string} suggestion - 修复建议
 * @property {string} priority - critical/high/medium/low
 */

/**
 * 质量门检查结果
 * @typedef {Object} QualityGatesResult
 * @property {boolean} overallPassed - 整体是否通过
 * @property {number} overallScore - 综合评分
 * @property {Object} layerResults - 三层检查结果
 * @property {Issue[]} allIssues - 所有发现的问题
 * @property {number} totalIterations - 总迭代次数
 * @property {string} finalDecision - 最终决定
 * @property {Object} quality - 质量指标
 */

// ============ 第一层：自我检查 ============

/**
 * 子Agent自我检查
 * 完成任务后进行自我检查，输出检查报告
 * 
 * @param {Object} agentOutput - Agent输出对象
 * @param {string} agentOutput.output - 输出内容
 * @param {string} agentOutput.agentId - Agent ID
 * @param {string} agentOutput.taskId - 任务ID
 * @param {Object} [agentOutput.metadata] - 元数据
 * @returns {SelfCheckResult}
 */
function selfCheck(agentOutput) {
    const { output, agentId, taskId, metadata = {} } = agentOutput;
    
    const checklist = {
        completed: false,
        format: false,
        logic: false,
        content: false,
        constraints: false
    };

    const issues = [];
    let score = 5;
    let confidence = 0.9;

    // 检查1：是否完成所有任务要求
    if (metadata.requiredLength) {
        const actualLength = estimateLength(output);
        const lengthDiff = Math.abs(actualLength - metadata.requiredLength) / metadata.requiredLength;
        checklist.completed = lengthDiff <= 0.1;
        if (!checklist.completed) {
            issues.push({
                location: '整体',
                problem: `字数不符合要求（期望${metadata.requiredLength}，实际约${actualLength}）`,
                suggestion: '请调整内容长度',
                priority: 'high'
            });
            score -= 1;
        }
    } else {
        checklist.completed = output && output.length > 100;
    }

    // 检查2：输出格式是否正确
    if (metadata.format === 'json') {
        try {
            JSON.parse(output);
            checklist.format = true;
        } catch (e) {
            checklist.format = false;
            issues.push({
                location: '整体',
                problem: 'JSON格式错误',
                suggestion: '请检查JSON语法',
                priority: 'critical'
            });
            score -= 2;
        }
    } else if (metadata.format === 'markdown') {
        checklist.format = output.includes('#') || output.includes('\n');
    } else {
        checklist.format = output && output.length > 0;
    }

    // 检查3：逻辑是否自洽
    const logicIssues = checkLogic(output, metadata);
    checklist.logic = logicIssues.length === 0;
    if (!checklist.logic) {
        issues.push(...logicIssues);
        score -= 1;
    }

    // 检查4：内容质量
    const contentIssues = checkContent(output, metadata);
    checklist.content = contentIssues.length === 0;
    if (!checklist.content) {
        issues.push(...contentIssues);
        score -= 0.5;
    }

    // 检查5：约束条件
    if (metadata.constraints) {
        const constraintIssues = checkConstraints(output, metadata.constraints);
        checklist.constraints = constraintIssues.length === 0;
        if (!checklist.constraints) {
            issues.push(...constraintIssues);
            score -= 1;
        }
    }

    // 调整置信度
    if (issues.length > 0) {
        confidence = Math.max(0.3, 0.9 - issues.length * 0.15);
    }

    // 生成建议
    let recommendation = '通过';
    if (score >= 4) {
        recommendation = '良好，可考虑小幅优化';
    } else if (score >= 3) {
        recommendation = '需要修改后通过';
    } else {
        recommendation = '需要重大修改或重新执行';
    }

    return {
        passed: score >= 3,
        score: Math.max(1, Math.min(5, score)),
        checklist,
        issues,
        confidence,
        recommendation,
        agentId,
        taskId,
        timestamp: new Date().toISOString()
    };
}

/**
 * 估算文本长度
 */
function estimateLength(text) {
    if (!text) return 0;
    // 中文字符 + 英文单词/其他字符
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const others = text.length - chinese;
    return Math.round(chinese + others * 0.5);
}

/**
 * 检查逻辑一致性
 */
function checkLogic(output, metadata) {
    const issues = [];
    if (!output) return issues;

    // 检查前后矛盾（简化版）
    const contradictions = [
        { before: '然而', after: '因此' },
        { before: '但是', after: '所以' }
    ];

    for (const c of contradictions) {
        if (output.includes(c.before) && output.includes(c.after)) {
            // 检测到可能的逻辑跳跃
            const idx1 = output.indexOf(c.before);
            const idx2 = output.indexOf(c.after);
            if (Math.abs(idx1 - idx2) < 100) {
                issues.push({
                    location: '逻辑',
                    problem: '检测到可能的逻辑不一致',
                    suggestion: '请检查因果关系是否成立',
                    priority: 'medium'
                });
                break;
            }
        }
    }

    return issues;
}

/**
 * 检查内容质量
 */
function checkContent(output, metadata) {
    const issues = [];
    if (!output) return issues;

    // 检查重复
    const words = output.split(/\s+/);
    const wordFreq = {};
    for (const word of words) {
        if (word.length > 3) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    }
    const repeated = Object.entries(wordFreq).find(([_, count]) => count > 10);
    if (repeated) {
        issues.push({
            location: '内容',
            problem: `检测到重复内容："${repeated[0]}"出现${repeated[1]}次`,
            suggestion: '请删除重复内容',
            priority: 'medium'
        });
    }

    return issues;
}

/**
 * 检查约束条件
 */
function checkConstraints(output, constraints) {
    const issues = [];
    if (!output || !constraints) return issues;

    for (const constraint of constraints) {
        if (constraint.type === 'keyword') {
            if (!output.includes(constraint.value)) {
                issues.push({
                    location: '约束',
                    problem: `缺少必要关键词：${constraint.value}`,
                    suggestion: `请在内容中包含"${constraint.value}"`,
                    priority: constraint.priority || 'medium'
                });
            }
        } else if (constraint.type === 'forbidden') {
            if (output.includes(constraint.value)) {
                issues.push({
                    location: '约束',
                    problem: `包含禁止内容：${constraint.value}`,
                    suggestion: `请删除"${constraint.value}"`,
                    priority: constraint.priority || 'high'
                });
            }
        }
    }

    return issues;
}

// ============ 第二层：主Agent确认 ============

/**
 * 主Agent确认
 * 检查子Agent输出是否符合需求
 * 
 * @param {Object} output - Agent输出
 * @param {Object} requirements - 需求对象
 * @param {string} requirements.originalTask - 原始任务
 * @param {string} [requirements.requiredLength] - 要求字数
 * @param {string} [requirements.format] - 要求格式
 * @param {string[]} [requirements.keywords] - 必须包含的关键词
 * @param {string[]} [requirements.mustHave] - 必须包含的内容
 * @param {Object} [requirements.constraints] - 约束条件
 * @returns {AgentConfirmResult}
 */
function agentConfirm(output, requirements) {
    const {
        originalTask = '',
        requiredLength,
        format,
        keywords = [],
        mustHave = [],
        constraints = {}
    } = requirements;

    const passedItems = [];
    const issues = [];
    let decision = 'pass';
    let score = 5;

    // 检查1：任务完成度
    if (originalTask) {
        const taskWords = originalTask.toLowerCase().split(/\s+/);
        const outputLower = output.toLowerCase();
        const matchedWords = taskWords.filter(w => w.length > 2 && outputLower.includes(w));
        const matchRate = matchedWords.length / taskWords.filter(w => w.length > 2).length;
        
        if (matchRate >= 0.7) {
            passedItems.push('任务核心词覆盖');
        } else {
            issues.push({
                location: '整体',
                problem: `任务关键内容覆盖不足（${Math.round(matchRate * 100)}%）`,
                suggestion: '请确保涵盖任务要求的所有核心内容',
                priority: 'high'
            });
            decision = 'modify';
            score -= 2;
        }
    }

    // 检查2：字数要求
    if (requiredLength) {
        const actualLength = estimateLength(output);
        const diff = Math.abs(actualLength - requiredLength) / requiredLength;
        if (diff <= 0.1) {
            passedItems.push(`字数符合（${actualLength}字）`);
        } else {
            issues.push({
                location: '整体',
                problem: `字数不符合（期望${requiredLength}，实际${actualLength}）`,
                suggestion: diff > 0.1 ? '请调整内容长度' : '字数偏差在可接受范围',
                priority: diff > 0.2 ? 'high' : 'medium'
            });
            if (decision === 'pass') decision = 'modify';
            score -= 1;
        }
    }

    // 检查3：格式要求
    if (format) {
        if (format === 'json') {
            try {
                JSON.parse(output);
                passedItems.push('JSON格式正确');
            } catch (e) {
                issues.push({
                    location: '格式',
                    problem: 'JSON格式错误',
                    suggestion: '请检查JSON语法',
                    priority: 'critical'
                });
                decision = 'reject';
                score -= 2;
            }
        } else if (format === 'markdown') {
            if (output.includes('#') || output.includes('##')) {
                passedItems.push('Markdown格式正确');
            } else {
                issues.push({
                    location: '格式',
                    problem: '缺少Markdown标记',
                    suggestion: '请使用Markdown格式组织内容',
                    priority: 'low'
                });
            }
        }
    }

    // 检查4：必须包含的关键词
    for (const keyword of keywords) {
        if (output.includes(keyword)) {
            passedItems.push(`包含关键词：${keyword}`);
        } else {
            issues.push({
                location: '内容',
                problem: `缺少关键词：${keyword}`,
                suggestion: `请在内容中加入"${keyword}"`,
                priority: 'medium'
            });
            if (decision === 'pass') decision = 'modify';
            score -= 0.5;
        }
    }

    // 检查5：必须包含的内容
    for (const must of mustHave) {
        if (output.includes(must)) {
            passedItems.push(`包含必要内容：${must}`);
        } else {
            issues.push({
                location: '内容',
                problem: `缺少必要内容：${must}`,
                suggestion: `请添加"${must}"相关内容`,
                priority: 'high'
            });
            decision = 'modify';
            score -= 1;
        }
    }

    // 检查6：其他约束
    if (constraints.noAI && detectAI写作(output)) {
        issues.push({
            location: '风格',
            problem: '检测到AI写作特征',
            suggestion: '请调整写作风格，去除AI味',
            priority: 'high'
        });
        if (decision === 'pass') decision = 'modify';
        score -= 1;
    }

    // 限制检查
    const maxRetries = 3;
    const currentRetry = 0;

    return {
        decision,
        feedback: {
            passedItems,
            issues,
            maxRetries,
            currentRetry
        },
        score: Math.max(1, Math.min(5, score)),
        timestamp: new Date().toISOString()
    };
}

/**
 * 检测AI写作特征（简化版）
 */
function detectAI写作(text) {
    if (!text) return false;
    
    const aiPatterns = [
        '首先', '其次', '最后', '总之',
        '因此', '所以', '然而', '但是',
        '一方面', '另一方面', '值得注意的是'
    ];
    
    let matchCount = 0;
    for (const pattern of aiPatterns) {
        if (text.includes(pattern)) matchCount++;
    }
    
    return matchCount >= 3;
}

// ============ 第三层：审查Agent审查 ============

/**
 * 审查Agent检查
 * 复杂任务时（≥4子Agent）启用独立审查
 * 
 * @param {Object} output - 待审查输出
 * @param {Object} context - 上下文信息
 * @param {string} context.originalTask - 原始任务
 * @param {number} context.subagentCount - 子Agent数量
 * @param {Object[]} context.layerResults - 前两层检查结果
 * @param {Object[]} context.allOutputs - 所有子Agent输出
 * @returns {ReviewAgentResult}
 */
function reviewAgentCheck(output, context) {
    const { originalTask, subagentCount = 0, layerResults = {}, allOutputs = [] } = context;

    const issues = [];
    const suggestions = [];
    const layerResults_out = {};

    // 检查是否需要第三层审查
    const needsReview = subagentCount >= 4 || 
        (layerResults.selfCheck && layerResults.selfCheck.score < 4) ||
        (layerResults.mainAgentCheck && layerResults.mainCheck.decision === 'modify');

    if (!needsReview) {
        return {
            passed: true,
            score: layerResults.mainAgentCheck?.score || 4,
            layerResults,
            issues: [],
            suggestions: ['任务简单，无需第三层审查'],
            finalDecision: 'pass',
            timestamp: new Date().toISOString()
        };
    }

    // 执行第三层审查
    layerResults_out.reviewAgent = {
        executed: true,
        timestamp: new Date().toISOString()
    };

    // 1. 整体一致性检查
    const consistencyIssues = checkConsistency(allOutputs);
    issues.push(...consistencyIssues);

    // 2. 跨Agent协调检查
    const coordinationIssues = checkCoordination(allOutputs);
    issues.push(...coordinationIssues);

    // 3. 完整性最终检查
    const completenessIssues = checkCompleteness(output, originalTask);
    issues.push(...completenessIssues);

    // 4. 生成建议
    if (issues.length === 0) {
        suggestions.push('整体质量良好，可直接交付');
    } else {
        const criticalIssues = issues.filter(i => i.priority === 'critical');
        const highIssues = issues.filter(i => i.priority === 'high');
        
        if (criticalIssues.length > 0) {
            suggestions.push('存在致命问题，必须修复');
        } else if (highIssues.length > 0) {
            suggestions.push('存在严重问题，建议修复');
        } else {
            suggestions.push('存在一般问题，可选择性修复');
        }
    }

    // 计算综合评分
    const baseScore = layerResults.mainAgentCheck?.score || 4;
    const penalty = issues.reduce((sum, issue) => {
        const penalties = { critical: 2, high: 1, medium: 0.5, low: 0.2 };
        return sum + (penalties[issue.priority] || 0);
    }, 0);
    const finalScore = Math.max(1, Math.min(5, baseScore - penalty));

    const passed = issues.filter(i => i.priority === 'critical' || i.priority === 'high').length === 0;

    return {
        passed,
        score: Math.round(finalScore * 10) / 10,
        layerResults: layerResults_out,
        issues,
        suggestions,
        finalDecision: passed ? 'pass' : 'modify',
        timestamp: new Date().toISOString()
    };
}

/**
 * 检查各Agent输出之间的一致性
 */
function checkConsistency(allOutputs) {
    const issues = [];
    
    if (allOutputs.length < 2) return issues;

    // 检查关键术语是否统一
    const allText = allOutputs.map(o => o.output || o).join('');
    
    // 检测可能的矛盾（简化版）
    const contradictionPairs = [
        ['是', '否'], ['有', '无'], ['可以', '不可以'],
        ['必须', '不必'], ['应该', '不应该']
    ];

    for (const [word1, word2] of contradictionPairs) {
        const pattern = new RegExp(`${word1}.{0,20}${word2}|${word2}.{0,20}${word1}`, 'i');
        if (pattern.test(allText)) {
            issues.push({
                location: '跨Agent一致性',
                problem: `检测到可能的逻辑矛盾（"${word1}"与"${word2}"）`,
                suggestion: '请检查各部分逻辑是否一致',
                priority: 'high'
            });
            break;
        }
    }

    return issues;
}

/**
 * 检查跨Agent协调
 */
function checkCoordination(allOutputs) {
    const issues = [];

    // 检查是否有遗漏的子任务
    const taskIds = allOutputs.map(o => o.taskId).filter(Boolean);
    const expectedTasks = new Set();
    allOutputs.forEach(o => {
        if (o.expectedTasks) {
            o.expectedTasks.forEach(t => expectedTasks.add(t));
        }
    });

    const missingTasks = [...expectedTasks].filter(t => !taskIds.includes(t));
    if (missingTasks.length > 0) {
        issues.push({
            location: '任务完整性',
            problem: `缺少子任务输出：${missingTasks.join(', ')}`,
            suggestion: '请确保所有子任务都已完成',
            priority: 'critical'
        });
    }

    // 检查数据传递接口
    for (let i = 1; i < allOutputs.length; i++) {
        const prev = allOutputs[i - 1];
        const curr = allOutputs[i];
        
        if (prev.interface && curr.interface) {
            const prevOutputs = Object.keys(prev.interface || {});
            const currInputs = Object.keys(curr.interface || {});
            
            for (const input of currInputs) {
                if (!prevOutputs.includes(input)) {
                    issues.push({
                        location: `Agent ${i} → Agent ${i + 1}`,
                        problem: `数据接口不匹配：缺少"${input}"`,
                        suggestion: '请检查前后Agent的数据传递',
                        priority: 'medium'
                    });
                }
            }
        }
    }

    return issues;
}

/**
 * 检查最终输出完整性
 */
function checkCompleteness(output, originalTask) {
    const issues = [];
    
    if (!output) {
        issues.push({
            location: '整体',
            problem: '输出为空',
            suggestion: '请重新执行任务',
            priority: 'critical'
        });
        return issues;
    }

    // 提取任务关键词
    const taskKeywords = originalTask
        .replace(/[，。！？、；：""''（）《》]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

    // 检查核心关键词覆盖
    const outputLower = output.toLowerCase();
    const uncovered = taskKeywords.filter(w => !outputLower.includes(w.toLowerCase()));
    
    if (uncovered.length > taskKeywords.length * 0.3) {
        issues.push({
            location: '完整性',
            problem: `核心内容覆盖不足：${uncovered.slice(0, 3).join(', ')}${uncovered.length > 3 ? '...' : ''}`,
            suggestion: '请确保涵盖任务的核心要求',
            priority: 'high'
        });
    }

    return issues;
}

// ============ 质量门：运行三层质检 ============

/**
 * 运行三层质检门
 * 按顺序执行三层检查，输出最终决策
 * 
 * @param {Object} task - 任务对象
 * @param {string} task.originalTask - 原始任务
 * @param {number} [task.subagentCount] - 子Agent数量
 * @param {Object} task.requirements - 需求对象
 * @param {Object[]} task.outputs - 所有子Agent输出
 * @returns {QualityGatesResult}
 */
function runQualityGates(task, outputs) {
    const { originalTask, subagentCount = 0, requirements = {} } = task;
    
    const layerResults = {
        selfCheck: null,
        mainAgentCheck: null,
        reviewAgentCheck: null
    };

    const allIssues = [];
    let totalIterations = 0;
    let overallPassed = false;
    let finalDecision = 'pass';

    // 第一层：自我检查
    for (const output of outputs) {
        const selfResult = selfCheck({
            output: output.output || output,
            agentId: output.agentId || 'unknown',
            taskId: output.taskId || 'unknown',
            metadata: requirements
        });
        
        if (!layerResults.selfCheck) {
            layerResults.selfCheck = { results: [] };
        }
        layerResults.selfCheck.results.push(selfResult);
        
        if (!selfResult.passed) {
            allIssues.push(...selfResult.issues.map(i => ({ ...i, layer: 'selfCheck' })));
        }
    }
    
    // 计算自我检查平均分
    if (layerResults.selfCheck.results.length > 0) {
        const avgScore = layerResults.selfCheck.results.reduce((sum, r) => sum + r.score, 0) 
            / layerResults.selfCheck.results.length;
        layerResults.selfCheck.avgScore = Math.round(avgScore * 10) / 10;
        layerResults.selfCheck.passed = avgScore >= 3;
    }

    // 第二层：主Agent确认
    for (const output of outputs) {
        const confirmResult = agentConfirm(output.output || output, {
            originalTask,
            requiredLength: requirements.requiredLength,
            format: requirements.format,
            keywords: requirements.keywords,
            mustHave: requirements.mustHave,
            constraints: requirements.constraints
        });
        
        if (!layerResults.mainAgentCheck) {
            layerResults.mainAgentCheck = { results: [] };
        }
        layerResults.mainAgentCheck.results.push(confirmResult);
        
        if (confirmResult.decision !== 'pass') {
            const issues = confirmResult.feedback && confirmResult.feedback.issues ? confirmResult.feedback.issues : [];
            allIssues.push(...issues.map(i => ({ ...i, layer: 'mainAgentCheck' })));
        }
        
        if (confirmResult.decision === 'reject') {
            finalDecision = 'reject';
        }
    }

    // 计算主Agent确认评分
    if (layerResults.mainAgentCheck.results.length > 0) {
        const avgScore = layerResults.mainAgentCheck.results.reduce((sum, r) => sum + r.score, 0) 
            / layerResults.mainAgentCheck.results.length;
        layerResults.mainAgentCheck.avgScore = Math.round(avgScore * 10) / 10;
    }

    // 第三层：审查Agent审查（仅复杂任务）
    if (subagentCount >= 4 || finalDecision !== 'pass') {
        const reviewResult = reviewAgentCheck(
            outputs.map(o => o.output || o).join('\n---\n'),
            {
                originalTask,
                subagentCount,
                layerResults,
                allOutputs: outputs
            }
        );
        
        layerResults.reviewAgentCheck = reviewResult;
        
        if (!reviewResult.passed) {
            allIssues.push(...reviewResult.issues.map(i => ({ ...i, layer: 'reviewAgent' })));
            finalDecision = reviewResult.finalDecision;
        }
    }

    // 计算综合评分
    let overallScore = 4;
    if (layerResults.selfCheck) {
        overallScore = Math.min(overallScore, layerResults.selfCheck.avgScore || 5);
    }
    if (layerResults.mainAgentCheck) {
        overallScore = Math.min(overallScore, layerResults.mainAgentCheck.avgScore || 5);
    }
    if (layerResults.reviewAgentCheck) {
        overallScore = Math.min(overallScore, layerResults.reviewAgentCheck.score || 5);
    }

    // 确定整体是否通过
    const criticalIssues = allIssues.filter(i => i.priority === 'critical');
    const highIssues = allIssues.filter(i => i.priority === 'high');
    
    if (criticalIssues.length > 0 || finalDecision === 'reject') {
        overallPassed = false;
        finalDecision = 'reject';
    } else if (highIssues.length > 0) {
        overallPassed = false;
        if (finalDecision !== 'reject') finalDecision = 'modify';
    } else {
        overallPassed = true;
    }

    // 质量指标
    const quality = {
        completeness: calculateCompleteness(layerResults, allIssues),
        accuracy: calculateAccuracy(layerResults),
        readability: calculateReadability(outputs)
    };

    return {
        overallPassed,
        overallScore: Math.round(overallScore * 10) / 10,
        layerResults,
        allIssues,
        totalIterations,
        finalDecision,
        quality,
        timestamp: new Date().toISOString()
    };
}

/**
 * 计算完整性指标
 */
function calculateCompleteness(layerResults, allIssues) {
    let completeness = 100;
    
    if (layerResults.selfCheck && !layerResults.selfCheck.passed) {
        completeness -= 10;
    }
    
    const issueCount = allIssues.filter(i => i.layer === 'selfCheck').length;
    completeness -= Math.min(30, issueCount * 5);
    
    return Math.max(0, completeness);
}

/**
 * 计算准确性指标
 */
function calculateAccuracy(layerResults) {
    let accuracy = 100;
    
    if (layerResults.mainAgentCheck) {
        const avgScore = layerResults.mainAgentCheck.avgScore || 5;
        accuracy = (avgScore / 5) * 100;
    }
    
    if (layerResults.reviewAgentCheck) {
        const reviewScore = layerResults.reviewAgentCheck.score || 5;
        accuracy = Math.min(accuracy, (reviewScore / 5) * 100);
    }
    
    return Math.round(accuracy);
}

/**
 * 计算可读性指标
 */
function calculateReadability(outputs) {
    // 简化版：基于输出结构评估
    let readability = 80;
    
    for (const output of outputs) {
        const text = output.output || output;
        if (typeof text !== 'string') continue;
        
        // 检查是否有基本结构
        if (text.includes('\n')) readability += 5;
        if (text.includes('。') || text.includes('.')) readability += 5;
        if (text.length > 500) readability += 5;
        if (text.length > 5000) readability += 5;
    }
    
    return Math.min(100, Math.round(readability / (outputs.length || 1)));
}

// ============ 导出 ============

module.exports = {
    // 三层检查函数
    selfCheck,
    agentConfirm,
    reviewAgentCheck,
    runQualityGates,
    
    // 辅助函数（暴露用于测试）
    estimateLength,
    checkLogic,
    checkContent,
    checkConstraints,
    detectAI写作,
    checkConsistency,
    checkCoordination,
    checkCompleteness,
    calculateCompleteness,
    calculateAccuracy,
    calculateReadability,
    
    // 常量
    DECISIONS: {
        PASS: 'pass',
        MODIFY: 'modify',
        REJECT: 'reject'
    },
    PRIORITIES: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },
    SCORES: {
        EXCELLENT: 5,
        GOOD: 4,
        ACCEPTABLE: 3,
        NEEDS_IMPROVEMENT: 2,
        FAIL: 1
    }
};
