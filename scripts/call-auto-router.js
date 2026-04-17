/**
 * call-auto-router.js
 * 对话预处理脚本 - 调用auto-router分析用户消息
 * 
 * 用法: node call-auto-router.js "用户消息"
 */

const path = require('path');

// 获取用户消息（从命令行参数）
const userMessage = process.argv.slice(2).join(' ') || process.stdin.read() || '';

if (!userMessage.trim()) {
  console.error('错误: 未提供用户消息');
  console.error('用法: node call-auto-router.js "用户消息"');
  process.exit(1);
}

// 加载auto-router
let autoRouter;
try {
  autoRouter = require(path.join(__dirname, '..', 'skills', 'auto-router.js'));
} catch (e) {
  console.error('加载auto-router失败:', e.message);
  process.exit(1);
}

// 调用路由分析
console.log('=== Auto-Router 分析结果 ===');
console.log('输入消息:', userMessage);
console.log('');

const recommendations = autoRouter.route(userMessage);

if (recommendations.length === 0) {
  console.log('结果: 未识别到特定技能请求');
  console.log('建议: 使用通用处理流程');
} else {
  console.log('识别到', recommendations.length, '个技能匹配:');
  recommendations.forEach((rec, i) => {
    console.log('');
    console.log(`[${i + 1}] ${rec.skill}`);
    console.log(`    原因: ${rec.reason}`);
    console.log(`    方法: ${rec.method}`);
    console.log(`    优先级: ${rec.priority}`);
  });
  
  // 尝试自动执行
  console.log('');
  console.log('--- 自动执行测试 ---');
  const result = autoRouter.autoExecute(userMessage);
  console.log('执行结果:', JSON.stringify(result, null, 2));
}
