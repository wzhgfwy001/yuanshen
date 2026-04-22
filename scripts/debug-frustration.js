const hub = require('../skills/skill-hub/skill-hub.js');

const testMessages = [
  '你好',
  '帮我分析数据',
  '这什么破东西！',
  '太慢了！',
  '请帮我写博客'
];

console.log('=== 情绪检测测试 ===\n');

testMessages.forEach(msg => {
  console.log(`测试消息: "${msg}"`);
  const result = hub.detectFrustration(msg);
  console.log(`结果:`, JSON.stringify(result, null, 2));
  console.log('');
});
