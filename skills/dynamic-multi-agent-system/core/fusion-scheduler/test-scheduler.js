const scheduler = require('./fusion-scheduler.js');

console.log('=== 融合调度器测试 ===\n');

// 测试任务
const tasks = [
  { id: 't1', description: '用张雪峰风格分析文科生适合的专业' },
  { id: 't2', description: '做一个数据报告包含图表' },
  { id: 't3', description: '帮我写一个产品需求文档' },
  { id: 't4', description: '分析一下这个系统应该用什么架构' },
  { id: 't5', description: '用毛泽东的思路分析当前困难' }
];

const result = scheduler.planEquip(tasks);

console.log('=== 装备摘要 ===');
console.log(`总任务数: ${result.summary.total}`);
console.log(`已装备: ${result.summary.equipped}`);
console.log(`女娲人格: ${result.summary.nuwaCount}`);
console.log(`Agency模板: ${result.summary.agencyCount}`);
console.log(`自定义Fallback: ${result.summary.customCount}`);
console.log('');

console.log('=== 详细计划 ===');
result.plans.forEach((p, i) => {
  console.log(`\n[${i+1}] ${p.type.toUpperCase()} - ${p.name || 'Custom'} (Score: ${p.matchScore || 'N/A'})`);
  console.log(`    原因: ${p.reasoning.join(' | ')}`);
  console.log(`    任务: ${p.subTask.description}`);
});
