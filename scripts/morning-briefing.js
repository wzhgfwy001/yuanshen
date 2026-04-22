/**
 * 早间简报脚本
 * 
 * 功能：
 * 1. 检查今日任务
 * 2. 检查inbox待处理
 * 3. 检查项目状态
 * 4. 生成简报
 * 
 * 触发：每天早上8点 (Cron: 0 8 * * *)
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = 'C:/Users/DELL/.openclaw/workspace';

// 读取文件
function readFile(filePath) {
  const fullPath = path.join(WORKSPACE, filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf8');
  }
  return null;
}

// 主流程
async function morningBriefing() {
  const today = new Date().toLocaleDateString('zh-CN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  console.log('========================================');
  console.log('🌅 早间简报 - ' + today);
  console.log('========================================\n');
  
  let briefing = `# 🌅 早间简报 - ${today}\n\n`;
  
  try {
    // 1. 检查今日任务
    console.log('📋 待办任务:');
    briefing += '## 📋 待办任务\n\n';
    
    const activePath = 'brain/tasks/active.md';
    const active = readFile(activePath);
    
    if (active) {
      // 提取紧急任务
      const urgentMatch = active.match(/## 🔴 紧急\n([\s\S]*?)(?=##|$)/);
      if (urgentMatch) {
        const tasks = urgentMatch[1].match(/- \[ \]\s*~*~([^~]+)~/g) || [];
        if (tasks.length > 0) {
          tasks.forEach(t => {
            const taskName = t.replace(/^-\s*\[ \]\s*~~/, '').replace(/~~$/, '');
            console.log('  🔴 ' + taskName);
            briefing += `- 🔴 ${taskName}\n`;
          });
        }
      }
      
      // 提取进行中任务
      const progressMatch = active.match(/## 🟡 进行中\n([\s\S]*?)(?=##|$)/);
      if (progressMatch) {
        const tasks = progressMatch[1].match(/- \[ \]\s*~*~([^~]+)~/g) || [];
        if (tasks.length > 0) {
          tasks.forEach(t => {
            const taskName = t.replace(/^-\s*\[ \]\s*~~/, '').replace(/~~$/, '');
            console.log('  🟡 ' + taskName);
            briefing += `- 🟡 ${taskName}\n`;
          });
        }
      }
    }
    
    // 2. 检查 inbox
    console.log('\n📬 待处理事项:');
    briefing += '\n## 📬 待处理事项\n\n';
    
    const inboxPath = 'brain/inbox.md';
    const inbox = readFile(inboxPath);
    
    if (inbox) {
      const pendingMatch = inbox.match(/待处理想法[\s\S]*?(?=\n## |\n_|$)/);
      if (pendingMatch) {
        const items = pendingMatch[0].match(/\d+\.\s*[^\n]+/g) || [];
        items.slice(0, 5).forEach(item => {
          console.log('  • ' + item.replace(/^\d+\.\s*/, ''));
          briefing += `- ${item.replace(/^\d+\.\s*/, '')}\n`;
        });
      }
    }
    
    // 3. 检查商户号状态
    console.log('\n💰 微信支付状态:');
    briefing += '\n## 💰 微信支付状态\n\n';
    
    console.log('  商户号: 1743894878');
    briefing += `- 商户号: 1743894878\n`;
    console.log('  状态: 等待绑定AppID');
    briefing += `- 状态: 等待绑定AppID ⚠️\n`;
    
    // 4. 检查技能状态
    console.log('\n🛠️ 系统状态:');
    briefing += '\n## 🛠️ 系统状态\n\n';
    
    const skillHub = path.join(WORKSPACE, 'skills/skill-hub/skill-hub.js');
    if (fs.existsSync(skillHub)) {
      try {
        const hub = require(skillHub);
        const status = hub.getAllSkillStatus();
        const loaded = Object.values(status).filter(v => v === 'loaded').length;
        console.log(`  技能: ${loaded}/${Object.keys(status).length} 已加载`);
        briefing += `- 技能: ${loaded}/${Object.keys(status).length} 已加载 ✅\n`;
      } catch (e) {
        console.log('  技能中心加载失败');
        briefing += `- 技能中心: 加载失败 ❌\n`;
      }
    }
    
    // 5. 生成今日建议
    console.log('\n💡 今日建议:');
    briefing += '\n## 💡 今日建议\n\n';
    
    // 根据项目状态给出建议
    briefing += '- 优先完成微信支付配置\n';
    briefing += '- 检查高考志愿小程序测试结果\n';
    briefing += '- 关注SkillHub用户反馈\n';
    
    console.log('  • 优先完成微信支付配置');
    console.log('  • 检查高考志愿小程序测试结果');
    console.log('  • 关注SkillHub用户反馈');
    
    briefing += '\n---\n\n';
    
    // 保存到文件
    const briefingPath = path.join(WORKSPACE, `memory/briefing-${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(briefingPath, briefing, 'utf8');
    
    console.log('\n========================================');
    console.log('✅ 早间简报生成完成');
    console.log('========================================');
    console.log('\n📄 已保存到: ' + briefingPath);
    
    return { success: true, briefing };
    
  } catch (error) {
    console.error('❌ 简报生成失败:', error.message);
    return { error: error.message };
  }
}

// 直接运行
if (require.main === module) {
  morningBriefing().then(result => {
    process.exit(result.error ? 1 : 0);
  });
}

module.exports = { morningBriefing };
