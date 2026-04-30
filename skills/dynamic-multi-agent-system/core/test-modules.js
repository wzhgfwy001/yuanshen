/**
 * 测试验证文件
 * 验证 task-decomposer.js 和 quality-checker.js 能正常require和使用
 */

const path = require('path');

console.log('='.repeat(60));
console.log('开始测试 task-decomposer.js 和 quality-checker.js');
console.log('='.repeat(60));

// ============ 测试1：require 模块 ============
console.log('\n【测试1】require 模块');
console.log('-'.repeat(40));

let taskDecomposer, qualityChecker;
try {
    taskDecomposer = require('./task-decomposer.js');
    console.log('✅ task-decomposer.js 加载成功');
} catch (e) {
    console.error('❌ task-decomposer.js 加载失败:', e.message);
    process.exit(1);
}

try {
    qualityChecker = require('./quality-checker.js');
    console.log('✅ quality-checker.js 加载成功');
} catch (e) {
    console.error('❌ quality-checker.js 加载失败:', e.message);
    process.exit(1);
}

// ============ 测试2：task-decomposer 核心函数 ============
console.log('\n【测试2】task-decomposer 核心函数');
console.log('-'.repeat(40));

// 测试 classifyTask
console.log('\n2.1 测试 classifyTask()');
const testTasks = [
    '写一篇科幻小说',
    '分析销售数据并生成报告',
    '开发一个完整的企业管理系统',
    '帮我设计公司组织架构'
];

for (const task of testTasks) {
    const result = taskDecomposer.classifyTask(task);
    console.log(`  任务: "${task}"`);
    console.log(`    类型: ${result.type} (${result.typeName})`);
    console.log(`    置信度: ${result.confidence}`);
    console.log(`    维度: [${result.dimensions.join(', ')}]`);
    console.log('');
}

// 测试 calculateComplexity
console.log('2.2 测试 calculateComplexity()');
const complexity1 = taskDecomposer.calculateComplexity('写一个短篇故事');
const complexity2 = taskDecomposer.calculateComplexity('开发一个完整的企业管理系统，包含前端、后端、数据库、部署');
console.log(`  "写一个短篇故事" -> ${complexity1.level} (分数: ${complexity1.score}, 子Agent: ${complexity1.subagentCount})`);
console.log(`  "开发完整企业系统" -> ${complexity2.level} (分数: ${complexity2.score}, 子Agent: ${complexity2.subagentCount})`);

// 测试 decomposeTask
console.log('\n2.3 测试 decomposeTask()');
const decomResult = taskDecomposer.decomposeTask('写一本10章的悬疑小说，暴风雪山庄模式');
console.log(`  任务ID: ${decomResult.taskId}`);
console.log(`  任务类型: ${decomResult.classification.typeName}`);
console.log(`  复杂度: ${decomResult.complexity.level} (${decomResult.complexity.subagentCount}个子Agent)`);
console.log(`  子任务数: ${decomResult.subtasks.length}`);
console.log('  子任务列表:');
for (const subtask of decomResult.subtasks) {
    console.log(`    - ${subtask.id}: ${subtask.name} (${subtask.agentRole})`);
}
console.log(`  依赖图并行组: ${JSON.stringify(decomResult.dependencyGraph.parallelGroups)}`);
console.log(`  执行计划: 总时间${decomResult.executionPlan.totalEstimatedTime}秒, 关键路径: [${decomResult.executionPlan.criticalPath.join(' -> ')}]`);

// ============ 测试3：quality-checker 核心函数 ============
console.log('\n【测试3】quality-checker 核心函数');
console.log('-'.repeat(40));

// 测试 selfCheck
console.log('\n3.1 测试 selfCheck()');
const selfCheckResult = qualityChecker.selfCheck({
    output: '这是一个测试输出，用于验证自我检查功能是否正常工作。内容完整，逻辑清晰。',
    agentId: 'agent-test-001',
    taskId: 'task-test-001',
    metadata: {
        requiredLength: 50,
        format: 'text'
    }
});
console.log(`  通过: ${selfCheckResult.passed}`);
console.log(`  评分: ${selfCheckResult.score}/5`);
console.log(`  置信度: ${selfCheckResult.confidence}`);
console.log(`  问题数: ${selfCheckResult.issues.length}`);
if (selfCheckResult.issues.length > 0) {
    console.log('  问题列表:');
    for (const issue of selfCheckResult.issues) {
        console.log(`    - [${issue.priority}] ${issue.location}: ${issue.problem}`);
    }
}

