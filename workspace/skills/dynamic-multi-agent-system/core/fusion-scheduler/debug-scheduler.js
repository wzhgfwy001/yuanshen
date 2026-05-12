const scheduler = require('./fusion-scheduler.js');

console.log('=== 调试架构匹配 ===\n');

const task = '分析一下这个系统应该用什么架构';
const registry = scheduler.loadRegistry();

console.log('Task:', task);
console.log('');

// 检查架构师模板的触发词
console.log('Architect triggers:', registry.agencyTemplates['architect'].triggers);
console.log('');

// 测试匹配
const score = scheduler.matchTriggers(task, registry.agencyTemplates['architect'].triggers, registry.matchingRules);
console.log('Match score:', score);

// 逐个检查
console.log('\n逐个检查:');
for (const trigger of registry.agencyTemplates['architect'].triggers) {
  const found = task.includes(trigger);
  console.log(`  "${trigger}" -> ${found ? '✓' : '✗'}`);
}
