// 测试预防系统
const hooks = require('./prevention-hooks.js');

console.log('=== 测试预防系统 ===');

// 测试1: 加载模块
console.log('\n[测试1] 模块加载');
const modules = {
  prevention: !!hooks.loadPreventionSystem(),
  querier: !!hooks.loadLessonQuerier(),
  engine: !!hooks.loadAvoidanceEngine()
};
console.log('模块状态:', modules);

// 测试2: 任务前检查
console.log('\n[测试2] 任务前预防检查');
const testTask = {
  taskType: 'code_review',
  command: '检查代码质量',
  tools: ['read', 'exec'],
  environment: 'windows'
};
const beforeResult = hooks.beforeTask(testTask);
console.log('预防结果:', beforeResult);

// 测试3: 查询教训
console.log('\n[测试3] 手动查询教训');
const lessons = hooks.queryLessons('code_review', { tool: 'exec' });
console.log('教训数量:', lessons.length);
if (lessons.length > 0) {
  console.log('第一条教训:', lessons[0].title);
}

console.log('\n=== 测试完成 ===');