// 测试 agentConfirm
console.log('\n3.2 测试 agentConfirm()');
const confirmResult = qualityChecker.agentConfirm(
    '这是一个关于人工智能的分析报告，分析了AI的发展趋势和应用场景。',
    {
        originalTask: '写一篇关于人工智能的文章',
        requiredLength: 100,
        keywords: ['人工智能', '分析'],
        mustHave: ['发展趋势']
    }
);
console.log(`  决策: ${confirmResult.decision}`);
console.log(`  评分: ${confirmResult.score}/5`);
console.log(`  通过项: [${confirmResult.feedback.passedItems.join(', ')}]`);
console.log(`  问题数: ${confirmResult.feedback.issues.length}`);

// 测试 reviewAgentCheck
console.log('\n3.3 测试 reviewAgentCheck()');
const reviewResult = qualityChecker.reviewAgentCheck(
    '这是一个完整的系统设计文档，包含架构设计、数据库设计、接口设计等内容。',
    {
        originalTask: '设计一个完整的企业管理系统',
        subagentCount: 4,
        layerResults: {
            selfCheck: { avgScore: 4, passed: true },
            mainAgentCheck: { decision: 'pass', score: 4 }
        },
        allOutputs: [
            { output: '架构设计内容', taskId: 'task-1' },
            { output: '数据库设计内容', taskId: 'task-2' },
            { output: '接口设计内容', taskId: 'task-3' },
            { output: '系统设计文档', taskId: 'task-4' }
        ]
    }
);
console.log(`  通过: ${reviewResult.passed}`);
console.log(`  评分: ${reviewResult.score}/5`);
console.log(`  最终决定: ${reviewResult.finalDecision}`);
console.log(`  建议: ${reviewResult.suggestions[0]}`);

// 测试 runQualityGates
console.log('\n3.4 测试 runQualityGates()');
const gateResult = qualityChecker.runQualityGates(
    {
        originalTask: '写一本科幻小说',
        subagentCount: 4,
        requirements: {
            requiredLength: 5000,
            keywords: ['科幻', '未来', '科技']
        }
    },
    [
        { output: '世界观设定：未来星际时代，人类已掌握超光速航行技术。', agentId: 'agent-1', taskId: 'task-1' },
        { output: '故事大纲：主人公驾驶星际飞船探索未知星系。', agentId: 'agent-2', taskId: 'task-2' },
        { output: '第一章初稿完成，描写了星际港口的繁华景象。', agentId: 'agent-3', taskId: 'task-3' },
        { output: '质量审查通过，文笔流畅，情节合理。', agentId: 'agent-4', taskId: 'task-4' }
    ]
);
console.log(`  整体通过: ${gateResult.overallPassed}`);
console.log(`  综合评分: ${gateResult.overallScore}/5`);
console.log(`  最终决定: ${gateResult.finalDecision}`);
console.log(`  质量问题: ${gateResult.quality.completeness}% 完整性, ${gateResult.quality.accuracy}% 准确性, ${gateResult.quality.readability}% 可读性`);
console.log(`  总问题数: ${gateResult.allIssues.length}`);

// ============ 测试4：模块导出验证 ============
console.log('\n【测试4】模块导出验证');
console.log('-'.repeat(40));

console.log('\ntask-decomposer.js 导出:');
console.log('  - decomposeTask:', typeof taskDecomposer.decomposeTask === 'function' ? '✅' : '❌');
console.log('  - classifyTask:', typeof taskDecomposer.classifyTask === 'function' ? '✅' : '❌');
console.log('  - calculateComplexity:', typeof taskDecomposer.calculateComplexity === 'function' ? '✅' : '❌');
console.log('  - TASK_TYPES常量:', taskDecomposer.TASK_TYPES ? '✅' : '❌');
console.log('  - COMPLEXITY_LEVELS常量:', taskDecomposer.COMPLEXITY_LEVELS ? '✅' : '❌');

console.log('\nquality-checker.js 导出:');
console.log('  - selfCheck:', typeof qualityChecker.selfCheck === 'function' ? '✅' : '❌');
console.log('  - agentConfirm:', typeof qualityChecker.agentConfirm === 'function' ? '✅' : '❌');
console.log('  - reviewAgentCheck:', typeof qualityChecker.reviewAgentCheck === 'function' ? '✅' : '❌');
console.log('  - runQualityGates:', typeof qualityChecker.runQualityGates === 'function' ? '✅' : '❌');
console.log('  - DECISIONS常量:', qualityChecker.DECISIONS ? '✅' : '❌');
console.log('  - PRIORITIES常量:', qualityChecker.PRIORITIES ? '✅' : '❌');
console.log('  - SCORES常量:', qualityChecker.SCORES ? '✅' : '❌');

// ============ 测试结果汇总 ============
console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
