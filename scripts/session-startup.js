/**
 * 会话启动脚本
 * 每次新建会话时运行一次，加载所有必要的上下文
 * 
 * 使用方式：在会话开始时运行
 * node scripts/session-startup.js
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = 'C:/Users/DELL/.openclaw/workspace';

const FILES_TO_READ = [
  { name: 'SOUL.md', desc: '身份' },
  { name: 'USER.md', desc: '用户信息' },
  { name: 'brain/plan.md', desc: '人生方向' },
  { name: 'brain/tasks/active.md', desc: '当前任务' },
  { name: 'brain/inbox.md', desc: '待处理' },
  { name: 'brain/me/identity.md', desc: '身份定义' },
  { name: 'brain/me/learned.md', desc: '学到的教训' },
  { name: 'MEMORY.md', desc: '长期记忆' }
];

function getTodayFiles() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return [
    { name: `memory/${today}.md`, desc: '今日记忆' },
    { name: `memory/${yesterday}.md`, desc: '昨日记忆' },
    { name: `brain/tasks/daily/${today}.md`, desc: '今日计划' }
  ];
}

function readFile(filePath) {
  const fullPath = path.join(WORKSPACE, filePath);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    if (stat.size > 0) {
      const content = fs.readFileSync(fullPath, 'utf8');
      return { success: true, content, size: stat.size };
    }
  }
  return { success: false, content: null };
}

console.log('========================================');
console.log('🚀 会话启动 - 加载上下文');
console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
console.log('========================================\n');

// 读取固定文件
console.log('📌 核心文件:');
for (const file of FILES_TO_READ) {
  const result = readFile(file.name);
  if (result.success) {
    console.log(`  ✅ ${file.desc} (${file.name}) - ${result.size} bytes`);
  } else {
    console.log(`  ⚠️  ${file.desc} (${file.name}) - 文件不存在`);
  }
}

// 读取今日文件
console.log('\n📅 今日文件:');
for (const file of getTodayFiles()) {
  const result = readFile(file.name);
  if (result.success) {
    console.log(`  ✅ ${file.desc} (${file.name}) - ${result.size} bytes`);
  } else {
    console.log(`  ⚠️  ${file.desc} (${file.name}) - 不存在`);
  }
}

// 检查技能状态
console.log('\n🛠️ 技能系统:');
const skillHub = path.join(WORKSPACE, 'skills/skill-hub/skill-hub.js');
if (fs.existsSync(skillHub)) {
  try {
    const hub = require(skillHub);
    const status = hub.getAllSkillStatus();
    const loaded = Object.values(status).filter(v => v === 'loaded').length;
    console.log(`  ✅ 技能中心已加载 (${loaded}/${Object.keys(status).length} 技能)`);
  } catch (e) {
    console.log(`  ❌ 技能中心加载失败: ${e.message}`);
  }
} else {
  console.log(`  ⚠️  技能中心不存在`);
}

// 检查商户号状态
console.log('\n💰 微信支付:');
const mchId = '1743894878';
console.log(`  商户号: ${mchId}`);
console.log(`  状态: 等待商户号绑定AppID`);

console.log('\n========================================');
console.log('✅ 上下文加载完成');
console.log('========================================\n');

// 输出今日关键信息
console.log('📊 今日速览:');
const todayFile = `memory/${new Date().toISOString().split('T')[0]}.md`;
const todayResult = readFile(todayFile);
if (todayResult.success) {
  // 提取前200字
  const preview = todayResult.content.substring(0, 200).replace(/\n/g, ' ');
  console.log(`  ${preview}...`);
}

module.exports = { readFile, getTodayFiles };
